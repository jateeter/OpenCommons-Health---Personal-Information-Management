import type { EpicFhirResource } from './types';

const lastUpdated = '2026-05-01T18:30:00Z';

export function mockAnnualWellnessResources(): EpicFhirResource[] {
  return [
    {
      resourceType: 'Patient',
      id: 'epic-patient-mock-001',
      meta: { versionId: '1', lastUpdated },
      name: [{ family: 'Wellness-Owner', given: ['Annual'] }],
      birthDate: '1958-04-12',
      gender: 'female',
    },
    {
      resourceType: 'Coverage',
      id: 'coverage-medicare-advantage',
      meta: { versionId: '2', lastUpdated },
      type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'EHCPOL', display: 'extended healthcare' }] },
      payor: [{ display: 'OpenCommons Medicare Advantage' }],
      class: [{ type: { text: 'Plan' }, value: 'Annual Wellness PII Plan' }],
      subscriberId: 'MEDICARE-2026-PII',
      period: { start: '2026-01-01' },
    },
    {
      resourceType: 'Practitioner',
      id: 'practitioner-ada-care',
      meta: { versionId: '1', lastUpdated },
      name: [{ text: 'Dr. Ada Care' }],
      identifier: [{ system: 'http://hl7.org/fhir/sid/us-npi', value: '1234567890' }],
      qualification: [{ code: { text: 'Geriatric primary care' } }],
    },
    {
      resourceType: 'Condition',
      id: 'condition-hypertension',
      meta: { versionId: '7', lastUpdated },
      code: { coding: [{ system: 'http://snomed.info/sct', code: '38341003', display: 'Hypertensive disorder' }] },
      clinicalStatus: { coding: [{ code: 'active' }] },
      severity: { coding: [{ code: 'mild', display: 'Mild' }] },
      onsetDateTime: '2026-05-01',
      recorder: { display: 'Dr. Ada Care' },
    },
    {
      resourceType: 'MedicationStatement',
      id: 'med-atorvastatin',
      meta: { versionId: '3', lastUpdated },
      medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '617314', display: 'Atorvastatin 20 MG Oral Tablet' }] },
      status: 'active',
      dosage: [{ text: '20 mg by mouth daily' }],
      effectivePeriod: { start: '2026-05-01' },
      informationSource: { display: 'Dr. Ada Care' },
    },
    {
      resourceType: 'AllergyIntolerance',
      id: 'allergy-peanut',
      meta: { versionId: '4', lastUpdated },
      code: { coding: [{ system: 'http://snomed.info/sct', code: '91936005', display: 'Allergy to peanuts' }] },
      category: ['food'],
      clinicalStatus: { coding: [{ code: 'active' }] },
    },
    {
      resourceType: 'Immunization',
      id: 'imm-influenza',
      meta: { versionId: '1', lastUpdated },
      vaccineCode: { coding: [{ system: 'http://hl7.org/fhir/sid/cvx', code: '158', display: 'Influenza, injectable, quadrivalent' }] },
      status: 'completed',
      occurrenceDateTime: '2026-10-01',
      protocolApplied: [{ doseNumberPositiveInt: 1 }],
      performer: [{ actor: { display: 'OpenCommons Wellness Clinic' } }],
    },
    {
      resourceType: 'Observation',
      id: 'obs-bmi',
      meta: { versionId: '1', lastUpdated },
      code: { coding: [{ system: 'http://loinc.org', code: '39156-5', display: 'Body mass index (BMI) [Ratio]' }] },
      valueQuantity: { value: 27.4, unit: 'kg/m2' },
      effectiveDateTime: '2026-05-01T14:30:00Z',
      category: [{ coding: [{ code: 'vital-signs' }] }],
    },
    {
      resourceType: 'Observation',
      id: 'lab-a1c',
      meta: { versionId: '1', lastUpdated },
      code: { coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' }] },
      valueQuantity: { value: 5.8, unit: '%' },
      interpretation: [{ coding: [{ code: 'N', display: 'Normal' }] }],
      effectiveDateTime: '2026-05-01T14:30:00Z',
      performer: [{ display: 'OpenCommons Wellness Lab' }],
      category: [{ coding: [{ code: 'laboratory' }] }],
    },
  ];
}

