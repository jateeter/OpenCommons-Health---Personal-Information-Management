import { randomUUID } from 'node:crypto';
import type { EpicRuntimeConfig } from '../../runtimeConfig';
import type { DomainRepository } from '../../httpApp';
import { ValidationError } from '../../errors';
import { nowIso } from '../../utils/rdfUtils';
import { decryptJson, encryptJson } from './crypto';
import { mapEpicResourcesToPim } from './mapper';
import { mockAnnualWellnessResources } from './mockFhir';
import { EpicSmartClient, grantNeedsRefresh } from './smartClient';
import type {
  EpicApplyResult,
  EpicAuditEvent,
  EpicConnectionPublicStatus,
  EpicConnectionRecord,
  EpicDiagnosticCheck,
  EpicDiagnostics,
  EpicGrant,
  EpicImportCandidate,
  EpicImportPreview,
  EpicMvpDomain,
} from './types';
import { EpicConnectionPodRepository } from './podRepository';

type FetchLike = typeof fetch;

export class EpicIntegrationService {
  private readonly smartClient: EpicSmartClient;

  constructor(
    private readonly config: EpicRuntimeConfig,
    private readonly connectionRepository: EpicConnectionPodRepository | undefined,
    private readonly repositories: Record<string, DomainRepository>,
    httpFetch: FetchLike = fetch,
  ) {
    this.smartClient = new EpicSmartClient(config, httpFetch);
  }

  async initializeFromPod(): Promise<void> {
    if (!this.config.enabled || !this.connectionRepository) return;
    const existing = await this.connectionRepository.get();
    if (!existing) return;
    const updated = this.withAudit({
      ...existing,
      lastStartupAt: nowIso(),
    }, 'startup', 'ok', 'Epic connection state loaded from owner Solid pod.');
    await this.connectionRepository.save(updated);
    if (this.config.syncOnStartup && updated.status === 'connected') {
      await this.apply({});
    }
  }

  async status(): Promise<EpicConnectionPublicStatus> {
    if (!this.config.enabled || !this.connectionRepository) {
      return {
        enabled: false,
        mode: this.config.mode,
        status: 'disabled',
        requestedScopes: this.config.scopes,
        grantedScopes: [],
      };
    }
    const record = await this.connectionRepository.get();
    if (!record) {
      return {
        enabled: true,
        mode: this.config.mode,
        status: 'not-connected',
        fhirBaseUrl: this.config.fhirBaseUrl,
        requestedScopes: this.config.scopes,
        grantedScopes: [],
      };
    }
    return this.publicStatus(record);
  }

  async diagnostics(options: { live?: boolean } = {}): Promise<EpicDiagnostics> {
    const checks: EpicDiagnosticCheck[] = [];
    const checkedAt = nowIso();
    const live = options.live === true;
    const add = (name: string, status: EpicDiagnosticCheck['status'], detail: string): void => {
      checks.push({ name, status, detail });
    };

    if (!this.config.enabled) {
      add('epic-enabled', 'skipped', 'Epic integration is disabled; localhost MVP can run Solid-only.');
      return {
        enabled: false,
        mode: this.config.mode,
        readiness: 'disabled',
        checkedAt,
        live,
        localhostMvp: true,
        checks,
      };
    }

    add('epic-enabled', 'ok', 'Epic integration is enabled for this localhost deployment.');
    add('mode', 'ok', `Epic mode is ${this.config.mode}.`);
    add('grant-encryption-key', this.config.encryptionKey ? 'ok' : 'failed', this.config.encryptionKey
      ? 'Grant encryption key is configured; value is not reported.'
      : 'EPIC_GRANT_ENCRYPTION_KEY is required when Epic is enabled.');
    add('scopes', this.config.scopes.length > 0 ? 'ok' : 'failed', this.config.scopes.length > 0
      ? `${this.config.scopes.length} SMART/FHIR scopes are configured.`
      : 'At least one SMART/FHIR scope is required.');

    if (this.config.mode === 'mock') {
      add('fhir-base-url', 'skipped', 'Mock mode uses deterministic synthetic FHIR resources and does not require EPIC_FHIR_BASE_URL.');
      add('client-id', 'skipped', 'Mock mode does not require EPIC_CLIENT_ID.');
      add('redirect-uri', 'ok', this.config.redirectUri
        ? 'Mock mode redirect URI is configured.'
        : 'Mock mode will use the local Epic callback path.');
      add('smart-discovery', 'skipped', 'SMART discovery is skipped in mock mode.');
      return this.diagnosticsResult(checks, checkedAt, live);
    }

    add('fhir-base-url', this.config.fhirBaseUrl ? 'ok' : 'failed', this.config.fhirBaseUrl
      ? 'Epic FHIR base URL is configured.'
      : 'EPIC_FHIR_BASE_URL is required for sandbox/production mode.');
    add('client-id', this.config.clientId ? 'ok' : 'failed', this.config.clientId
      ? 'Epic SMART client id is configured.'
      : 'EPIC_CLIENT_ID is required for sandbox/production mode.');
    add('redirect-uri', this.config.redirectUri ? 'ok' : 'failed', this.config.redirectUri
      ? 'Epic SMART redirect URI is configured.'
      : 'EPIC_REDIRECT_URI is required for sandbox/production mode.');

    if (!live) {
      add('smart-discovery', 'skipped', 'Live SMART discovery was not requested; use ?live=true for a network diagnostic.');
      return this.diagnosticsResult(checks, checkedAt, live);
    }

    try {
      const discovery = await this.smartClient.discover();
      add('smart-discovery', 'ok', 'SMART configuration was discovered from the Epic FHIR base URL.');
      add('authorization-endpoint', discovery.authorization_endpoint ? 'ok' : 'failed', discovery.authorization_endpoint
        ? 'SMART authorization endpoint is present.'
        : 'SMART discovery did not report authorization_endpoint.');
      add('token-endpoint', discovery.token_endpoint ? 'ok' : 'failed', discovery.token_endpoint
        ? 'SMART token endpoint is present.'
        : 'SMART discovery did not report token_endpoint.');
      if (Array.isArray(discovery.scopes_supported) && discovery.scopes_supported.length > 0) {
        const missing = this.config.scopes.filter((scope) => !discovery.scopes_supported?.includes(scope));
        add('scope-support', missing.length === 0 ? 'ok' : 'warning', missing.length === 0
          ? 'Configured scopes are listed by SMART discovery.'
          : `SMART discovery did not list ${missing.length} configured scope(s): ${missing.join(', ')}`);
      } else {
        add('scope-support', 'warning', 'SMART discovery did not publish scopes_supported; configured scopes could not be compared.');
      }
    } catch (error) {
      add('smart-discovery', 'failed', error instanceof Error ? error.message : 'SMART discovery failed.');
    }

    return this.diagnosticsResult(checks, checkedAt, live);
  }

  async connectStart(): Promise<Record<string, unknown>> {
    this.requireEnabled();
    const state = randomUUID();
    const now = nowIso();
    const fhirBaseUrl = this.config.fhirBaseUrl ?? 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
    const smartStart = this.config.mode === 'mock'
      ? undefined
      : await this.smartClient.startAuthorization(state);
    const record = this.withAudit({
      status: 'authorization-started',
      mode: this.config.mode,
      fhirBaseUrl,
      issuer: fhirBaseUrl,
      requestedScopes: this.config.scopes,
      grantedScopes: [],
      lastAuthorizationState: state,
      encryptedPkceCodeVerifier: smartStart?.codeVerifier
        ? encryptJson({ codeVerifier: smartStart.codeVerifier }, this.config.encryptionKey as string)
        : undefined,
      authorizationEndpoint: smartStart?.configuration.authorization_endpoint,
      tokenEndpoint: smartStart?.configuration.token_endpoint,
      audit: [],
    }, 'connect-start', 'ok', this.config.mode === 'mock'
      ? 'Started Epic mock authorization flow.'
      : 'Started Epic SMART authorization flow with discovery and PKCE.');
    await this.connectionRepository?.save(record);

    const callback = this.config.redirectUri ?? '/api/integrations/epic/connect/callback';
    const authorizationUrl = this.config.mode === 'mock'
      ? `${callback}?code=mock-authorization-code&state=${encodeURIComponent(state)}`
      : smartStart?.authorizationUrl;

    return {
      mode: this.config.mode,
      authorizationUrl,
      state,
      scopes: this.config.scopes,
      pkce: this.config.mode === 'mock' ? undefined : 'S256',
      startedAt: now,
    };
  }

  async connectCallback(query: URLSearchParams): Promise<EpicConnectionPublicStatus> {
    this.requireEnabled();
    const code = query.get('code')?.trim();
    const state = query.get('state')?.trim();
    if (!code) throw new ValidationError('Epic authorization callback requires a code.', [{ field: 'code', reason: 'code is required' }]);
    const existing = await this.connectionRepository?.get();
    if (existing?.lastAuthorizationState && existing.lastAuthorizationState !== state) {
      throw new ValidationError('Epic authorization state did not match the pod-owned connection request.', [{ field: 'state', reason: 'state mismatch' }]);
    }
    const connectedAt = nowIso();
    const grant = this.config.mode === 'mock'
      ? this.mockGrant()
      : await this.exchangeLiveGrant(code, existing);
    const patientId = grant.patient ?? (this.config.mode === 'mock' ? 'epic-patient-mock-001' : undefined);
    if (!patientId) {
      throw new ValidationError('Epic SMART token response did not include patient context.', [
        { field: 'patient', reason: 'launch/patient context is required for personal data import' },
      ]);
    }
    const record = this.withAudit({
      status: 'connected',
      mode: this.config.mode,
      fhirBaseUrl: this.config.fhirBaseUrl ?? existing?.fhirBaseUrl ?? 'mock://epic-fhir',
      issuer: this.config.fhirBaseUrl ?? existing?.issuer ?? 'mock://epic-fhir',
      patientId,
      requestedScopes: this.config.scopes,
      grantedScopes: grant.scope?.split(/\s+/).filter(Boolean) ?? this.config.scopes,
      lastAuthorizationState: state,
      authorizationEndpoint: existing?.authorizationEndpoint,
      tokenEndpoint: existing?.tokenEndpoint,
      connectedAt,
      encryptedGrant: encryptJson(grant, this.config.encryptionKey as string),
      audit: existing?.audit ?? [],
    }, 'connect-callback', 'ok', this.config.mode === 'mock'
      ? 'Epic mock authorization completed and encrypted grant stored in the owner pod.'
      : 'Epic SMART token exchange completed and encrypted grant stored in the owner pod.');
    await this.connectionRepository?.save(record);
    return this.publicStatus(record);
  }

  async disconnect(): Promise<EpicConnectionPublicStatus> {
    this.requireEnabled();
    const existing = await this.connectionRepository?.get();
    const record = this.withAudit({
      status: 'disconnected',
      mode: this.config.mode,
      fhirBaseUrl: existing?.fhirBaseUrl ?? this.config.fhirBaseUrl,
      patientId: existing?.patientId,
      requestedScopes: existing?.requestedScopes ?? this.config.scopes,
      grantedScopes: [],
      disconnectedAt: nowIso(),
      audit: existing?.audit ?? [],
    }, 'disconnect', 'ok', 'Epic grant removed from active connection state.');
    await this.connectionRepository?.save(record);
    return this.publicStatus(record);
  }

  async preview(_body: Record<string, unknown> = {}): Promise<EpicImportPreview> {
    const record = await this.connectedRecord();
    const active = await this.ensureFreshGrant(record);
    const generatedAt = nowIso();
    const importJobId = `epic-import-${Date.now()}`;
    const resources = this.config.mode === 'mock'
      ? mockAnnualWellnessResources()
      : await this.smartClient.fetchPatientResources(active.grant, record.patientId as string);
    const mapped = mapEpicResourcesToPim(resources, {
      fhirBaseUrl: record.fhirBaseUrl ?? 'mock://epic-fhir',
      patientId: record.patientId as string,
      authorizationGrantId: record.connectedAt,
      importedAt: generatedAt,
    });
    return {
      importJobId,
      source: this.config.mode === 'mock' ? 'mock' : 'epic',
      generatedAt,
      patientId: record.patientId as string,
      changes: await this.reconcile(mapped),
    };
  }

  async apply(body: Record<string, unknown> = {}): Promise<EpicApplyResult> {
    const preview = await this.preview(body);
    const selectedDomains = selectedDomainSet(body);
    const created = Object.fromEntries(
      ['profiles', 'conditions', 'medications', 'allergies', 'immunizations', 'vital-signs', 'providers', 'lab-results', 'insurance-policies']
        .map((domain) => [domain, 0]),
    ) as Record<EpicMvpDomain, number>;
    const resources: EpicApplyResult['resources'] = [];
    for (const change of preview.changes) {
      if (selectedDomains && !selectedDomains.has(change.domain)) continue;
      const repository = this.repositories[change.domain];
      if (!repository) continue;
      if (change.action === 'unchanged' || change.action === 'conflict') continue;
      const saved = change.action === 'update' && change.targetUrl
        ? await repository.update({ ...(change.entity as unknown as Record<string, unknown>), url: change.targetUrl } as never) as { url?: string }
        : await repository.create(change.entity as never) as { url?: string };
      created[change.domain] += 1;
      resources.push({
        domain: change.domain,
        url: saved.url,
        display: change.display,
        provenance: change.provenance,
      });
    }
    const existing = await this.connectedRecord();
    await this.connectionRepository?.save(this.withAudit({
      ...existing,
      lastSyncAt: nowIso(),
      lastImportJobId: preview.importJobId,
    }, 'sync-apply', 'ok', `Applied ${resources.length} Epic import candidates to the owner pod.`));

    return {
      importJobId: preview.importJobId,
      appliedAt: nowIso(),
      created,
      resources,
    };
  }

  private async reconcile(changes: EpicImportCandidate[]): Promise<EpicImportCandidate[]> {
    const byDomain = new Map<EpicMvpDomain, EpicImportCandidate[]>();
    for (const change of changes) {
      byDomain.set(change.domain, [...(byDomain.get(change.domain) ?? []), change]);
    }

    const reconciled: EpicImportCandidate[] = [];
    for (const [domain, domainChanges] of byDomain) {
      const repository = this.repositories[domain];
      const existing = repository ? await repository.findAll() as Array<Record<string, unknown>> : [];
      for (const change of domainChanges) {
        const key = reconciliationKey(change.domain, change.entity as unknown as Record<string, unknown>);
        const matches = key
          ? existing.filter((record) => reconciliationKey(change.domain, record) === key)
          : [];
        if (matches.length === 0) {
          reconciled.push({
            ...change,
            action: 'create',
            reconciliation: { status: 'new', detail: 'No matching local pod record was found.' },
          });
          continue;
        }
        if (matches.length > 1) {
          reconciled.push({
            ...change,
            action: 'conflict',
            reconciliation: { status: 'ambiguous', detail: `${matches.length} local pod records match this Epic candidate; review manually before applying.` },
          });
          continue;
        }
        const [match] = matches;
        const targetUrl = typeof match.url === 'string' ? match.url : undefined;
        const incomingSignature = comparableSignature(change.entity as unknown as Record<string, unknown>);
        const existingSignature = comparableSignature(match);
        if (incomingSignature === existingSignature) {
          reconciled.push({
            ...change,
            action: 'unchanged',
            targetUrl,
            reconciliation: { status: 'matched', detail: 'A matching local pod record already has the same normalized values.' },
          });
        } else {
          reconciled.push({
            ...change,
            action: targetUrl ? 'update' : 'conflict',
            targetUrl,
            reconciliation: targetUrl
              ? { status: 'changed', detail: 'A matching local pod record exists with different normalized values and can be updated.' }
              : { status: 'ambiguous', detail: 'A matching local pod record exists but has no URL for safe update.' },
          });
        }
      }
    }
    return reconciled;
  }

  async audit(): Promise<EpicAuditEvent[]> {
    const record = await this.connectionRepository?.get();
    return record?.audit ?? [];
  }

  private async connectedRecord(): Promise<EpicConnectionRecord> {
    this.requireEnabled();
    const record = await this.connectionRepository?.get();
    if (!record || record.status !== 'connected' || !record.patientId) {
      throw new ValidationError('Epic is not connected for this pod owner.', [{ field: 'epic.status', reason: 'connect Epic before importing' }]);
    }
    return record;
  }

  private async exchangeLiveGrant(code: string, existing: EpicConnectionRecord | null | undefined): Promise<EpicGrant> {
    if (!existing?.encryptedPkceCodeVerifier) {
      throw new ValidationError('Epic authorization state is missing its PKCE verifier.', [
        { field: 'encryptedPkceCodeVerifier', reason: 'start Epic authorization before callback' },
      ]);
    }
    const pending = decryptJson<{ codeVerifier: string }>(
      existing.encryptedPkceCodeVerifier,
      this.config.encryptionKey as string,
    );
    return this.smartClient.exchangeCode(code, pending.codeVerifier);
  }

  private async ensureFreshGrant(record: EpicConnectionRecord): Promise<{ record: EpicConnectionRecord; grant: EpicGrant }> {
    if (!record.encryptedGrant) {
      throw new ValidationError('Epic grant material is missing; reconnect is required.', [
        { field: 'encryptedGrant', reason: 'missing encrypted grant' },
      ]);
    }
    let grant = decryptJson<EpicGrant>(record.encryptedGrant, this.config.encryptionKey as string);
    if (this.config.mode !== 'mock' && grantNeedsRefresh(grant)) {
      grant = await this.smartClient.refreshGrant(grant);
      const refreshed = this.withAudit({
        ...record,
        encryptedGrant: encryptJson(grant, this.config.encryptionKey as string),
        grantedScopes: grant.scope?.split(/\s+/).filter(Boolean) ?? record.grantedScopes,
        patientId: grant.patient ?? record.patientId,
      }, 'token-refresh', 'ok', 'Epic access token refreshed using encrypted pod-owned grant state.');
      await this.connectionRepository?.save(refreshed);
      return { record: refreshed, grant };
    }
    return { record, grant };
  }

  private mockGrant(): EpicGrant {
    return {
      accessToken: `${this.config.mode}-access-token`,
      refreshToken: `${this.config.mode}-refresh-token`,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      scope: this.config.scopes.join(' '),
      patient: 'epic-patient-mock-001',
      issuedAt: nowIso(),
    };
  }

  private requireEnabled(): void {
    if (!this.config.enabled || !this.connectionRepository) {
      throw new ValidationError('Epic integration is disabled for this deployment.', [{ field: 'EPIC_ENABLED', reason: 'set EPIC_ENABLED=true to use Epic integration APIs' }]);
    }
  }

  private publicStatus(record: EpicConnectionRecord): EpicConnectionPublicStatus {
    return {
      enabled: true,
      mode: record.mode,
      status: record.status,
      fhirBaseUrl: record.fhirBaseUrl,
      patientId: record.patientId,
      requestedScopes: record.requestedScopes,
      grantedScopes: record.grantedScopes,
      connectedAt: record.connectedAt,
      disconnectedAt: record.disconnectedAt,
      lastStartupAt: record.lastStartupAt,
      lastSyncAt: record.lastSyncAt,
      lastImportJobId: record.lastImportJobId,
      lastError: record.lastError,
    };
  }

  private diagnosticsResult(checks: EpicDiagnosticCheck[], checkedAt: string, live: boolean): EpicDiagnostics {
    const hasFailure = checks.some((check) => check.status === 'failed');
    const hasWarning = checks.some((check) => check.status === 'warning');
    return {
      enabled: this.config.enabled,
      mode: this.config.mode,
      readiness: hasFailure ? 'failed' : hasWarning ? 'attention' : 'ready',
      checkedAt,
      live,
      localhostMvp: true,
      checks,
    };
  }

  private withAudit(
    record: EpicConnectionRecord,
    action: string,
    status: EpicAuditEvent['status'],
    detail?: string,
  ): EpicConnectionRecord {
    return {
      ...record,
      audit: [
        ...(record.audit ?? []),
        { at: nowIso(), action, status, detail },
      ].slice(-100),
    };
  }
}

function selectedDomainSet(body: Record<string, unknown>): Set<EpicMvpDomain> | undefined {
  const domains = body.domains;
  if (!Array.isArray(domains) || domains.length === 0) return undefined;
  return new Set(domains.filter((domain): domain is EpicMvpDomain => typeof domain === 'string') as EpicMvpDomain[]);
}

function reconciliationKey(domain: EpicMvpDomain, entity: Record<string, unknown>): string | undefined {
  switch (domain) {
    case 'profiles':
      return [
        nestedString(entity, 'name.family'),
        Array.isArray(nestedValue(entity, 'name.given')) ? (nestedValue(entity, 'name.given') as string[]).join('|') : '',
        stringField(entity, 'birthDate'),
      ].filter(Boolean).join('::') || undefined;
    case 'conditions':
      return codingKey(nestedValue(entity, 'code'));
    case 'medications':
      return codingKey(nestedValue(entity, 'medicationCode'));
    case 'allergies':
      return codingKey(nestedValue(entity, 'substance'));
    case 'immunizations':
      return [codingKey(nestedValue(entity, 'vaccineCode')), stringField(entity, 'occurrenceDate')].filter(Boolean).join('::') || undefined;
    case 'vital-signs':
      return [stringField(entity, 'code'), stringField(entity, 'effectiveDateTime')].filter(Boolean).join('::') || undefined;
    case 'providers':
      return stringField(entity, 'npi') || stringField(entity, 'name');
    case 'lab-results':
      return [codingKey(nestedValue(entity, 'code')), stringField(entity, 'effectiveDateTime')].filter(Boolean).join('::') || undefined;
    case 'insurance-policies':
      return stringField(entity, 'memberId') || [stringField(entity, 'insurerName'), stringField(entity, 'effectiveDate')].filter(Boolean).join('::') || undefined;
  }
}

function codingKey(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const coding = value as Record<string, unknown>;
  const system = typeof coding.system === 'string' ? coding.system : '';
  const code = typeof coding.code === 'string' ? coding.code : '';
  return system || code ? `${system}::${code}` : undefined;
}

function comparableSignature(entity: Record<string, unknown>): string {
  const copy = JSON.parse(JSON.stringify(entity)) as Record<string, unknown>;
  for (const field of ['url', 'createdAt', 'updatedAt', 'notes']) delete copy[field];
  return stableStringify(copy);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function nestedString(entity: Record<string, unknown>, path: string): string | undefined {
  const value = nestedValue(entity, path);
  return typeof value === 'string' ? value : undefined;
}

function stringField(entity: Record<string, unknown>, field: string): string | undefined {
  const value = entity[field];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function nestedValue(entity: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, entity);
}
