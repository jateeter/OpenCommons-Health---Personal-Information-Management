import { loadSchema, loadAllSchemas, SCHEMA_FILES } from '../../src/schemas';

describe('Schema registry', () => {
  describe('SCHEMA_FILES', () => {
    it('contains entries for all expected health resource types', () => {
      const expected = [
        'PersonProfile',
        'MedicalCondition',
        'Medication',
        'AllergyIntolerance',
        'Immunization',
        'VitalSign',
        'HealthcareProvider',
        'LabResult',
        'InsurancePolicy',
      ];
      for (const type of expected) {
        expect(SCHEMA_FILES).toHaveProperty(type);
      }
    });
  });

  describe('loadSchema()', () => {
    it('loads and returns non-empty ShEx text for PersonProfile', () => {
      const schema = loadSchema('PersonProfile');
      expect(typeof schema).toBe('string');
      expect(schema.length).toBeGreaterThan(0);
      expect(schema).toContain('PersonProfileShape');
    });

    it('loads the MedicalCondition schema', () => {
      const schema = loadSchema('MedicalCondition');
      expect(schema).toContain('MedicalConditionShape');
    });

    it('loads the Medication schema', () => {
      const schema = loadSchema('Medication');
      expect(schema).toContain('MedicationShape');
    });

    it('loads the AllergyIntolerance schema', () => {
      const schema = loadSchema('AllergyIntolerance');
      expect(schema).toContain('AllergyIntoleranceShape');
    });

    it('loads the Immunization schema', () => {
      const schema = loadSchema('Immunization');
      expect(schema).toContain('ImmunizationShape');
    });

    it('loads the VitalSign schema', () => {
      const schema = loadSchema('VitalSign');
      expect(schema).toContain('VitalSignShape');
    });

    it('loads the HealthcareProvider schema', () => {
      const schema = loadSchema('HealthcareProvider');
      expect(schema).toContain('HealthcareProviderShape');
    });

    it('loads the LabResult schema', () => {
      const schema = loadSchema('LabResult');
      expect(schema).toContain('LabResultShape');
    });

    it('loads the InsurancePolicy schema', () => {
      const schema = loadSchema('InsurancePolicy');
      expect(schema).toContain('InsurancePolicyShape');
    });

    it('throws for an unknown type', () => {
      expect(() => loadSchema('Unknown')).toThrow(
        'No schema registered for type: Unknown',
      );
    });
  });

  describe('loadAllSchemas()', () => {
    it('returns an object with all registered schemas', () => {
      const all = loadAllSchemas();
      const keys = Object.keys(all);
      expect(keys.length).toBeGreaterThanOrEqual(9);
      for (const key of keys) {
        expect(typeof all[key]).toBe('string');
        expect(all[key].length).toBeGreaterThan(0);
      }
    });
  });
});
