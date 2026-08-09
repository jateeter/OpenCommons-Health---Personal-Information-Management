#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const contractFiles = [
  'docs/contracts/mvp-surface-contract.schema.json',
  'docs/contracts/domain-records.schema.json',
  'docs/contracts/owner-mediated-workflows.schema.json',
];

const requiredTerms = {
  'docs/DEFINITIVE_MVP_DOCUMENTATION_CORPUS.md': [
    'Current MVP truth',
    'Definitive contracts',
    'stale or context-sensitive corpus areas',
    '11 domain APIs',
    'nine wellness pillars',
  ],
  'docs/APPLICATION_PURPOSE_AND_BENEFITS.md': [
    'Why OpenCommons Health PIM exists',
    'What the application provides today',
    'What the application deliberately does not claim yet',
  ],
  'docs/CROSS_REPO_DOCUMENT_INDEX.md': [
    'DEFINITIVE_MVP_DOCUMENTATION_CORPUS.md',
    'APPLICATION_PURPOSE_AND_BENEFITS.md',
    'mvp-surface-contract.schema.json',
    'domain-records.schema.json',
    'owner-mediated-workflows.schema.json',
  ],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const file of contractFiles) {
  const schema = JSON.parse(readFileSync(file, 'utf8'));
  assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', `${file} must use JSON Schema 2020-12`);
  assert(typeof schema.$id === 'string' && schema.$id.startsWith('https://opencommons.health/contracts/'), `${file} missing OpenCommons contract id`);
  assert(typeof schema.title === 'string' && schema.title.length > 0, `${file} missing title`);
}

for (const [file, terms] of Object.entries(requiredTerms)) {
  const source = readFileSync(file, 'utf8');
  for (const term of terms) {
    assert(source.includes(term), `${file} missing required documentation term: ${term}`);
  }
}

console.log(`Validated ${contractFiles.length} documentation contract schemas and ${Object.keys(requiredTerms).length} corpus documents.`);
