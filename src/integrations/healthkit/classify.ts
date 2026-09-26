import { ValidationError } from '../../errors';
import { vitalSignCodeFor } from '../../standards/vitalSigns';
import type { MetricDescriptor, MetricTarget } from './types';

/**
 * FHIR resource type → PIM pillar, for HealthKit clinical records. These are
 * PIM's existing FHIR-aligned pillars; Observation is decided per record by the
 * Epic mapper (vital-signs or lab-results).
 */
const CLINICAL_PILLARS: Record<string, string> = {
  AllergyIntolerance: 'allergies',
  Condition: 'conditions',
  Immunization: 'immunizations',
  MedicationRequest: 'medications',
  MedicationStatement: 'medications',
  MedicationOrder: 'medications',
  Observation: 'lab-results',
  DiagnosticReport: 'lab-results',
  Coverage: 'insurance-policies',
};

/** Apple category → pillar slug: `Body Measurements` → `body-measurements`. */
export function pillarSlug(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

/**
 * Derive where a metric's records live, by rule, from what the bridge declared
 * (§2). No metric list exists anywhere: a new metric is classified the moment
 * it is declared.
 *
 *   1. clinical records → the FHIR pillar of their resource type;
 *   2. PIM's nine vital signs (by LOINC or code) → `vital-signs`, where they
 *      reconcile with Epic;
 *   3. everything else → the pillar named by its Apple category.
 */
export function classifyMetric(descriptor: MetricDescriptor): MetricTarget {
  if (descriptor.kind === 'clinical') {
    const pillar = descriptor.fhirCategory ? CLINICAL_PILLARS[descriptor.fhirCategory] : undefined;
    if (!pillar) {
      throw new ValidationError(`No PIM pillar for clinical record type ${descriptor.fhirCategory ?? '(none)'}.`, [
        { field: 'fhirCategory', reason: `one of ${Object.keys(CLINICAL_PILLARS).join(', ')}` },
      ]);
    }
    return { kind: 'fhir', pillar };
  }
  const vitalSignCode = vitalSignCodeFor(descriptor.loinc);
  if (vitalSignCode) {
    return { kind: 'vital-signs', pillar: 'vital-signs', vitalSignCode };
  }
  const pillar = descriptor.appleCategory ? pillarSlug(descriptor.appleCategory) : '';
  if (!pillar) {
    throw new ValidationError(`Metric ${descriptor.metric} has no Apple category to place it in a pillar.`, [
      { field: 'appleCategory', reason: 'required unless the metric is a vital sign or a clinical record' },
    ]);
  }
  return { kind: 'pillar', pillar };
}

const KINDS = new Set(['quantity', 'category', 'correlation', 'workout', 'clinical']);

/** Validate an untrusted descriptor from a request body. */
export function parseDescriptor(raw: unknown): MetricDescriptor {
  if (!raw || typeof raw !== 'object') {
    throw new ValidationError('Each descriptor must be an object.', [{ field: 'descriptors', reason: 'object required' }]);
  }
  const d = raw as Record<string, unknown>;
  const str = (key: string): string | undefined => (typeof d[key] === 'string' && (d[key] as string).trim() ? (d[key] as string).trim() : undefined);
  const metric = str('metric');
  const kind = str('kind');
  if (!metric || !/^HK[A-Za-z]+$/.test(metric)) {
    throw new ValidationError('A descriptor needs a HealthKit type identifier.', [{ field: 'metric', reason: 'e.g. HKQuantityTypeIdentifierStepCount' }]);
  }
  if (!kind || !KINDS.has(kind)) {
    throw new ValidationError(`Descriptor ${metric} has an invalid kind.`, [{ field: 'kind', reason: [...KINDS].join(' | ') }]);
  }
  return {
    metric,
    kind: kind as MetricDescriptor['kind'],
    unit: str('unit'),
    loinc: str('loinc'),
    fhirCategory: str('fhirCategory'),
    appleCategory: str('appleCategory'),
    display: str('display'),
  };
}
