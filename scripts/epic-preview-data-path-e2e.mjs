#!/usr/bin/env node
/**
 * Epic preview data-path E2E.
 *
 * Exercises the running localhost app from the outside:
 *   healthz -> live Epic diagnostics -> owner-reviewed preview.
 *
 * The output is intentionally PHI-safe. It reports resource families, readiness,
 * HTTP status, FHIR wrapper type, counts, and sanitized OperationOutcome
 * severity/code classes. It does not print patient identifiers, resource IDs,
 * tokens, authorization codes, raw FHIR payloads, document URLs, or clinical
 * values.
 */

const appUrl = stripTrailingSlash(process.env.APP_URL ?? process.env.PIM_URL ?? 'http://localhost:8080');
const expectedPreviewFamilies = [
  'Patient',
  'Condition',
  'MedicationRequest',
  'MedicationStatement',
  'AllergyIntolerance',
  'Immunization',
  'Observation',
  'DiagnosticReport',
  'Coverage',
  'DocumentReference',
];

const health = await getJson('/healthz');
if (!health.ok || !health.podAccess) {
  fail(`PIM/Solid health is not ready: ok=${health.ok}, podAccess=${health.podAccess}`);
}
if (health.epic?.enabled !== true || health.epic?.status !== 'connected') {
  fail(`Epic is not connected in the running app: ${JSON.stringify({
    enabled: health.epic?.enabled,
    mode: health.epic?.mode,
    status: health.epic?.status,
  })}`);
}

const diagnostics = (await getJson('/api/integrations/epic/diagnostics?live=true')).data;
if (!diagnostics?.resourceSupport) fail('Live Epic diagnostics did not include resourceSupport.');

const preview = (await postJson('/api/integrations/epic/sync/preview', { workflow: 'annual-medicare-wellness' })).data;
if (!preview?.sourceDiagnostics) fail('Epic preview did not include sourceDiagnostics.');

const sourceDiagnostics = preview.sourceDiagnostics.map((item) => ({
  resourceType: item.resourceType,
  operation: item.operation,
  status: item.status,
  httpStatus: item.httpStatus,
  fhirResourceType: item.fhirResourceType,
  entryCount: item.entryCount,
  mappableCount: item.mappableCount,
  outcomeIssues: (item.outcomeIssues ?? []).map((issue) => ({
    severity: issue.severity,
    code: issue.code,
    diagnosticsClass: issue.diagnosticsClass,
  })),
}));

const supported = new Set(
  diagnostics.resourceSupport
    .filter((item) => item.capability === 'supported')
    .map((item) => item.resourceType),
);
const grantedRelevant = new Set(
  (health.epic.grantedScopes ?? [])
    .map((scope) => scope.split('?')[0])
    .filter((scope) => scope.startsWith('patient/'))
    .map((scope) => scope.slice('patient/'.length).split('.')[0]),
);
const previewed = new Set(sourceDiagnostics.map((item) => item.resourceType));
const missingPreviewDiagnostics = expectedPreviewFamilies.filter((resourceType) => !previewed.has(resourceType));
if (missingPreviewDiagnostics.length > 0) {
  fail(`Preview omitted source diagnostics for: ${missingPreviewDiagnostics.join(', ')}`);
}

const comparison = expectedPreviewFamilies.map((resourceType) => {
  const diagnostic = sourceDiagnostics.find((item) => item.resourceType === resourceType);
  return {
    resourceType,
    capabilitySupported: supported.has(resourceType),
    grantedReadScope: grantedRelevant.has(resourceType),
    previewStatus: diagnostic?.status,
    httpStatus: diagnostic?.httpStatus,
    fhirResourceType: diagnostic?.fhirResourceType,
    entryCount: diagnostic?.entryCount,
    mappableCount: diagnostic?.mappableCount,
    outcomeIssueCodes: (diagnostic?.outcomeIssues ?? []).map((issue) => [issue.severity, issue.code].filter(Boolean).join('/')).filter(Boolean),
  };
});

const summary = {
  appUrl,
  podAccess: true,
  epic: {
    mode: health.epic.mode,
    status: health.epic.status,
    requestedScopeCount: health.epic.requestedScopes?.length,
    grantedScopeCount: health.epic.grantedScopes?.length,
    liveReadiness: diagnostics.readiness,
  },
  preview: {
    changeCount: preview.changes?.length ?? 0,
    domains: (preview.changes ?? []).reduce((acc, change) => {
      acc[change.domain] = (acc[change.domain] ?? 0) + 1;
      return acc;
    }, {}),
    byAction: (preview.changes ?? []).reduce((acc, change) => {
      acc[change.action] = (acc[change.action] ?? 0) + 1;
      return acc;
    }, {}),
  },
  comparison,
  recommendedResolutionClasses: resolutionClasses(comparison),
};

const bodyText = JSON.stringify(summary, null, 2);
assertNoSecretEcho(bodyText);
console.log(bodyText);

function resolutionClasses(rows) {
  return rows.reduce((acc, row) => {
    if (!row.grantedReadScope) {
      acc.notGranted.push(row.resourceType);
    } else if (row.httpStatus === 403) {
      acc.authorizationDenied.push(row.resourceType);
    } else if (row.httpStatus === 400) {
      acc.invalidQueryOrSandboxProfile.push(row.resourceType);
    } else if (row.previewStatus === 'empty') {
      acc.emptyOrSuppressed.push(row.resourceType);
    } else if ((row.mappableCount ?? 0) > 0) {
      acc.mapped.push(row.resourceType);
    }
    return acc;
  }, {
    mapped: [],
    notGranted: [],
    authorizationDenied: [],
    invalidQueryOrSandboxProfile: [],
    emptyOrSuppressed: [],
  });
}

async function getJson(path) {
  const response = await fetch(`${appUrl}${path}`, { headers: { accept: 'application/json' } });
  return parseResponse(response, path);
}

async function postJson(path, body) {
  const response = await fetch(`${appUrl}${path}`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse(response, path);
}

async function parseResponse(response, path) {
  const text = await response.text();
  if (!response.ok) fail(`${path} returned HTTP ${response.status}: ${text.slice(0, 500)}`);
  try {
    return JSON.parse(text);
  } catch {
    fail(`${path} did not return JSON: ${text.slice(0, 500)}`);
  }
}

function assertNoSecretEcho(text) {
  for (const [name, value] of secretValues()) {
    if (value && text.includes(value)) fail(`E2E output exposed ${name}.`);
  }
}

function secretValues() {
  return [
    ['EPIC_CLIENT_SECRET', process.env.EPIC_CLIENT_SECRET],
    ['EPIC_CLIENT_ID', process.env.EPIC_CLIENT_ID],
    ['EPIC_GRANT_ENCRYPTION_KEY', process.env.EPIC_GRANT_ENCRYPTION_KEY],
    ['SOLID_CLIENT_SECRET', process.env.SOLID_CLIENT_SECRET],
    ['CSS_ACCOUNT_PASSWORD', process.env.CSS_ACCOUNT_PASSWORD],
  ].filter(([, value]) => typeof value === 'string' && value.length >= 8);
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
