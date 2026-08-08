#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const seedPath = new URL('../fixtures/wellness-pillar-seeds.json', import.meta.url);
const seedBundle = JSON.parse(readFileSync(seedPath, 'utf8'));

const expectedPillars = [
  {
    pillar: 1,
    domain: 'profiles',
    modalFields: ['name.family', 'name.given', 'birthDate', 'biologicalSex', 'photo'],
    recordFields: ['name.family', 'name.given', 'birthDate', 'biologicalSex', 'photo'],
  },
  {
    pillar: 2,
    domain: 'conditions',
    modalFields: ['code.snomedChoice', 'code.terminologySearch', 'code.system', 'code.code', 'code.display', 'status', 'severity', 'onsetDate', 'abatementDate', 'notes'],
    recordFields: ['code.system', 'code.code', 'code.display', 'status', 'severity', 'onsetDate', 'notes'],
    codingFields: { code: 'http://snomed.info/sct' },
    transientFields: ['code.snomedChoice', 'code.terminologySearch'],
  },
  {
    pillar: 3,
    domain: 'medications',
    modalFields: ['medicationCode.rxnormChoice', 'medicationCode.terminologySearch', 'medicationCode.system', 'medicationCode.code', 'medicationCode.display', 'status', 'dosage.text', 'startDate', 'endDate', 'prescriber', 'reason', 'notes'],
    recordFields: ['medicationCode.system', 'medicationCode.code', 'medicationCode.display', 'status', 'dosage.text', 'startDate', 'prescriber', 'reason', 'notes'],
    codingFields: { medicationCode: 'http://www.nlm.nih.gov/research/umls/rxnorm' },
    transientFields: ['medicationCode.rxnormChoice', 'medicationCode.terminologySearch'],
  },
  {
    pillar: 4,
    domain: 'allergies',
    modalFields: ['substance.snomedChoice', 'substance.terminologySearch', 'substance.system', 'substance.code', 'substance.display', 'category', 'status', 'onsetDate', 'notes'],
    recordFields: ['substance.system', 'substance.code', 'substance.display', 'category', 'status', 'onsetDate', 'notes'],
    codingFields: { substance: 'http://snomed.info/sct' },
    transientFields: ['substance.snomedChoice', 'substance.terminologySearch'],
  },
  {
    pillar: 5,
    domain: 'immunizations',
    modalFields: ['vaccineCode.cvxChoice', 'vaccineCode.terminologySearch', 'vaccineCode.system', 'vaccineCode.code', 'vaccineCode.display', 'status', 'occurrenceDate', 'doseNumber', 'lotNumber', 'performer', 'notes'],
    recordFields: ['vaccineCode.system', 'vaccineCode.code', 'vaccineCode.display', 'status', 'occurrenceDate', 'doseNumber', 'lotNumber', 'performer', 'notes'],
    codingFields: { vaccineCode: 'http://hl7.org/fhir/sid/cvx' },
    transientFields: ['vaccineCode.cvxChoice', 'vaccineCode.terminologySearch'],
  },
  {
    pillar: 6,
    domain: 'vital-signs',
    modalFields: ['code', 'loincCode.terminologySearch', 'loincCode.system', 'loincCode.code', 'loincCode.display', 'value', 'unit', 'effectiveDateTime', 'notes'],
    recordFields: ['code', 'loincCode.system', 'loincCode.code', 'loincCode.display', 'value', 'unit', 'effectiveDateTime', 'notes'],
    codingFields: { loincCode: 'http://loinc.org' },
    transientFields: ['loincCode.terminologySearch'],
  },
  {
    pillar: 7,
    domain: 'providers',
    modalFields: ['name', 'role', 'specialty', 'npi', 'organization', 'notes'],
    recordFields: ['name', 'role', 'specialty', 'npi', 'organization', 'notes'],
  },
  {
    pillar: 8,
    domain: 'lab-results',
    modalFields: ['code.loincChoice', 'code.terminologySearch', 'code.system', 'code.code', 'code.display', 'value', 'unit', 'interpretation', 'effectiveDateTime', 'performer', 'notes'],
    recordFields: ['code.system', 'code.code', 'code.display', 'value', 'unit', 'interpretation', 'effectiveDateTime', 'performer', 'notes'],
    codingFields: { code: 'http://loinc.org' },
    transientFields: ['code.loincChoice', 'code.terminologySearch'],
  },
  {
    pillar: 9,
    domain: 'insurance-policies',
    modalFields: ['type', 'insurerName', 'planName', 'memberId', 'groupNumber', 'effectiveDate', 'expirationDate', 'policyHolder', 'notes'],
    recordFields: ['type', 'insurerName', 'planName', 'memberId', 'groupNumber', 'effectiveDate', 'expirationDate', 'policyHolder', 'notes'],
  },
];

function getPath(object, dotted) {
  return dotted.split('.').reduce((value, key) => value?.[key], object);
}

function hasFlatPath(object, dotted) {
  return Object.prototype.hasOwnProperty.call(object, dotted);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertModalField(pillar, field) {
  assert(hasFlatPath(pillar.modalSeeds, field), `${pillar.domain} modalSeeds missing ${field}`);
}

function assertRecordField(pillar, field) {
  const value = getPath(pillar.record, field);
  assert(value !== undefined && value !== '', `${pillar.domain} record missing ${field}`);
}

function assertNoTransientRecordField(pillar, field) {
  assert(getPath(pillar.record, field) === undefined, `${pillar.domain} record must not persist transient ${field}`);
}

export function validateWellnessPillarSeeds(bundle = seedBundle) {
  assert(bundle.privacy?.syntheticOnly === true, 'seed bundle must be marked syntheticOnly');
  assert(bundle.privacy?.containsRealPhi === false, 'seed bundle must be marked containsRealPhi=false');
  assert(Array.isArray(bundle.pillars), 'seed bundle must include pillars[]');
  assert(bundle.pillars.length === expectedPillars.length, `expected ${expectedPillars.length} seed pillars`);

  const domains = new Set(bundle.pillars.map((pillar) => pillar.domain));
  for (const expected of expectedPillars) {
    assert(domains.has(expected.domain), `missing seed pillar ${expected.domain}`);
    const pillar = bundle.pillars.find((candidate) => candidate.domain === expected.domain);
    assert(pillar.pillar === expected.pillar, `${expected.domain} must be pillar ${expected.pillar}`);
    assert(pillar.repository && pillar.repository.endsWith('Repository'), `${expected.domain} missing repository`);
    assert(pillar.schema?.endsWith('.shex'), `${expected.domain} missing ShEx schema`);
    assert(pillar.modalSeeds && typeof pillar.modalSeeds === 'object', `${expected.domain} missing modalSeeds`);
    assert(pillar.record && typeof pillar.record === 'object', `${expected.domain} missing record`);

    for (const field of expected.modalFields) assertModalField(pillar, field);
    for (const field of expected.recordFields) assertRecordField(pillar, field);
    for (const field of expected.transientFields || []) assertNoTransientRecordField(pillar, field);

    for (const [field, system] of Object.entries(expected.codingFields || {})) {
      const coding = getPath(pillar.record, field);
      assert(coding?.system === system, `${expected.domain} ${field}.system must be ${system}`);
      assert(typeof coding.code === 'string' && coding.code.length > 0, `${expected.domain} ${field}.code is required`);
      assert(typeof coding.display === 'string' && coding.display.length > 0, `${expected.domain} ${field}.display is required`);
    }
  }

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateWellnessPillarSeeds();
  console.log(`Validated ${seedBundle.pillars.length} wellness pillar seed records.`);
}
