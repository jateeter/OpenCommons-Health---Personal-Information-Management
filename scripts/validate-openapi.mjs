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
}

for (const utilityPath of ['/livez', '/healthz', '/api/status']) {
  if (!OPENAPI_DOCUMENT.paths?.[utilityPath]?.get) {
    throw new Error(`Missing GET ${utilityPath}`);
  }
}

console.log(`OpenAPI contract covers ${domains.length} domains and ${domains.length * expectedMethods.length} domain actions.`);
