import { mapEpicResourcesToPim } from '../../../src/integrations/epic/mapper';

describe('Epic FHIR mapper', () => {
  it('normalizes relative DocumentReference Binary attachment URLs before Pod writes', () => {
    const [candidate] = mapEpicResourcesToPim([{
      resourceType: 'DocumentReference',
      id: 'doc-1',
      status: 'current',
      description: 'Clinical note',
      type: {
        coding: [{ system: 'http://loinc.org', code: '34133-9', display: 'Summary of episode note' }],
      },
      content: [{
        attachment: {
          url: 'Binary/eFp26s9K-vHvLjYPs4WuK1w3',
        },
      }],
    }], {
      fhirBaseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/',
      patientId: 'patient-123',
      importedAt: '2026-08-09T04:45:00.000Z',
    });

    expect(candidate.domain).toBe('documents');
    expect(candidate.entity).toMatchObject({
      sourceDocumentUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Binary/eFp26s9K-vHvLjYPs4WuK1w3',
    });
  });
});
