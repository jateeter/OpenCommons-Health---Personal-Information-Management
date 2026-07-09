import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { OPENAPI_DOCUMENT, DOMAIN_API_DEFINITIONS } = require('../dist/openapi');

const expectedMethods = ['get', 'post', 'put', 'delete'];
const domains = Object.keys(DOMAIN_API_DEFINITIONS);

if (OPENAPI_DOCUMENT.openapi !== '3.1.0') {
  throw new Error(`Expected OpenAPI 3.1.0, received ${OPENAPI_DOCUMENT.openapi}`);
}

for (const domain of domains) {
  const path = `/api/resources/${domain}`;
  const operations = OPENAPI_DOCUMENT.paths?.[path];
  if (!operations) throw new Error(`Missing OpenAPI path ${path}`);

  for (const method of expectedMethods) {
    if (!operations[method]) throw new Error(`Missing ${method.toUpperCase()} action for ${path}`);
    if (!operations[method].operationId) throw new Error(`Missing operationId for ${method.toUpperCase()} ${path}`);
  }

  const definition = DOMAIN_API_DEFINITIONS[domain];
  if (!OPENAPI_DOCUMENT.components?.schemas?.[definition.title]) {
    throw new Error(`Missing component schema ${definition.title}`);
  }

  const anonymizedPath = `/api/anonymized/resources/${domain}`;
  const anonymized = OPENAPI_DOCUMENT.paths?.[anonymizedPath]?.get;
  if (!anonymized) throw new Error(`Missing anonymized release action for ${anonymizedPath}`);
  const headerNames = new Set((anonymized.parameters ?? []).map((parameter) => parameter.name));
  for (const header of ['x-opencommons-owner-approved', 'x-opencommons-release-purpose']) {
    if (!headerNames.has(header)) throw new Error(`Missing ${header} parameter for ${anonymizedPath}`);
  }
}

for (const utilityPath of ['/livez', '/healthz', '/api/status', '/fhir/metadata', '/api/privacy/schema']) {
  if (!OPENAPI_DOCUMENT.paths?.[utilityPath]?.get) {
    throw new Error(`Missing GET ${utilityPath}`);
  }
}

for (const schema of ['AnonymizedRelease', 'FhirCapabilityStatement']) {
  if (!OPENAPI_DOCUMENT.components?.schemas?.[schema]) {
    throw new Error(`Missing component schema ${schema}`);
  }
}

console.log(`OpenAPI contract covers ${domains.length} domains, ${domains.length * expectedMethods.length} owner actions, and ${domains.length} anonymized release actions.`);
