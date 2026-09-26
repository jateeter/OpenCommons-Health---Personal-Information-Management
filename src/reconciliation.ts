export type ReconciliationAction = 'create' | 'update' | 'unchanged' | 'conflict';
export type ReconciliationStatus = 'new' | 'matched' | 'changed' | 'ambiguous';

export interface ReconciliationCandidate {
  domain: string;
  action: ReconciliationAction;
  display: string;
  targetUrl?: string;
  reconciliation?: {
    status: ReconciliationStatus;
    detail: string;
  };
}

export interface ReconciliationDomainSummary {
  domain: string;
  total: number;
  create: number;
  update: number;
  unchanged: number;
  conflict: number;
  reviewRequired: boolean;
}

export interface ReconciliationSummary {
  total: number;
  safeToApply: number;
  blocked: number;
  unchanged: number;
  reviewRequired: boolean;
  byAction: Record<ReconciliationAction, number>;
  byStatus: Partial<Record<ReconciliationStatus, number>>;
  byDomain: ReconciliationDomainSummary[];
  advisories: string[];
}

export function summarizeReconciliation(candidates: ReconciliationCandidate[]): ReconciliationSummary {
  const byAction: Record<ReconciliationAction, number> = { create: 0, update: 0, unchanged: 0, conflict: 0 };
  const byStatus: Partial<Record<ReconciliationStatus, number>> = {};
  const domainMap = new Map<string, ReconciliationDomainSummary>();

  for (const candidate of candidates) {
    byAction[candidate.action] += 1;
    if (candidate.reconciliation?.status) {
      byStatus[candidate.reconciliation.status] = (byStatus[candidate.reconciliation.status] ?? 0) + 1;
    }
    const domain = domainMap.get(candidate.domain) ?? {
      domain: candidate.domain,
      total: 0,
      create: 0,
      update: 0,
      unchanged: 0,
      conflict: 0,
      reviewRequired: false,
    };
    domain.total += 1;
    domain[candidate.action] += 1;
    domain.reviewRequired = domain.reviewRequired || candidate.action === 'update' || candidate.action === 'conflict';
    domainMap.set(candidate.domain, domain);
  }

  const byDomain = [...domainMap.values()].sort((left, right) => left.domain.localeCompare(right.domain));
  const summary: ReconciliationSummary = {
    total: candidates.length,
    safeToApply: byAction.create + byAction.update,
    blocked: byAction.conflict,
    unchanged: byAction.unchanged,
    reviewRequired: byAction.update > 0 || byAction.conflict > 0,
    byAction,
    byStatus,
    byDomain,
    advisories: [],
  };
  summary.advisories = reconciliationAdvisories(summary);
  return summary;
}

function reconciliationAdvisories(summary: ReconciliationSummary): string[] {
  const advisories: string[] = [];
  if (summary.byAction.conflict > 0) {
    advisories.push('Resolve conflict candidates manually before applying those records to the owner Pod.');
  }
  if (summary.byAction.update > 0) {
    advisories.push('Review update candidates because matching local Pod records will be changed.');
  }
  if (summary.byAction.unchanged > 0) {
    advisories.push('Unchanged candidates are visible for provenance review and are skipped during apply.');
  }
  if (summary.total === 0) {
    advisories.push('No reconciliation candidates are available for owner review.');
  }
  return advisories;
}


// ─── Matching one incoming record against the Pod ─────────────────────────────
//
// Shared by every import path (Epic, HealthKit) so a measurement arriving from
// two sources is judged by one rule. Moved out of the Epic service unchanged,
// except that `source` joins `notes` as provenance excluded from comparison.

export interface EntityReconciliation {
  action: ReconciliationAction;
  targetUrl?: string;
  reconciliation: { status: ReconciliationStatus; detail: string };
}

/**
 * Decide what applying `entity` to `domain` would do, given the records already
 * in the Pod: create when nothing matches its key; unchanged when one matches
 * with the same values; update when one matches with different values; conflict
 * when several match, or the match has no URL.
 */
export function reconcileEntity(
  domain: string,
  entity: Record<string, unknown>,
  existing: Array<Record<string, unknown>>,
  sourceLabel: string,
): EntityReconciliation {
  const key = reconciliationKey(domain, entity);
  const matches = key ? existing.filter((record) => reconciliationKey(domain, record) === key) : [];
  if (matches.length === 0) {
    return { action: 'create', reconciliation: { status: 'new', detail: 'No matching local pod record was found.' } };
  }
  if (matches.length > 1) {
    return {
      action: 'conflict',
      reconciliation: { status: 'ambiguous', detail: `${matches.length} local pod records match this ${sourceLabel} candidate; review manually before applying.` },
    };
  }
  const [match] = matches;
  const targetUrl = typeof match.url === 'string' ? match.url : undefined;
  if (comparableSignature(entity) === comparableSignature(match)) {
    return {
      action: 'unchanged',
      targetUrl,
      reconciliation: { status: 'matched', detail: 'A matching local pod record already has the same normalized values.' },
    };
  }
  return targetUrl
    ? { action: 'update', targetUrl, reconciliation: { status: 'changed', detail: 'A matching local pod record exists with different normalized values and can be updated.' } }
    : { action: 'conflict', reconciliation: { status: 'ambiguous', detail: 'A matching local pod record exists but has no URL for safe update.' } };
}

export function reconciliationKey(domain: string, entity: Record<string, unknown>): string | undefined {
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
    case 'documents':
      return [codingKey(nestedValue(entity, 'documentType')), stringField(entity, 'title'), stringField(entity, 'authoredDate')].filter(Boolean).join('::') || undefined;
    case 'workflow-tasks':
      return [codingKey(nestedValue(entity, 'taskType')), stringField(entity, 'description'), stringField(entity, 'authoredDate')].filter(Boolean).join('::') || undefined;
    default:
      // Pillar observation records (HealthKit samples outside the FHIR
      // pillars): one metric at one instant.
      return [stringField(entity, 'metric'), stringField(entity, 'effectiveStart')].filter(Boolean).join('::') || undefined;
  }
}

function codingKey(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const coding = value as Record<string, unknown>;
  const system = typeof coding.system === 'string' ? coding.system : '';
  const code = typeof coding.code === 'string' ? coding.code : '';
  return system || code ? `${system}::${code}` : undefined;
}

export function comparableSignature(entity: Record<string, unknown>): string {
  const copy = JSON.parse(JSON.stringify(entity)) as Record<string, unknown>;
  // Provenance (`notes` for Epic, `source` for HealthKit) says where a record came
  // from, not what was measured, so two sources of one measurement compare equal.
  for (const field of ['url', 'createdAt', 'updatedAt', 'notes', 'source']) delete copy[field];
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
