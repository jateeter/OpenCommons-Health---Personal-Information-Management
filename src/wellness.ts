/**
 * Wellness landing summary (issue #32).
 *
 * Aggregates owner Pod records into one normalized 0–100 score per
 * wellness-meaningful domain so the landing spider graph can plot the
 * patient's current state with red/yellow/green indicators.
 *
 * The normalization heuristics implemented here are documented in
 * docs/WELLNESS_LANDING_SCORING.md. They are deliberately conservative
 * localhost-MVP rules, not clinical guidance.
 */

import type {
  AllergyIntolerance,
  Immunization,
  LabResult,
  Medication,
  MedicalCondition,
  VitalSign,
} from './types';

/** Domains rendered as spider-graph vectors, in display order. */
export const WELLNESS_AXIS_DOMAINS = [
  'vital-signs',
  'lab-results',
  'medications',
  'conditions',
  'allergies',
  'immunizations',
] as const;

/** Domains offered in the browse/navigation area instead of the graph. */
export const WELLNESS_BROWSE_DOMAINS = [
  'profiles',
  'providers',
  'insurance-policies',
  'documents',
  'workflow-tasks',
] as const;

export type WellnessAxisDomain = (typeof WELLNESS_AXIS_DOMAINS)[number];
export type WellnessBrowseDomain = (typeof WELLNESS_BROWSE_DOMAINS)[number];
export type WellnessStatus = 'green' | 'yellow' | 'red' | 'empty';

export interface WellnessAxis {
  domain: WellnessAxisDomain;
  label: string;
  /** Normalized 0–100 wellness score; null when the domain has no records. */
  score: number | null;
  status: WellnessStatus;
  /** Short owner-facing reason for the status (one sentence, no PHI values). */
  summary: string;
  /** ISO timestamp of the newest record considered, when available. */
  latestAt?: string;
  recordCount: number;
}

export interface WellnessBrowseEntry {
  domain: WellnessBrowseDomain;
  count: number | null;
}

export interface WellnessSummary {
  generatedAt: string;
  axes: WellnessAxis[];
  browse: WellnessBrowseEntry[];
}

export interface WellnessSourceRecords {
  'vital-signs': VitalSign[];
  'lab-results': LabResult[];
  medications: Medication[];
  conditions: MedicalCondition[];
  allergies: AllergyIntolerance[];
  immunizations: Immunization[];
}

const AXIS_LABELS: Record<WellnessAxisDomain, string> = {
  'vital-signs': 'Vitals',
  'lab-results': 'Labs',
  medications: 'Meds',
  conditions: 'Conditions',
  allergies: 'Allergies',
  immunizations: 'Vaccines',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const VITALS_STALE_DAYS = 365;
const LABS_RECENT_DAYS = 730;
const IMMUNIZATION_CURRENT_DAYS = 365;
const IMMUNIZATION_AGING_DAYS = 3 * 365;

interface VitalRange {
  low: number;
  high: number;
  /** Fractional margin around the range treated as borderline instead of out-of-range. */
  margin: number;
}

/** Adult general-population screening ranges; see docs/WELLNESS_LANDING_SCORING.md. */
const VITAL_RANGES: Partial<Record<string, VitalRange>> = {
  'heart-rate': { low: 60, high: 100, margin: 0.1 },
  'respiratory-rate': { low: 12, high: 20, margin: 0.15 },
  'body-temperature': { low: 36.1, high: 37.2, margin: 0.02 },
  'oxygen-saturation': { low: 95, high: 100, margin: 0.03 },
  bmi: { low: 18.5, high: 24.9, margin: 0.2 },
  'blood-glucose': { low: 70, high: 140, margin: 0.15 },
};

const BLOOD_PRESSURE_RANGES = {
  systolic: { low: 90, high: 120, margin: 0.12 },
  diastolic: { low: 60, high: 80, margin: 0.12 },
} as const;

type RangeBand = 'in-range' | 'borderline' | 'out-of-range';

function classifyValue(value: number, range: VitalRange): RangeBand {
  if (value >= range.low && value <= range.high) return 'in-range';
  const lowLimit = range.low * (1 - range.margin);
  const highLimit = range.high * (1 + range.margin);
  if (value >= lowLimit && value <= highLimit) return 'borderline';
  return 'out-of-range';
}

const BAND_WEIGHT: Record<RangeBand, number> = {
  'in-range': 1,
  borderline: 0.6,
  'out-of-range': 0.15,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function newestTimestamp(values: Array<string | undefined>): string | undefined {
  const times = values
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, at: Date.parse(value) }))
    .filter((entry) => Number.isFinite(entry.at))
    .sort((a, b) => b.at - a.at);
  return times[0]?.value;
}

function daysBetween(now: Date, iso: string | undefined): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return (now.valueOf() - at) / DAY_MS;
}

function emptyAxis(domain: WellnessAxisDomain, summary: string): WellnessAxis {
  return { domain, label: AXIS_LABELS[domain], score: null, status: 'empty', summary, recordCount: 0 };
}

function scoreVitalSigns(records: VitalSign[], now: Date): WellnessAxis {
  if (records.length === 0) return emptyAxis('vital-signs', 'No vital sign observations are stored yet.');

  const latestByCode = new Map<string, VitalSign>();
  for (const record of records) {
    const existing = latestByCode.get(record.code);
    if (!existing || Date.parse(record.effectiveDateTime) > Date.parse(existing.effectiveDateTime)) {
      latestByCode.set(record.code, record);
    }
  }

  const bands: RangeBand[] = [];
  for (const [code, record] of latestByCode) {
    if (code === 'blood-pressure') {
      const value = record.value;
      if (typeof value === 'object' && value !== null) {
        bands.push(classifyValue(value.systolic, BLOOD_PRESSURE_RANGES.systolic));
        bands.push(classifyValue(value.diastolic, BLOOD_PRESSURE_RANGES.diastolic));
      } else if (typeof value === 'number') {
        bands.push(classifyValue(value, BLOOD_PRESSURE_RANGES.systolic));
      }
      continue;
    }
    const range = VITAL_RANGES[code];
    if (!range || typeof record.value !== 'number') continue;
    bands.push(classifyValue(record.value, range));
  }

  const latestAt = newestTimestamp(records.map((record) => record.effectiveDateTime));
  const ageDays = daysBetween(now, latestAt);
  const stale = ageDays !== null && ageDays > VITALS_STALE_DAYS;

  if (bands.length === 0) {
    return {
      domain: 'vital-signs',
      label: AXIS_LABELS['vital-signs'],
      score: stale ? 55 : 75,
      status: stale ? 'yellow' : 'green',
      summary: stale
        ? 'Only unranged measurements are stored and the newest is over a year old.'
        : 'Stored measurements have no screening range to compare against.',
      latestAt,
      recordCount: records.length,
    };
  }

  const score = clampScore((bands.reduce((sum, band) => sum + BAND_WEIGHT[band], 0) / bands.length) * 100 - (stale ? 15 : 0));
  const outOfRange = bands.filter((band) => band === 'out-of-range').length;
  const borderline = bands.filter((band) => band === 'borderline').length;
  const status: WellnessStatus = outOfRange > 0 ? 'red' : borderline > 0 || stale ? 'yellow' : 'green';
  const summary = outOfRange > 0
    ? `${outOfRange} latest measurement${outOfRange === 1 ? ' is' : 's are'} outside its screening range.`
    : borderline > 0
      ? `${borderline} latest measurement${borderline === 1 ? ' is' : 's are'} borderline.`
      : stale
        ? 'Measurements are in range but the newest is over a year old.'
        : 'Latest measurements are within their screening ranges.';
  return { domain: 'vital-signs', label: AXIS_LABELS['vital-signs'], score, status, summary, latestAt, recordCount: records.length };
}

function scoreLabResults(records: LabResult[], now: Date): WellnessAxis {
  if (records.length === 0) return emptyAxis('lab-results', 'No laboratory results are stored yet.');

  const latestByCode = new Map<string, LabResult>();
  for (const record of records) {
    const key = `${record.code.system}|${record.code.code}`;
    const existing = latestByCode.get(key);
    if (!existing || Date.parse(record.effectiveDateTime) > Date.parse(existing.effectiveDateTime)) {
      latestByCode.set(key, record);
    }
  }

  const latestAt = newestTimestamp(records.map((record) => record.effectiveDateTime));
  const recent = [...latestByCode.values()].filter((record) => {
    const age = daysBetween(now, record.effectiveDateTime);
    return age !== null && age <= LABS_RECENT_DAYS;
  });

  if (recent.length === 0) {
    return {
      domain: 'lab-results',
      label: AXIS_LABELS['lab-results'],
      score: 50,
      status: 'yellow',
      summary: 'All stored laboratory results are more than two years old.',
      latestAt,
      recordCount: records.length,
    };
  }

  const weight = (interpretation: LabResult['interpretation']): number => {
    if (interpretation === 'critical-high' || interpretation === 'critical-low') return 0.1;
    if (interpretation === 'high' || interpretation === 'low' || interpretation === 'abnormal') return 0.5;
    return 1;
  };
  const critical = recent.filter((record) => record.interpretation === 'critical-high' || record.interpretation === 'critical-low').length;
  const abnormal = recent.filter((record) => record.interpretation === 'high' || record.interpretation === 'low' || record.interpretation === 'abnormal').length;
  const score = clampScore((recent.reduce((sum, record) => sum + weight(record.interpretation), 0) / recent.length) * 100);
  const status: WellnessStatus = critical > 0 ? 'red' : abnormal > 0 ? 'yellow' : 'green';
  const summary = critical > 0
    ? `${critical} recent result${critical === 1 ? ' is' : 's are'} flagged critical.`
    : abnormal > 0
      ? `${abnormal} recent result${abnormal === 1 ? ' is' : 's are'} flagged outside the reference range.`
      : 'Recent laboratory results carry no abnormal flags.';
  return { domain: 'lab-results', label: AXIS_LABELS['lab-results'], score, status, summary, latestAt, recordCount: records.length };
}

function scoreMedications(records: Medication[]): WellnessAxis {
  if (records.length === 0) return emptyAxis('medications', 'No medications are stored yet.');
  const active = records.filter((record) => record.status === 'active').length;
  const score = clampScore(100 - active * 6);
  const status: WellnessStatus = active >= 10 ? 'red' : active >= 5 ? 'yellow' : 'green';
  const summary = active === 0
    ? 'No medications are currently active.'
    : `${active} medication${active === 1 ? ' is' : 's are'} active${active >= 5 ? ' — polypharmacy review threshold reached' : ''}.`;
  const latestAt = newestTimestamp(records.map((record) => record.updatedAt ?? record.createdAt ?? record.startDate));
  return { domain: 'medications', label: AXIS_LABELS.medications, score, status, summary, latestAt, recordCount: records.length };
}

const ACTIVE_CONDITION_STATUSES = new Set(['active', 'recurrence', 'relapse']);

function scoreConditions(records: MedicalCondition[]): WellnessAxis {
  if (records.length === 0) return emptyAxis('conditions', 'No conditions are stored yet.');
  const active = records.filter((record) => ACTIVE_CONDITION_STATUSES.has(record.status));
  const severe = active.filter((record) => record.severity === 'severe').length;
  const score = clampScore(100 - active.length * 15 - severe * 20);
  const status: WellnessStatus = severe > 0 ? 'red' : active.length > 0 ? 'yellow' : 'green';
  const summary = severe > 0
    ? `${severe} active condition${severe === 1 ? ' is' : 's are'} marked severe.`
    : active.length > 0
      ? `${active.length} condition${active.length === 1 ? ' is' : 's are'} active.`
      : 'All stored conditions are inactive or resolved.';
  const latestAt = newestTimestamp(records.map((record) => record.updatedAt ?? record.createdAt ?? record.onsetDate));
  return { domain: 'conditions', label: AXIS_LABELS.conditions, score, status, summary, latestAt, recordCount: records.length };
}

function scoreAllergies(records: AllergyIntolerance[]): WellnessAxis {
  if (records.length === 0) return emptyAxis('allergies', 'No allergies or intolerances are stored yet.');
  const active = records.filter((record) => record.status === 'active');
  const severe = active.filter((record) => (record.reactions ?? []).some((reaction) => reaction.severity === 'severe')).length;
  const score = clampScore(100 - active.length * 10 - severe * 25);
  const status: WellnessStatus = severe > 0 || active.length > 5 ? 'red' : active.length > 2 ? 'yellow' : 'green';
  const summary = severe > 0
    ? `${severe} active allerg${severe === 1 ? 'y has' : 'ies have'} a severe reaction on record.`
    : active.length > 0
      ? `${active.length} active allerg${active.length === 1 ? 'y is' : 'ies are'} documented.`
      : 'No allergies are currently active.';
  const latestAt = newestTimestamp(records.map((record) => record.updatedAt ?? record.createdAt ?? record.onsetDate));
  return { domain: 'allergies', label: AXIS_LABELS.allergies, score, status, summary, latestAt, recordCount: records.length };
}

function scoreImmunizations(records: Immunization[], now: Date): WellnessAxis {
  if (records.length === 0) return emptyAxis('immunizations', 'No immunizations are stored yet.');
  const completed = records.filter((record) => record.status === 'completed');
  const latestAt = newestTimestamp(completed.map((record) => record.occurrenceDate));
  const ageDays = daysBetween(now, latestAt);

  if (ageDays === null) {
    return {
      domain: 'immunizations',
      label: AXIS_LABELS.immunizations,
      score: 30,
      status: 'red',
      summary: 'No completed immunization has a usable date on record.',
      recordCount: records.length,
    };
  }

  let score: number;
  let status: WellnessStatus;
  let summary: string;
  if (ageDays <= IMMUNIZATION_CURRENT_DAYS) {
    score = clampScore(100 - (ageDays / IMMUNIZATION_CURRENT_DAYS) * 20);
    status = 'green';
    summary = 'The most recent completed immunization is within the last year.';
  } else if (ageDays <= IMMUNIZATION_AGING_DAYS) {
    score = 60;
    status = 'yellow';
    summary = 'The most recent completed immunization is one to three years old.';
  } else {
    score = 25;
    status = 'red';
    summary = 'The most recent completed immunization is more than three years old.';
  }
  return { domain: 'immunizations', label: AXIS_LABELS.immunizations, score, status, summary, latestAt, recordCount: records.length };
}

/**
 * Pure aggregation of Pod records into the landing wellness summary.
 * `now` is injectable for deterministic tests.
 */
export function computeWellnessSummary(
  records: WellnessSourceRecords,
  browseCounts: Record<string, number | null>,
  now: Date = new Date(),
): WellnessSummary {
  const axesByDomain: Record<WellnessAxisDomain, WellnessAxis> = {
    'vital-signs': scoreVitalSigns(records['vital-signs'], now),
    'lab-results': scoreLabResults(records['lab-results'], now),
    medications: scoreMedications(records.medications),
    conditions: scoreConditions(records.conditions),
    allergies: scoreAllergies(records.allergies),
    immunizations: scoreImmunizations(records.immunizations, now),
  };
  return {
    generatedAt: now.toISOString(),
    axes: WELLNESS_AXIS_DOMAINS.map((domain) => axesByDomain[domain]),
    browse: WELLNESS_BROWSE_DOMAINS.map((domain) => ({
      domain,
      count: browseCounts[domain] ?? null,
    })),
  };
}
