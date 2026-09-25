/**
 * HealthKit → PIM → POD mirror. The contract is localHealthkitBridge
 * docs/MIRROR_CONTRACT.md; section numbers below refer to it.
 */

/** How HealthKit represents a metric. */
export type MetricKind = 'quantity' | 'category' | 'correlation' | 'workout' | 'clinical';

/**
 * Owner state of a declared metric (§7b). The actions mirror PE ingest scope
 * (INGEST_CONTRACT "Scope and resync"), which this set drives with source "pim".
 */
export type MetricState = 'proposed' | 'active' | 'locked' | 'removed';

/** Owner actions on the approved set. */
export type MetricAction = 'add' | 'lock' | 'remove';

/** What the bridge declares about a metric (§2). No metric is known in advance. */
export interface MetricDescriptor {
  /** HealthKit type identifier, e.g. `HKQuantityTypeIdentifierStepCount`. */
  metric: string;
  kind: MetricKind;
  /** UCUM unit of raw values, for quantity kinds. */
  unit?: string;
  loinc?: string;
  /** FHIR Observation category, or for clinical records the FHIR resource type. */
  fhirCategory?: string;
  /** Apple Health category: Activity, Sleep, Heart, … */
  appleCategory?: string;
  display?: string;
}

/** Where a metric's records are stored, derived by rule from its descriptor (§2). */
export type MetricTarget =
  | { kind: 'vital-signs'; pillar: 'vital-signs'; vitalSignCode: string }
  | { kind: 'fhir'; pillar: string }
  | { kind: 'pillar'; pillar: string };

export interface RegisteredMetric extends MetricDescriptor {
  state: MetricState;
  target: MetricTarget;
  declaredAt: string;
  changedAt: string;
}

/** The owner's metric registry, stored in the POD. */
export interface MetricRegistry {
  /** Increases by one on every owner change (§7b). */
  generation: number;
  metrics: Record<string, RegisteredMetric>;
  updatedAt?: string;
}

/**
 * One HealthKit sample, raw, taken before the bridge's PE normalization (§2).
 * It carries no normalized `[0,1]` values.
 */
export interface HealthKitSample {
  /** HKSample.uuid, the sample's stable identity (§3). */
  uuid: string;
  metric: string;
  startDate: string;
  endDate?: string;
  /** Quantity value in the metric's unit. */
  value?: number;
  unit?: string;
  /** Category value, e.g. a sleep stage. */
  categoryValue?: string;
  /** Named components, e.g. `{ systolic, diastolic }` for blood pressure. */
  values?: Record<string, number>;
  /** HKSource name (the device or app that recorded it). */
  sourceName?: string;
  /** Clinical records only: the FHIR resource HealthKit holds. */
  fhirResource?: Record<string, unknown>;
}

export interface HealthKitBatch {
  bridgeId?: string;
  /** The registry generation the bridge read. A stale one is refused (§7b). */
  generation?: number;
  /** Metrics seen for the first time; declared `proposed`, never mirrored yet. */
  descriptors?: MetricDescriptor[];
  samples: HealthKitSample[];
}

/** Why a sample is not mirrored. */
export type ExclusionReason =
  | 'undeclared'
  | 'pending-approval'
  | 'locked'
  | 'not-in-scope'
  | 'unmappable'
  | 'invalid';

/** Per-sample outcome. PHI-safe: identity, metric, pillar and outcome, never values. */
export interface SampleOutcome {
  sampleUuid: string;
  metric: string;
  pillar?: string;
  action: 'create' | 'unchanged' | 'conflict' | 'excluded';
  reason?: ExclusionReason | 'pod-differs' | 'ambiguous';
  /** Set after apply: where the record now lives, for `create` and `unchanged`. */
  url?: string;
  /** Mirror state the bridge records (§3). */
  mirrorState?: 'mirrored' | 'conflict' | 'pendingMirror';
}

export interface MirrorSummary {
  total: number;
  create: number;
  unchanged: number;
  conflict: number;
  excluded: number;
  byPillar: Record<string, { create: number; unchanged: number; conflict: number; excluded: number }>;
}

export interface MirrorPreview {
  generation: number;
  declared: string[];
  samples: SampleOutcome[];
  summary: MirrorSummary;
}

export interface MirrorApplyResult extends MirrorPreview {
  applied: number;
}

export interface MetricChangeResult {
  action: MetricAction | 'declare';
  generation: number;
  applied: Array<{ metric: string; state: MetricState; previous: MetricState | null }>;
  /** Result of pushing the change to each configured PE's scope endpoint. */
  scopePush: Array<{ pe: string; ok: boolean; status?: number; error?: string }>;
}
