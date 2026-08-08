import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('nine wellness pillar seed bundle', () => {
  const bundle = JSON.parse(readFileSync(join(process.cwd(), 'fixtures', 'wellness-pillar-seeds.json'), 'utf8'));

  const expectedDomains = [
    'profiles',
    'conditions',
    'medications',
    'allergies',
    'immunizations',
    'vital-signs',
    'providers',
    'lab-results',
    'insurance-policies',
  ];

  const getPath = (object: Record<string, any>, dotted: string): any =>
    dotted.split('.').reduce((value, key) => value?.[key], object);

  it('covers exactly the nine core wellness pillars in order', () => {
    expect(bundle.privacy.syntheticOnly).toBe(true);
    expect(bundle.privacy.containsRealPhi).toBe(false);
    expect(bundle.privacy.containsSecrets).toBe(false);
    expect(bundle.pillars.map((pillar: { domain: string }) => pillar.domain)).toEqual(expectedDomains);
    expect(bundle.pillars.map((pillar: { pillar: number }) => pillar.pillar)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('provides modal and saved-record seeds for every pillar', () => {
    for (const pillar of bundle.pillars) {
      expect(pillar.repository).toMatch(/Repository$/);
      expect(pillar.schema).toMatch(/^src\/schemas\/.+\.shex$/);
      expect(pillar.modalSeeds).toBeTruthy();
      expect(pillar.record).toBeTruthy();
    }
  });

  it('aligns coded records with their terminology systems', () => {
    const coded = [
      ['conditions', 'code', 'http://snomed.info/sct'],
      ['medications', 'medicationCode', 'http://www.nlm.nih.gov/research/umls/rxnorm'],
      ['allergies', 'substance', 'http://snomed.info/sct'],
      ['immunizations', 'vaccineCode', 'http://hl7.org/fhir/sid/cvx'],
      ['vital-signs', 'loincCode', 'http://loinc.org'],
      ['lab-results', 'code', 'http://loinc.org'],
    ];

    for (const [domain, field, system] of coded) {
      const pillar = bundle.pillars.find((entry: { domain: string }) => entry.domain === domain);
      const coding = getPath(pillar.record, field);
      expect(coding.system).toBe(system);
      expect(coding.code).toEqual(expect.any(String));
      expect(coding.display).toEqual(expect.any(String));
    }
  });

  it('keeps transient dropdown and terminology-search helpers out of saved records', () => {
    const serializedRecords = JSON.stringify(bundle.pillars.map((pillar: { record: unknown }) => pillar.record));
    for (const transientKey of [
      'snomedChoice',
      'rxnormChoice',
      'cvxChoice',
      'loincChoice',
      'terminologySearch',
    ]) {
      expect(serializedRecords).not.toContain(transientKey);
    }
  });
});
