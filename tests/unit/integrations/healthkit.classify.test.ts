import { classifyMetric, parseDescriptor, pillarSlug } from '../../../src/integrations/healthkit';
import { ValidationError } from '../../../src/errors';

describe('HealthKit metric classification (MIRROR_CONTRACT §2)', () => {
  it('places a vital sign by LOINC in the vital-signs pillar, whatever its Apple category', () => {
    expect(classifyMetric({ metric: 'HKQuantityTypeIdentifierHeartRate', kind: 'quantity', loinc: '8867-4', appleCategory: 'Heart' }))
      .toEqual({ kind: 'vital-signs', pillar: 'vital-signs', vitalSignCode: 'heart-rate' });
    expect(classifyMetric({ metric: 'HKCorrelationTypeIdentifierBloodPressure', kind: 'correlation', loinc: '85354-9', appleCategory: 'Vitals' }))
      .toEqual({ kind: 'vital-signs', pillar: 'vital-signs', vitalSignCode: 'blood-pressure' });
  });

  it('places everything else in the pillar named by its Apple category', () => {
    expect(classifyMetric({ metric: 'HKQuantityTypeIdentifierStepCount', kind: 'quantity', loinc: '55423-8', appleCategory: 'Activity' }))
      .toEqual({ kind: 'pillar', pillar: 'activity' });
    expect(classifyMetric({ metric: 'HKCategoryTypeIdentifierSleepAnalysis', kind: 'category', appleCategory: 'Sleep' }))
      .toEqual({ kind: 'pillar', pillar: 'sleep' });
    expect(classifyMetric({ metric: 'HKQuantityTypeIdentifierBodyFatPercentage', kind: 'quantity', appleCategory: 'Body Measurements' }))
      .toEqual({ kind: 'pillar', pillar: 'body-measurements' });
  });

  it('places clinical records in the FHIR pillar of their resource type', () => {
    expect(classifyMetric({ metric: 'HKClinicalTypeIdentifierAllergyRecord', kind: 'clinical', fhirCategory: 'AllergyIntolerance' }))
      .toEqual({ kind: 'fhir', pillar: 'allergies' });
    expect(classifyMetric({ metric: 'HKClinicalTypeIdentifierCoverageRecord', kind: 'clinical', fhirCategory: 'Coverage' }))
      .toEqual({ kind: 'fhir', pillar: 'insurance-policies' });
  });

  it('refuses a metric it cannot place rather than guessing', () => {
    expect(() => classifyMetric({ metric: 'HKQuantityTypeIdentifierMystery', kind: 'quantity' })).toThrow(ValidationError);
    expect(() => classifyMetric({ metric: 'HKClinicalTypeIdentifierProcedureRecord', kind: 'clinical', fhirCategory: 'Procedure' })).toThrow(ValidationError);
  });

  it('slugs Apple categories to single path segments', () => {
    expect(pillarSlug('Cycle Tracking')).toBe('cycle-tracking');
    expect(pillarSlug('  Heart & Lungs ')).toBe('heart-and-lungs');
  });

  it('validates untrusted descriptors', () => {
    expect(parseDescriptor({ metric: 'HKQuantityTypeIdentifierStepCount', kind: 'quantity', unit: 'count', appleCategory: 'Activity' }))
      .toMatchObject({ metric: 'HKQuantityTypeIdentifierStepCount', kind: 'quantity', unit: 'count' });
    expect(() => parseDescriptor({ metric: 'steps', kind: 'quantity' })).toThrow(ValidationError);
    expect(() => parseDescriptor({ metric: 'HKQuantityTypeIdentifierStepCount', kind: 'nonsense' })).toThrow(ValidationError);
  });
});
