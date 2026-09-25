import { ConflictError, ValidationError } from '../../errors';
import { reconcileEntity } from '../../reconciliation';
import type { DomainRepository } from '../../httpApp';
import { classifyMetric, parseDescriptor } from './classify';
import { mapSample, measurementOf } from './mapper';
import type { MetricRegistryStore } from './registryRepository';
import type {
  HealthKitBatch,
  HealthKitSample,
  MetricAction,
  MetricChangeResult,
  MetricDescriptor,
  MetricRegistry,
  MetricState,
  MirrorApplyResult,
  MirrorPreview,
  MirrorSummary,
  RegisteredMetric,
  SampleOutcome,
} from './types';

export interface HealthKitMirrorConfig {
  /** Bridge id used when pushing scope to PEs. */
  bridgeId: string;
  /** PE base URLs whose ingest scope follows the owner's set (§7b). */
  peScopeUrls: string[];
  /** Credential the PEs accept on their HealthKit routes. */
  peToken?: string;
}

/** A repository for one pillar's observation container, created on first use. */
export type PillarRepositoryFactory = (pillar: string) => DomainRepository;

const ACTION_STATE: Record<MetricAction, MetricState> = { add: 'active', lock: 'locked', remove: 'removed' };
const MAX_BATCH = 500;
/** ConflictError names the resource in conflict: the metric registry. */
const REGISTRY_RESOURCE_PATH = 'integrations/healthkit/metric-registry.ttl';

/**
 * The HealthKit → PIM → POD mirror (localHealthkitBridge docs/MIRROR_CONTRACT.md).
 *
 * PIM is the only writer to the POD. Metrics are declared at runtime and mirror
 * only once the owner has made them `active`; a record already in the POD is
 * never overwritten from the device (G4: the POD is authoritative).
 */
export class HealthKitMirrorService {
  private readonly pillarRepositories = new Map<string, DomainRepository>();

  constructor(
    private readonly registryStore: MetricRegistryStore,
    private readonly repositories: Record<string, DomainRepository>,
    private readonly pillarRepositoryFactory: PillarRepositoryFactory,
    private readonly config: HealthKitMirrorConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  registry(): Promise<MetricRegistry> {
    return this.registryStore.get();
  }

  /**
   * The bridge declares metrics as HealthKit authorizes them. A new metric is
   * `proposed`: declaring grants nothing, so no owner approval is needed and the
   * generation does not move. A re-declaration refreshes the descriptor and
   * keeps the owner's state.
   */
  async declare(rawDescriptors: unknown): Promise<MetricChangeResult> {
    if (!Array.isArray(rawDescriptors) || rawDescriptors.length === 0) {
      throw new ValidationError('declare needs a non-empty descriptors array.', [{ field: 'descriptors', reason: 'required' }]);
    }
    const descriptors = rawDescriptors.map(parseDescriptor);
    const registry = await this.registryStore.get();
    const applied = this.declareInto(registry, descriptors);
    if (applied.length) await this.registryStore.save({ ...registry, updatedAt: nowIso() });
    return { action: 'declare', generation: registry.generation, applied, scopePush: [] };
  }

  /** Owner add / lock / remove. The caller has verified owner approval. */
  async change(action: unknown, rawMetrics: unknown): Promise<MetricChangeResult> {
    if (action !== 'add' && action !== 'lock' && action !== 'remove') {
      throw new ValidationError('action must be declare, add, lock or remove.', [{ field: 'action', reason: 'invalid' }]);
    }
    if (!Array.isArray(rawMetrics) || rawMetrics.length === 0 || !rawMetrics.every((m) => typeof m === 'string')) {
      throw new ValidationError(`${action} needs a non-empty metrics array of HealthKit identifiers.`, [{ field: 'metrics', reason: 'required' }]);
    }
    const registry = await this.registryStore.get();
    const unknown = (rawMetrics as string[]).filter((m) => !registry.metrics[m]);
    if (unknown.length) {
      throw new ValidationError('Only declared metrics can be approved; the bridge declares a metric first.', [
        { field: 'metrics', reason: `undeclared: ${unknown.join(', ')}` },
      ]);
    }
    const state = ACTION_STATE[action];
    const at = nowIso();
    const applied = (rawMetrics as string[]).map((metric) => {
      const previous = registry.metrics[metric].state;
      registry.metrics[metric] = { ...registry.metrics[metric], state, changedAt: at };
      return { metric, state, previous };
    });
    registry.generation += 1;
    registry.updatedAt = at;
    await this.registryStore.save(registry);
    const scopePush = await this.pushScope(action, rawMetrics as string[]);
    return { action, generation: registry.generation, applied, scopePush };
  }

  /** What applying the batch would do. Writes nothing to the POD. */
  async preview(body: unknown): Promise<MirrorPreview> {
    const batch = parseBatch(body);
    const registry = await this.registryStore.get();
    const declared = batch.descriptors?.length ? this.declareInto(registry, batch.descriptors.map(parseDescriptor)).map((d) => d.metric) : [];
    if (declared.length) await this.registryStore.save({ ...registry, updatedAt: nowIso() });
    if (batch.generation !== undefined && batch.generation !== registry.generation) {
      throw new ConflictError(
        REGISTRY_RESOURCE_PATH,
        `The approved metric set changed (generation ${registry.generation}; the batch was built against ${batch.generation}). Re-read /api/integrations/healthkit/metrics.`,
      );
    }
    const planned = await this.plan(batch.samples, registry);
    const samples = planned.map((p) => p.outcome);
    return { generation: registry.generation, declared, samples, summary: summarize(samples) };
  }

  /**
   * Write the batch: create what is new, skip what is unchanged, never overwrite
   * a differing POD record. The caller has verified owner approval (D2a).
   */
  async apply(body: unknown): Promise<MirrorApplyResult> {
    const batch = parseBatch(body);
    const registry = await this.registryStore.get();
    if (batch.generation !== undefined && batch.generation !== registry.generation) {
      throw new ConflictError(
        REGISTRY_RESOURCE_PATH,
        `The approved metric set changed (generation ${registry.generation}; the batch was built against ${batch.generation}). Preview again.`,
      );
    }
    const planned = await this.plan(batch.samples, registry);
    let applied = 0;
    for (const item of planned) {
      if (item.outcome.action !== 'create' || !item.write) continue;
      const created = (await item.write.repository.create(item.write.entity as never)) as { url?: string };
      item.outcome.url = created.url;
      item.outcome.mirrorState = 'mirrored';
      applied += 1;
    }
    const samples = planned.map((p) => p.outcome);
    return { generation: registry.generation, declared: [], samples, summary: summarize(samples), applied };
  }

  /** Records mirrored from HealthKit, per pillar: counts only (PHI-safe). */
  async mirroredCounts(): Promise<Record<string, number>> {
    const registry = await this.registryStore.get();
    const pillars = new Set(Object.values(registry.metrics).map((m) => m.target.pillar));
    const counts: Record<string, number> = {};
    for (const pillar of pillars) {
      const records = (await this.repositoryFor(pillar).findAll().catch(() => [])) as Array<Record<string, unknown>>;
      counts[pillar] = records.filter(isFromHealthKit).length;
    }
    return counts;
  }

  // ─── internals ────────────────────────────────────────────────────────────

  private declareInto(registry: MetricRegistry, descriptors: MetricDescriptor[]): MetricChangeResult['applied'] {
    const at = nowIso();
    return descriptors.map((descriptor) => {
      const target = classifyMetric(descriptor);
      const existing = registry.metrics[descriptor.metric];
      registry.metrics[descriptor.metric] = existing
        ? { ...existing, ...descriptor, target }
        : { ...descriptor, target, state: 'proposed', declaredAt: at, changedAt: at };
      return { metric: descriptor.metric, state: registry.metrics[descriptor.metric].state, previous: existing?.state ?? null };
    });
  }

  private async plan(samples: HealthKitSample[], registry: MetricRegistry): Promise<Array<{
    outcome: SampleOutcome;
    write?: { repository: DomainRepository; entity: Record<string, unknown> };
  }>> {
    const existingByDomain = new Map<string, Array<Record<string, unknown>>>();
    const existingFor = async (domain: string): Promise<Array<Record<string, unknown>>> => {
      if (!existingByDomain.has(domain)) {
        // A copy: in-batch creates are appended below so later samples see them,
        // and that must never touch what the repository returned.
        existingByDomain.set(domain, [...((await this.repositoryFor(domain).findAll()) as Array<Record<string, unknown>>)]);
      }
      return existingByDomain.get(domain) as Array<Record<string, unknown>>;
    };

    const results = [];
    for (const sample of samples) {
      const metric = registry.metrics[sample.metric];
      const excluded = (reason: SampleOutcome['reason'], pillar?: string) => ({
        outcome: { sampleUuid: sample.uuid, metric: sample.metric, pillar, action: 'excluded' as const, reason },
      });
      if (!metric) { results.push(excluded('undeclared')); continue; }
      const pillar = metric.target.pillar;
      if (metric.state !== 'active') {
        results.push(excluded(stateReason(metric), pillar));
        continue;
      }
      const mapped = mapSample(sample, metric);
      if (!mapped.ok) { results.push(excluded(mapped.reason, pillar)); continue; }

      const existing = await existingFor(mapped.domain);
      const verdict = metric.target.kind === 'fhir'
        ? reconcileEntity(mapped.domain, mapped.entity, existing, 'HealthKit')
        : reconcileEntity(mapped.domain, mapped.measurement, existing.map((r) => measurementOf(mapped.domain, r)), 'HealthKit');

      if (verdict.action === 'create') {
        results.push({
          outcome: { sampleUuid: sample.uuid, metric: sample.metric, pillar: mapped.pillar, action: 'create' as const, mirrorState: 'pendingMirror' as const },
          write: { repository: this.repositoryFor(mapped.domain), entity: mapped.entity },
        });
        // A later sample in this batch with the same key must see this one.
        existing.push({ ...(metric.target.kind === 'fhir' ? mapped.entity : mapped.measurement) });
      } else if (verdict.action === 'unchanged') {
        results.push({ outcome: { sampleUuid: sample.uuid, metric: sample.metric, pillar: mapped.pillar, action: 'unchanged' as const, url: verdict.targetUrl, mirrorState: 'mirrored' as const } });
      } else {
        // `update` and `conflict` alike: the POD is authoritative, so the device
        // never overwrites it. The owner resolves it in PIM (§3).
        results.push({
          outcome: {
            sampleUuid: sample.uuid,
            metric: sample.metric,
            pillar: mapped.pillar,
            action: 'conflict' as const,
            reason: verdict.action === 'update' ? 'pod-differs' as const : 'ambiguous' as const,
            mirrorState: 'conflict' as const,
          },
        });
      }
    }
    return results;
  }

  private repositoryFor(domain: string): DomainRepository {
    const known = this.repositories[domain];
    if (known) return known;
    let repository = this.pillarRepositories.get(domain);
    if (!repository) {
      repository = this.pillarRepositoryFactory(domain);
      this.pillarRepositories.set(domain, repository);
    }
    return repository;
  }

  private async pushScope(action: MetricAction, metrics: string[]): Promise<MetricChangeResult['scopePush']> {
    const results: MetricChangeResult['scopePush'] = [];
    for (const pe of this.config.peScopeUrls) {
      try {
        const response = await this.fetchImpl(`${pe.replace(/\/+$/, '')}/api/integrations/healthkit/scope`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(this.config.peToken ? { authorization: `Bearer ${this.config.peToken}` } : {}),
          },
          body: JSON.stringify({ bridgeId: this.config.bridgeId, action, types: metrics, source: 'pim', reason: 'owner changed the approved metric set' }),
        });
        results.push({ pe, ok: response.ok, status: response.status });
      } catch (error) {
        results.push({ pe, ok: false, error: error instanceof Error ? error.message : 'unreachable' });
      }
    }
    return results;
  }
}

function parseBatch(body: unknown): HealthKitBatch {
  if (!body || typeof body !== 'object') throw new ValidationError('The batch must be a JSON object.', []);
  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.samples)) throw new ValidationError('samples must be an array.', [{ field: 'samples', reason: 'required' }]);
  if (raw.samples.length > MAX_BATCH) {
    throw new ValidationError(`A batch holds at most ${MAX_BATCH} samples.`, [{ field: 'samples', reason: `split into batches of ${MAX_BATCH}` }]);
  }
  const samples = raw.samples.map((s, index) => {
    const sample = (s ?? {}) as Record<string, unknown>;
    if (typeof sample.uuid !== 'string' || !sample.uuid || typeof sample.metric !== 'string' || typeof sample.startDate !== 'string') {
      throw new ValidationError(`samples[${index}] needs uuid, metric and startDate.`, [{ field: `samples[${index}]`, reason: 'uuid, metric, startDate required' }]);
    }
    return sample as unknown as HealthKitSample;
  });
  if (raw.generation !== undefined && !Number.isInteger(raw.generation)) {
    throw new ValidationError('generation must be an integer.', [{ field: 'generation', reason: 'integer' }]);
  }
  if (raw.descriptors !== undefined && !Array.isArray(raw.descriptors)) {
    throw new ValidationError('descriptors must be an array.', [{ field: 'descriptors', reason: 'array' }]);
  }
  return {
    bridgeId: typeof raw.bridgeId === 'string' ? raw.bridgeId : undefined,
    generation: raw.generation as number | undefined,
    descriptors: raw.descriptors as MetricDescriptor[] | undefined,
    samples,
  };
}

function stateReason(metric: RegisteredMetric): SampleOutcome['reason'] {
  if (metric.state === 'proposed') return 'pending-approval';
  if (metric.state === 'locked') return 'locked';
  return 'not-in-scope';
}

function summarize(samples: SampleOutcome[]): MirrorSummary {
  const summary: MirrorSummary = { total: samples.length, create: 0, unchanged: 0, conflict: 0, excluded: 0, byPillar: {} };
  for (const s of samples) {
    summary[s.action] += 1;
    const key = s.pillar ?? '(undeclared)';
    const bucket = summary.byPillar[key] ?? { create: 0, unchanged: 0, conflict: 0, excluded: 0 };
    bucket[s.action] += 1;
    summary.byPillar[key] = bucket;
  }
  return summary;
}

function isFromHealthKit(record: Record<string, unknown>): boolean {
  const source = record.source as { system?: unknown } | undefined;
  if (source?.system === 'healthkit') return true;
  return typeof record.notes === 'string' && record.notes.startsWith('Imported from Apple HealthKit');
}

function nowIso(): string {
  return new Date().toISOString();
}
