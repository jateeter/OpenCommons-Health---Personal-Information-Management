#!/usr/bin/env node
const appUrl = stripTrailingSlash(process.env.APP_URL ?? process.env.PIM_URL ?? 'http://localhost:8080');
const live = /^true$/i.test(process.env.EPIC_DIAGNOSTICS_LIVE ?? 'false');
const expectedReadiness = (process.env.EPIC_DIAGNOSTICS_EXPECT ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const url = `${appUrl}/api/integrations/epic/diagnostics${live ? '?live=true' : ''}`;

const response = await fetch(url, { headers: { accept: 'application/json' } });
const bodyText = await response.text();
let body;
try {
  body = JSON.parse(bodyText);
} catch {
  fail(`Epic diagnostics did not return JSON from ${url}: ${bodyText}`);
}

if (!response.ok) {
  fail(`Epic diagnostics returned HTTP ${response.status}: ${bodyText}`);
}

const diagnostics = body?.data;
if (!diagnostics || typeof diagnostics !== 'object') {
  fail(`Epic diagnostics response did not include a data object: ${bodyText}`);
}

if (diagnostics.localhostMvp !== true) {
  fail(`Epic diagnostics did not report localhostMvp=true: ${bodyText}`);
}

if (diagnostics.live !== live) {
  fail(`Epic diagnostics live flag was ${JSON.stringify(diagnostics.live)}, expected ${live}: ${bodyText}`);
}

if (expectedReadiness.length > 0 && !expectedReadiness.includes(diagnostics.readiness)) {
  fail(`Epic diagnostics readiness was ${JSON.stringify(diagnostics.readiness)}, expected one of ${expectedReadiness.join(', ')}.`);
}

for (const [name, secret] of secretValues()) {
  if (secret && bodyText.includes(secret)) {
    fail(`Epic diagnostics exposed ${name}; diagnostics must not include secret values.`);
  }
}

const checkSummary = Array.isArray(diagnostics.checks)
  ? diagnostics.checks.map((check) => `${check.name}:${check.status}`).join(', ')
  : 'no checks';

console.log('Epic diagnostics check passed.');
console.log(`  URL: ${url}`);
console.log(`  Mode: ${diagnostics.mode}`);
console.log(`  Readiness: ${diagnostics.readiness}`);
console.log(`  Live discovery: ${diagnostics.live}`);
console.log(`  Checks: ${checkSummary}`);

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function secretValues() {
  return [
    ['EPIC_CLIENT_SECRET', process.env.EPIC_CLIENT_SECRET],
    ['EPIC_GRANT_ENCRYPTION_KEY', process.env.EPIC_GRANT_ENCRYPTION_KEY],
    ['SOLID_CLIENT_SECRET', process.env.SOLID_CLIENT_SECRET],
    ['CSS_ACCOUNT_PASSWORD', process.env.CSS_ACCOUNT_PASSWORD],
  ].filter(([, value]) => typeof value === 'string' && value.length >= 8);
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
