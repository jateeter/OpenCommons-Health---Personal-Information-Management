import { mapEpicResourcesToPim } from '../../../src/integrations/epic/mapper';
import { vitalSignCodeFor } from '../../../src/standards/vitalSigns';

const context = { fhirBaseUrl: 'https://fhir.example', patientId: 'p', importedAt: '2026-09-25T00:00:00Z' };

function observation(loinc: string, extra: Record<string, unknown> = {}) {
  return {
    resourceType: 'Observation',
    id: `obs-${loinc}`,
    category: [{ coding: [{ code: 'vital-signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: loinc, display: loinc }] },
    effectiveDateTime: '2026-09-25T08:00:00Z',
    ...extra,
  } as never;
}

describe('Epic vital-sign mapping uses the FHIR vital-signs LOINC codes', () => {
  it('codes a heart rate as heart-rate, not body-weight', () => {
    const [candidate] = mapEpicResourcesToPim([observation('8867-4', { valueQuantity: { value: 62, unit: 'beats/minute' } })], context);
    expect(candidate).toMatchObject({ domain: 'vital-signs', entity: { code: 'heart-rate', value: 62 } });
  });

  it('keeps blood pressure components from the panel', () => {
    const [candidate] = mapEpicResourcesToPim([observation('85354-9', {
      component: [
        { code: { coding: [{ system: 'http://loinc.org', code: '8480-6' }] }, valueQuantity: { value: 118, unit: 'mm[Hg]' } },
        { code: { coding: [{ system: 'http://loinc.org', code: '8462-4' }] }, valueQuantity: { value: 76, unit: 'mm[Hg]' } },
      ],
    })], context);
    expect(candidate).toMatchObject({ domain: 'vital-signs', entity: { code: 'blood-pressure', value: { systolic: 118, diastolic: 76 }, unit: 'mm[Hg]' } });
  });

  it('still maps BMI and body weight as before', () => {
    expect(mapEpicResourcesToPim([observation('39156-5', { valueQuantity: { value: 24.1 } })], context)[0].entity).toMatchObject({ code: 'bmi' });
    expect(mapEpicResourcesToPim([observation('29463-7', { valueQuantity: { value: 70 } })], context)[0].entity).toMatchObject({ code: 'body-weight' });
  });

  it('resolves LOINC or PIM codes, and nothing else', () => {
    expect(vitalSignCodeFor('59408-5')).toBe('oxygen-saturation');
    expect(vitalSignCodeFor('heart-rate')).toBe('heart-rate');
    expect(vitalSignCodeFor('55423-8')).toBeUndefined();
    expect(vitalSignCodeFor(undefined)).toBeUndefined();
  });
});
