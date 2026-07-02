/**
 * Tests for the health TypeScript types (structural / compile-time checks
 * verified at runtime via type-guard helpers).
 */
import type {
  PersonProfile,
  MedicalCondition,
  Medication,
  AllergyIntolerance,
  Immunization,
  VitalSign,
  HealthcareProvider,
  LabResult,
  InsurancePolicy,
} from '../../src/types/health';

describe('Health types', () => {
  describe('PersonProfile', () => {
    it('can be constructed with required fields', () => {
      const profile: PersonProfile = {
        name: { family: 'Doe', given: ['John'] },
        birthDate: '1980-01-15',
        biologicalSex: 'male',
      };
      expect(profile.name.family).toBe('Doe');
      expect(profile.birthDate).toBe('1980-01-15');
      expect(profile.biologicalSex).toBe('male');
    });
  });

  describe('MedicalCondition', () => {
    it('can be constructed with required fields', () => {
      const condition: MedicalCondition = {
        code: {
          system: 'http://snomed.info/id/',
          code: '44054006',
          display: 'Type 2 diabetes mellitus',
        },
        status: 'active',
      };
      expect(condition.code.code).toBe('44054006');
      expect(condition.status).toBe('active');
    });
  });

  describe('Medication', () => {
    it('accepts a full medication entry', () => {
      const med: Medication = {
        medicationCode: {
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm/',
          code: '860975',
          display: 'Metformin 500mg',
        },
        status: 'active',
        dosage: {
          text: '500mg twice daily',
          doseQuantity: { value: 500, unit: 'mg' },
        },
      };
      expect(med.medicationCode.display).toBe('Metformin 500mg');
      expect(med.dosage?.doseQuantity?.value).toBe(500);
    });
  });

  describe('AllergyIntolerance', () => {
    it('can be constructed with required fields', () => {
      const allergy: AllergyIntolerance = {
        substance: {
          system: 'http://snomed.info/id/',
          code: '372687004',
          display: 'Amoxicillin',
        },
        category: 'medication',
        status: 'active',
      };
      expect(allergy.category).toBe('medication');
    });
  });

  describe('Immunization', () => {
    it('can be constructed with required fields', () => {
      const imm: Immunization = {
        vaccineCode: {
          system: 'https://www2.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx#',
          code: '140',
          display: 'Influenza, seasonal, injectable',
        },
        status: 'completed',
        occurrenceDate: '2023-10-01',
      };
      expect(imm.occurrenceDate).toBe('2023-10-01');
    });
  });

  describe('VitalSign', () => {
    it('accepts a numeric value', () => {
      const vital: VitalSign = {
        code: 'heart-rate',
        value: 72,
        unit: 'bpm',
        effectiveDateTime: '2024-01-01T09:00:00Z',
      };
      expect(vital.value).toBe(72);
    });

    it('accepts a blood-pressure value object', () => {
      const vital: VitalSign = {
        code: 'blood-pressure',
        value: { systolic: 120, diastolic: 80 },
        unit: 'mmHg',
        effectiveDateTime: '2024-01-01T09:00:00Z',
      };
      expect((vital.value as { systolic: number }).systolic).toBe(120);
    });
  });

  describe('HealthcareProvider', () => {
    it('can be constructed with required fields', () => {
      const provider: HealthcareProvider = {
        name: 'Dr. Jane Smith',
        role: 'primary-care',
      };
      expect(provider.name).toBe('Dr. Jane Smith');
      expect(provider.role).toBe('primary-care');
    });
  });

  describe('LabResult', () => {
    it('can be constructed with required fields', () => {
      const lab: LabResult = {
        code: {
          system: 'http://loinc.org/rdf/',
          code: '2345-7',
          display: 'Glucose [Mass/volume] in Serum or Plasma',
        },
        value: 95.5,
        unit: 'mg/dL',
        effectiveDateTime: '2024-06-01T08:30:00Z',
      };
      expect(lab.value).toBe(95.5);
      expect(lab.unit).toBe('mg/dL');
    });
  });

  describe('InsurancePolicy', () => {
    it('can be constructed with required fields', () => {
      const policy: InsurancePolicy = {
        type: 'medical',
        insurerName: 'Blue Cross',
        memberId: 'XYZ123456',
        effectiveDate: '2024-01-01',
      };
      expect(policy.insurerName).toBe('Blue Cross');
      expect(policy.memberId).toBe('XYZ123456');
    });
  });
});
