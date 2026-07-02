/**
 * Namespace and RDF utility helpers for the OpenCommons Health PIM.
 *
 * Provides namespaces, Turtle serialisation helpers, and URI builders used
 * when reading/writing health data to a Solid pod.
 */

// ─── Namespace prefixes ──────────────────────────────────────────────────────

export const NS = {
  schema: 'https://schema.org/',
  health: 'https://opencommons.health/ns/health#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  loinc: 'http://loinc.org/rdf/',
  snomed: 'http://snomed.info/id/',
  rxnorm: 'http://www.nlm.nih.gov/research/umls/rxnorm/',
  cvx: 'https://www2.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx#',
} as const;

/** Helper to build a full URI from a namespace and local name. */
export function uri(namespace: keyof typeof NS, local: string): string {
  return `${NS[namespace]}${local}`;
}

// ─── Pod container paths ──────────────────────────────────────────────────────

/** Returns the pod-relative container path for a given health resource type. */
export function containerPath(typeName: string): string {
  return typeName.toLowerCase() + 's/';
}

/**
 * Returns the absolute pod URL for a resource container.
 *
 * @param podBaseUrl - Base URL of the user's pod (e.g. http://localhost:3000/alice/).
 * @param podPath    - Relative path within the pod (e.g. /health-pim/).
 * @param typeName   - Resource type name (e.g. "MedicalCondition").
 */
export function containerUrl(
  podBaseUrl: string,
  podPath: string,
  typeName: string,
): string {
  const base = podBaseUrl.endsWith('/') ? podBaseUrl : `${podBaseUrl}/`;
  const relative = podPath.startsWith('/') ? podPath.slice(1) : podPath;
  const path = relative.endsWith('/') ? relative : `${relative}/`;
  return `${base}${path}${containerPath(typeName)}`;
}

/**
 * Returns a deterministic resource URL for a new document under a container.
 * Uses a timestamp-based slug to avoid collisions.
 */
export function newResourceUrl(containerUrl: string, prefix: string): string {
  const base = containerUrl.endsWith('/') ? containerUrl : `${containerUrl}/`;
  const slug = `${prefix}-${Date.now()}`;
  return `${base}${slug}`;
}

// ─── Turtle helpers ──────────────────────────────────────────────────────────

/** Wraps a string value in Turtle double-quotes, escaping internal quotes. */
export function turtleString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Formats a value as a typed Turtle literal. */
export function turtleLiteral(value: string, datatype: string): string {
  return `${turtleString(value)}^^<${datatype}>`;
}

/** Returns the standard Turtle prefix block used in all pod documents. */
export function turtlePrefixes(): string {
  return Object.entries(NS)
    .map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .`)
    .join('\n');
}

// ─── Date/time helpers ───────────────────────────────────────────────────────

/** Returns the current UTC datetime as an ISO-8601 string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Returns the current UTC date as YYYY-MM-DD. */
export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}
