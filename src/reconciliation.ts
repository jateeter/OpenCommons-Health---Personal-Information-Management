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
