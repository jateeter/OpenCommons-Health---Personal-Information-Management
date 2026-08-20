import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const contract = JSON.parse(read('public/semantic-domain-contract.json'));
const publicApp = read('public/app.js');

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
  'documents',
  'workflow-tasks',
];

const requiredCodingSystems = {
  loinc: 'http://loinc.org',
  rxnorm: 'http://www.nlm.nih.gov/research/umls/rxnorm',
  snomedCt: 'http://snomed.info/id/',
  cvx: 'http://hl7.org/fhir/sid/cvx',
  schemaOrg: 'https://schema.org/',
  administrative: 'https://opencommons.health/ns/admin',
};

const failures = [];

function fail(message) {
  failures.push(message);
}

function requireString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${path} must be a non-empty string`);
}

function requireAppText(text, description) {
  if (!publicApp.includes(text)) fail(`public/app.js must include ${description}: ${text}`);
}

if (contract.contractId !== 'opencommons-health.semantic-domain-contract') {
  fail('contractId must be opencommons-health.semantic-domain-contract');
}
requireString(contract.version, 'version');
requireString(contract.updated, 'updated');
if (!contract.privacyBoundary?.includes('No PHI')) {
  fail('privacyBoundary must explicitly state that PHI is not included');
}

for (const [key, system] of Object.entries(requiredCodingSystems)) {
  if (contract.codingSystems?.[key]?.system !== system) {
    fail(`codingSystems.${key}.system must be ${system}`);
  }
}

const domains = contract.domains;
if (!Array.isArray(domains)) {
  fail('domains must be an array');
} else {
  const keys = domains.map((domain) => domain.key);
  for (const expected of expectedDomains) {
    if (!keys.includes(expected)) fail(`domains must include ${expected}`);
  }
  for (const key of keys) {
    if (!expectedDomains.includes(key)) fail(`domains contains unexpected key ${key}`);
  }
  if (new Set(keys).size !== keys.length) fail('domain keys must be unique');
}

for (const domain of domains || []) {
  requireString(domain.key, `domains.${domain.key}.key`);
  requireString(domain.label, `domains.${domain.key}.label`);
  requireString(domain.plural, `domains.${domain.key}.plural`);
  requireString(domain.fhirResourceType, `domains.${domain.key}.fhirResourceType`);
  if (!Array.isArray(domain.codingSystemRefs) || domain.codingSystemRefs.length === 0) {
    fail(`${domain.key}.codingSystemRefs must be a non-empty array`);
  }
  for (const ref of domain.codingSystemRefs || []) {
    if (!contract.codingSystems?.[ref]) fail(`${domain.key}.codingSystemRefs includes unknown system ${ref}`);
  }
  if (!Array.isArray(domain.elements) || domain.elements.length < 4) {
    fail(`${domain.key}.elements must contain at least four elements`);
  }

  const elementIds = [];
  for (const element of domain.elements || []) {
    elementIds.push(element.id);
    requireString(element.id, `${domain.key}.elements.id`);
    requireString(element.label, `${domain.key}.${element.id}.label`);
    requireString(element.summary, `${domain.key}.${element.id}.summary`);
    requireString(element.fhirElement, `${domain.key}.${element.id}.fhirElement`);
    if (!element.addPrefill || typeof element.addPrefill !== 'object' || Array.isArray(element.addPrefill)) {
      fail(`${domain.key}.${element.id}.addPrefill must be an object`);
    }
    if (element.coding) {
      const codingSystem = contract.codingSystems?.[element.coding.systemRef];
      if (!codingSystem) fail(`${domain.key}.${element.id}.coding.systemRef must refer to a known coding system`);
      requireString(element.coding.code, `${domain.key}.${element.id}.coding.code`);
      requireString(element.coding.display, `${domain.key}.${element.id}.coding.display`);
      requireAppText(element.coding.code, `${domain.key}.${element.id} coding code`);
      requireAppText(element.coding.display, `${domain.key}.${element.id} coding display`);
    }
    for (const ref of element.codingSystemRefs || []) {
      if (!contract.codingSystems?.[ref]) fail(`${domain.key}.${element.id}.codingSystemRefs includes unknown system ${ref}`);
    }

    requireAppText(`id: '${element.id}'`, `${domain.key}.${element.id} semantic id`);
    requireAppText(`label: '${element.label}'`, `${domain.key}.${element.id} label`);
    requireAppText(`summary: '${element.summary}'`, `${domain.key}.${element.id} summary`);
  }
  if (new Set(elementIds).size !== elementIds.length) fail(`${domain.key}.elements ids must be unique`);
}

const vitalSigns = domains?.find((domain) => domain.key === 'vital-signs');
const vitalIds = (vitalSigns?.elements || []).map((element) => element.id);
for (const expected of ['blood-pressure', 'heart-rate', 'body-temperature', 'oxygen-saturation', 'body-weight', 'bmi']) {
  if (!vitalIds.includes(expected)) fail(`vital-signs must include ${expected}`);
}

if (failures.length > 0) {
  console.error('Semantic domain contract validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Semantic domain contract ${contract.version} covers ${domains.length} domains and ${domains.reduce((sum, domain) => sum + domain.elements.length, 0)} semantic elements.`);
