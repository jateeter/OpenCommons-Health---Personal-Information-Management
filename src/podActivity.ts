import { DOMAIN_NAMES } from './openapi';

export type PodActivityKind =
  | 'pod-access-verified'
  | 'record-created'
  | 'record-updated'
  | 'record-deleted'
  | 'anonymized-release-denied'
  | 'anonymized-release-approved'
  | 'epic-preview'
  | 'epic-apply'
  | 'epic-connect'
  | 'epic-disconnect';

export type PodActivityStatus = 'ok' | 'attention' | 'failed' | 'info';

export interface PodActivityEvent {
  id: string;
  at: string;
  kind: PodActivityKind;
  status: PodActivityStatus;
  summary: string;
  domain?: string;
  resourcePath?: string;
  purpose?: string;
  source?: 'owner-ui' | 'api' | 'epic' | 'deployment-smoke';
}

export interface PodContainerStatus {
  id: string;
  label: string;
  relativePath: string;
  purpose: string;
  status: 'active' | 'planned' | 'attention';
}

export interface PodActivitySummary {
  generatedAt: string;
  authenticated: boolean;
  podAccess: boolean;
  podServerUrl: string;
  podBaseUrl: string;
  domainCount: number;
  managedDomains: string[];
  domainCounts: Record<string, number | null>;
  countsByKind: Partial<Record<PodActivityKind, number>>;
  lastPodAccessAt?: string;
  lastOwnerApprovedReleaseAt?: string;
  containers: PodContainerStatus[];
}

export interface PodActivityResponse {
  summary: PodActivitySummary;
  events: PodActivityEvent[];
}

export interface PodActivityLog {
  record(event: Omit<PodActivityEvent, 'id' | 'at'> & { at?: string }): PodActivityEvent;
  list(limit?: number): PodActivityEvent[];
}

export class InMemoryPodActivityLog implements PodActivityLog {
  private readonly events: PodActivityEvent[] = [];
  private nextId = 1;

  constructor(private readonly maxEvents = 200) {}

  record(event: Omit<PodActivityEvent, 'id' | 'at'> & { at?: string }): PodActivityEvent {
    const safe: PodActivityEvent = {
      id: `pod-activity-${this.nextId++}`,
      at: event.at ?? new Date().toISOString(),
      kind: event.kind,
      status: event.status,
      summary: safeText(event.summary),
      domain: event.domain,
      resourcePath: safeResourcePath(event.resourcePath),
      purpose: event.purpose ? safeText(event.purpose, 96) : undefined,
      source: event.source,
    };
    this.events.unshift(safe);
    if (this.events.length > this.maxEvents) this.events.length = this.maxEvents;
    return safe;
  }

  list(limit = 25): PodActivityEvent[] {
    return this.events.slice(0, Math.max(0, Math.min(limit, this.maxEvents)));
  }
}

export function createPodActivityResponse(options: {
  activityLog?: PodActivityLog;
  authenticated: boolean;
  podAccess: boolean;
  podServerUrl: string;
  podBaseUrl: string;
  domainCounts: Record<string, number | null>;
  limit?: number;
}): PodActivityResponse {
  const events = options.activityLog?.list(options.limit ?? 25) ?? [];
  const countsByKind: Partial<Record<PodActivityKind, number>> = {};
  for (const event of events) {
    countsByKind[event.kind] = (countsByKind[event.kind] ?? 0) + 1;
  }
  return {
    summary: {
      generatedAt: new Date().toISOString(),
      authenticated: options.authenticated,
      podAccess: options.podAccess,
      podServerUrl: options.podServerUrl,
      podBaseUrl: options.podBaseUrl,
      domainCount: DOMAIN_NAMES.length,
      managedDomains: DOMAIN_NAMES,
      domainCounts: options.domainCounts,
      countsByKind,
      lastPodAccessAt: events.find((event) => event.kind === 'pod-access-verified')?.at,
      lastOwnerApprovedReleaseAt: events.find((event) => event.kind === 'anonymized-release-approved')?.at,
      containers: podContainers(),
    },
    events,
  };
}

export function activitySummaryForDomainAction(
  kind: 'record-created' | 'record-updated' | 'record-deleted',
  domain: string,
): string {
  const action = kind === 'record-created' ? 'created' : kind === 'record-updated' ? 'updated' : 'deleted';
  return `${domain} record ${action} in the owner Pod`;
}

export function resourcePathFromUrl(resourceUrl: string | undefined): string | undefined {
  if (!resourceUrl) return undefined;
  try {
    return new URL(resourceUrl).pathname;
  } catch {
    return undefined;
  }
}

function podContainers(): PodContainerStatus[] {
  return [
    {
      id: 'healthkit-observations',
      label: 'HealthKit observations',
      relativePath: 'health-pim/healthkit/observations/',
      purpose: 'Future owner-approved HealthKit mirror resources.',
      status: 'planned',
    },
    {
      id: 'documents',
      label: 'Clinical documents',
      relativePath: 'health-pim/clinicaldocuments/',
      purpose: 'Owner-held DocumentReference metadata.',
      status: 'active',
    },
    {
      id: 'workflow',
      label: 'Workflow tasks',
      relativePath: 'health-pim/workflowtasks/',
      purpose: 'Owner-held care tasks and review steps.',
      status: 'active',
    },
    {
      id: 'consents',
      label: 'Owner consents',
      relativePath: 'health-pim/consents/',
      purpose: 'Future owner approval records for sync and release.',
      status: 'planned',
    },
    {
      id: 'audit',
      label: 'Pod activity audit',
      relativePath: 'health-pim/audit/',
      purpose: 'Current safe metadata activity trail; Solid persistence is the next hardening step.',
      status: 'active',
    },
  ];
}

function safeText(value: string, maxLength = 160): string {
  return value
    .replace(/(token|secret|password|authorization|dpop|client[_ -]?secret)[^,\s]*/gi, '[redacted]')
    .slice(0, maxLength);
}

function safeResourcePath(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return resourcePathFromUrl(value);
  return value.startsWith('/') ? value : undefined;
}
