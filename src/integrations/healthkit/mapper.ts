import type { PillarObservation, VitalSign, VitalSignCode } from '../../types/health';
import { mapEpicResourcesToPim } from '../epic/mapper';
import type { EpicFhirResource } from '../epic/types';
import type { HealthKitSample, RegisteredMetric } from './types';

/** A sample mapped to the PIM record it becomes, or why it cannot be. */
export type MappedSample =
  | { ok: true; domain: string; pillar: string; entity: Record<string, unknown>; measurement: Record<string, unknown> }
  | { ok: false; reason: 'unmappable' | 'invalid'; detail: string };

const SOURCE_SYSTEM = 'healthkit';

/**
 * Map one raw HealthKit sample to the record it is stored as, per its metric's
 * target (§2). `measurement` is the projection reconciliation compares: what was
 * measured and when, never provenance or coding metadata, so the same reading
 * from Epic and from HealthKit is recognised as one (§3).
 */
export function mapSample(sample: HealthKitSample, metric: RegisteredMetric): MappedSample {
  const start = isoOrUndefined(sample.startDate);
  if (!start) return { ok: false, reason: 'invalid', detail: 'startDate is not a valid timestamp' };
  const source = { system: SOURCE_SYSTEM, identifier: sample.uuid, device: sample.sourceName };

  switch (metric.target.kind) {
    case 'vital-signs': {
      const code = metric.target.vitalSignCode as VitalSignCode;
      let value: VitalSign['value'];
      if (code === 'blood-pressure') {
        const systolic = sample.values?.systolic;
        const diastolic = sample.values?.diastolic;
        if (!isFiniteNumber(systolic) || !isFiniteNumber(diastolic)) {
          return { ok: false, reason: 'invalid', detail: 'blood pressure needs values.systolic and values.diastolic' };
        }
        value = { systolic, diastolic };
      } else {
        if (!isFiniteNumber(sample.value)) return { ok: false, reason: 'invalid', detail: 'value is required' };
        value = sample.value;
      }
      const entity: VitalSign = {
        code,
        ...(metric.loinc ? { loincCode: { system: 'http://loinc.org', code: metric.loinc, display: metric.display ?? metric.metric } } : {}),
        value,
        unit: sample.unit ?? metric.unit ?? (code === 'blood-pressure' ? 'mmHg' : ''),
        effectiveDateTime: start,
        source,
      };
      return {
        ok: true,
        domain: 'vital-signs',
        pillar: 'vital-signs',
        entity: entity as unknown as Record<string, unknown>,
        measurement: { code, value, effectiveDateTime: start },
      };
    }

    case 'fhir': {
      if (!sample.fhirResource || typeof sample.fhirResource.resourceType !== 'string') {
        return { ok: false, reason: 'invalid', detail: 'a clinical record needs its FHIR resource' };
      }
      // The same mapper the Epic import uses, so a clinical record reconciles
      // with the Epic copy of it. Its provenance is replaced: this is HealthKit.
      const [candidate] = mapEpicResourcesToPim([sample.fhirResource as unknown as EpicFhirResource], {
        fhirBaseUrl: 'healthkit://clinical-records',
        patientId: 'owner',
        importedAt: new Date().toISOString(),
      });
      if (!candidate) return { ok: false, reason: 'unmappable', detail: `no PIM mapping for ${String(sample.fhirResource.resourceType)}` };
      const entity = {
        ...(candidate.entity as unknown as Record<string, unknown>),
        notes: `Imported from Apple HealthKit ${String(sample.fhirResource.resourceType)}/${sample.uuid}`,
      };
      return { ok: true, domain: candidate.domain, pillar: candidate.domain, entity, measurement: entity };
    }

    case 'pillar': {
      const end = sample.endDate ? isoOrUndefined(sample.endDate) : undefined;
      const hasValue = isFiniteNumber(sample.value) || Boolean(sample.categoryValue) || Boolean(sample.values && Object.keys(sample.values).length);
      if (!hasValue) return { ok: false, reason: 'invalid', detail: 'value, categoryValue or values is required' };
      const entity: PillarObservation = {
        pillar: metric.target.pillar,
        metric: metric.metric,
        appleCategory: metric.appleCategory ?? metric.target.pillar,
        ...(metric.fhirCategory ? { fhirCategory: metric.fhirCategory } : {}),
        ...(metric.loinc ? { loinc: metric.loinc } : {}),
        ...(isFiniteNumber(sample.value) ? { value: sample.value } : {}),
        ...(sample.categoryValue ? { valueCategory: sample.categoryValue } : {}),
        ...(sample.values && Object.keys(sample.values).length ? { components: sample.values } : {}),
        ...((sample.unit ?? metric.unit) ? { unit: sample.unit ?? metric.unit } : {}),
        effectiveStart: start,
        ...(end ? { effectiveEnd: end } : {}),
        source,
      };
      return {
        ok: true,
        domain: metric.target.pillar,
        pillar: metric.target.pillar,
        entity: entity as unknown as Record<string, unknown>,
        measurement: {
          metric: entity.metric,
          effectiveStart: start,
          effectiveEnd: end ?? null,
          value: entity.value ?? null,
          valueCategory: entity.valueCategory ?? null,
          components: entity.components ?? null,
        },
      };
    }
  }
}

/** The comparable projection of a record already in the POD, matching `mapSample`'s. */
export function measurementOf(domain: string, record: Record<string, unknown>): Record<string, unknown> {
  if (domain === 'vital-signs') {
    return { code: record.code, value: record.value, effectiveDateTime: isoOrUndefined(record.effectiveDateTime) ?? record.effectiveDateTime, url: record.url };
  }
  if (typeof record.metric === 'string') {
    return {
      metric: record.metric,
      effectiveStart: isoOrUndefined(record.effectiveStart) ?? record.effectiveStart,
      effectiveEnd: record.effectiveEnd ? isoOrUndefined(record.effectiveEnd) ?? record.effectiveEnd : null,
      value: record.value ?? null,
      valueCategory: record.valueCategory ?? null,
      components: record.components ?? null,
      url: record.url,
    };
  }
  return record;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Normalize to UTC ISO so one instant written two ways is one key. */
function isoOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}
