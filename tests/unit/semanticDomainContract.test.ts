import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type SemanticContract = {
  contractId: string;
  version: string;
  privacyBoundary: string;
  codingSystems: Record<string, { name: string; system: string }>;
  domains: Array<{
    key: string;
    label: string;
    plural: string;
    fhirResourceType: string;
    elements: Array<{
      id: string;
      label: string;
      summary: string;
      fhirElement: string;
      coding?: { systemRef: string; code: string; display: string };
      addPrefill: Record<string, unknown>;
    }>;
  }>;
};

describe('semantic graph contract', () => {
  const contract = JSON.parse(
    readFileSync(join(process.cwd(), 'public', 'semantic-domain-contract.json'), 'utf8'),
  ) as SemanticContract;
  const appSource = readFileSync(join(process.cwd(), 'public', 'app.js'), 'utf8');

  it('publishes a PHI-safe versioned contract for mobile parity', () => {
    expect(contract.contractId).toBe('opencommons-health.semantic-domain-contract');
    expect(contract.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(contract.privacyBoundary).toContain('No PHI');
    expect(contract.privacyBoundary).toContain('tokens');
    expect(contract.privacyBoundary).toContain('raw HealthKit samples');
  });

  it('covers all 11 owner-visible PIM domains', () => {
    expect(contract.domains.map((domain) => domain.key)).toEqual([
      'profiles',
      'conditions',
      'medications',
      'allergies',
      'immunizations',
      'vital-signs',
      'providers',
      'lab-results',
      'insurance-policies',
      'documents',
      'workflow-tasks',
    ]);
    for (const domain of contract.domains) {
      expect(domain.label).toBeTruthy();
      expect(domain.plural).toBeTruthy();
      expect(domain.fhirResourceType).toBeTruthy();
      expect(domain.elements.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('includes the terminology systems needed for the MVP domain surfaces', () => {
    expect(contract.codingSystems.loinc.system).toBe('http://loinc.org');
    expect(contract.codingSystems.rxnorm.system).toBe('http://www.nlm.nih.gov/research/umls/rxnorm');
    expect(contract.codingSystems.snomedCt.system).toBe('http://snomed.info/id/');
    expect(contract.codingSystems.cvx.system).toBe('http://hl7.org/fhir/sid/cvx');
    expect(contract.codingSystems.schemaOrg.system).toBe('https://schema.org/');
    expect(contract.codingSystems.administrative.system).toBe('https://opencommons.health/ns/admin');
  });

  it('locks Vitals to the browser clinical Vitals graph required for mobile parity', () => {
    const vitalSigns = contract.domains.find((domain) => domain.key === 'vital-signs');
    expect(vitalSigns?.fhirResourceType).toBe('Observation');
    expect(vitalSigns?.elements.map((element) => element.id)).toEqual([
      'blood-pressure',
      'heart-rate',
      'body-temperature',
      'oxygen-saturation',
      'body-weight',
      'bmi',
    ]);
    expect(vitalSigns?.elements.map((element) => element.coding?.code)).toEqual([
      '85354-9',
      '8867-4',
      '8310-5',
      '59408-5',
      '29463-7',
      '39156-5',
    ]);
  });

  it('keeps the browser semantic graph definitions aligned with the contract', () => {
    for (const domain of contract.domains) {
      expect(appSource).toContain(`${domain.key === 'workflow-tasks' || domain.key.includes('-') ? `'${domain.key}'` : domain.key}: [`);
      for (const element of domain.elements) {
        expect(appSource).toContain(`id: '${element.id}'`);
        expect(appSource).toContain(`label: '${element.label}'`);
        expect(appSource).toContain(`summary: '${element.summary}'`);
        if (element.coding) {
          expect(contract.codingSystems[element.coding.systemRef]).toBeDefined();
          expect(appSource).toContain(element.coding.code);
          expect(appSource).toContain(element.coding.display);
        }
        expect(element.addPrefill).toBeDefined();
      }
    }
  });
});
