import {
  getDateAll,
  getDatetimeAll,
  getDecimalAll,
  getIntegerAll,
  getStringNoLocaleAll,
  getUrlAll,
  type Thing,
} from '@inrupt/solid-client';
import type { ValidationIssue } from '../errors';
import { NS } from '../utils/rdfUtils';
import { loadSchema } from './index';

interface ShapeConstraint {
  predicate: string;
  required: boolean;
  allowedValues?: string[];
  datatype?: string;
}

interface ParsedSchema {
  prefixes: Record<string, string>;
  constraints: ShapeConstraint[];
}

const parsedCache = new Map<string, ParsedSchema>();

/**
 * Validate a persisted RDF Thing against the top-level ShEx shape registered
 * for its health resource type.
 *
 * This intentionally supports the ShEx subset used by this repository's
 * schemas: required/optional top-level predicates, IRI value sets, and common
 * XML Schema datatypes. It gives production writes a real schema gate without
 * coupling the deployment image to a separate ShEx runtime.
 */
export function validateThingAgainstSchema(typeName: string, thing: Thing): ValidationIssue[] {
  const schema = getParsedSchema(typeName);
  const issues: ValidationIssue[] = [];

  for (const constraint of schema.constraints) {
    const values = valuesFor(thing, constraint.predicate);
    if (constraint.required && values.all.length === 0) {
      issues.push({
        field: constraint.predicate,
        reason: 'required by registered ShEx schema',
      });
      continue;
    }

    if (values.all.length === 0) continue;

    if (constraint.allowedValues) {
      const invalid = values.urls.filter((value) => !constraint.allowedValues?.includes(value));
      if (values.urls.length === 0 || invalid.length > 0) {
        issues.push({
          field: constraint.predicate,
          reason: `must be one of: ${constraint.allowedValues.join(', ')}`,
          value: values.urls.length === 0 ? values.all.map((value) => value.value) : invalid,
        });
      }
    }

    if (constraint.datatype) {
      const invalid = values.all
        .filter((value) => !matchesDatatype(value, constraint.datatype as string))
        .map((value) => value.value);
      if (invalid.length > 0) {
        issues.push({
          field: constraint.predicate,
          reason: `must satisfy ShEx datatype ${constraint.datatype}`,
          value: invalid,
        });
      }
    }
  }

  return issues;
}

function getParsedSchema(typeName: string): ParsedSchema {
  const cached = parsedCache.get(typeName);
  if (cached) return cached;
  const schema = loadSchema(typeName);
  const parsed = parseSchema(typeName, schema);
  parsedCache.set(typeName, parsed);
  return parsed;
}

function parseSchema(typeName: string, schema: string): ParsedSchema {
  const prefixes = parsePrefixes(schema);
  const shapeBody = extractShapeBody(typeName, schema);
  const constraints = splitStatements(shapeBody)
    .map((statement) => parseConstraint(statement, prefixes))
    .filter((constraint): constraint is ShapeConstraint => constraint !== null);
  return { prefixes, constraints };
}

function parsePrefixes(schema: string): Record<string, string> {
  const prefixes: Record<string, string> = {
    rdf: NS.rdf,
  };
  for (const match of schema.matchAll(/^PREFIX\s+([A-Za-z][\w-]*):\s*<([^>]+)>/gm)) {
    prefixes[match[1]] = match[2];
  }
  return prefixes;
}

function extractShapeBody(typeName: string, schema: string): string {
  const marker = `<${typeName}Shape>`;
  const markerIndex = schema.indexOf(marker);
  if (markerIndex < 0) throw new Error(`No ShEx shape registered for type: ${typeName}`);
  const openIndex = schema.indexOf('{', markerIndex);
  if (openIndex < 0) throw new Error(`ShEx shape ${marker} has no opening brace.`);

  let depth = 0;
  for (let index = openIndex; index < schema.length; index += 1) {
    const char = schema[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return schema.slice(openIndex + 1, index);
    }
  }
  throw new Error(`ShEx shape ${marker} has no closing brace.`);
}

function splitStatements(body: string): string[] {
  const withoutComments = body
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean)
    .join(' ');

  const statements: string[] = [];
  let current = '';
  let bracketDepth = 0;
  for (const char of withoutComments) {
    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth -= 1;
    if (char === ';' && bracketDepth === 0) {
      if (current.trim()) statements.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

function parseConstraint(statement: string, prefixes: Record<string, string>): ShapeConstraint | null {
  const [predicateToken] = statement.split(/\s+/, 1);
  if (!predicateToken) return null;

  const predicate = predicateToken === 'a' ? NS.rdf + 'type' : expandName(predicateToken, prefixes);
  const required = !/[?*]\s*$/.test(statement);
  const valueSet = /\[(.*?)\]/s.exec(statement)?.[1];
  const datatypeToken = /\bxsd:([A-Za-z][\w-]*)/.exec(statement)?.[0];

  return {
    predicate,
    required,
    allowedValues: valueSet
      ?.split(/\s+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0 && !value.startsWith('"'))
      .map((value) => expandName(value, prefixes)),
    datatype: datatypeToken,
  };
}

function expandName(value: string, prefixes: Record<string, string>): string {
  if (value.startsWith('<') && value.endsWith('>')) return value.slice(1, -1);
  const [prefix, local] = value.split(':', 2);
  if (!prefix || !local || !prefixes[prefix]) return value;
  return `${prefixes[prefix]}${local}`;
}

type SchemaValue =
  | { kind: 'url'; value: string }
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'date'; value: Date };

function valuesFor(thing: Thing, predicate: string): { all: SchemaValue[]; urls: string[] } {
  const urls = getUrlAll(thing, predicate);
  const all: SchemaValue[] = [
    ...urls.map((value) => ({ kind: 'url' as const, value })),
    ...getStringNoLocaleAll(thing, predicate).map((value) => ({ kind: 'string' as const, value })),
    ...getDecimalAll(thing, predicate).map((value) => ({ kind: 'number' as const, value })),
    ...getIntegerAll(thing, predicate).map((value) => ({ kind: 'number' as const, value })),
    ...getDateAll(thing, predicate).map((value) => ({ kind: 'date' as const, value })),
    ...getDatetimeAll(thing, predicate).map((value) => ({ kind: 'date' as const, value })),
  ];
  return { all, urls };
}

function matchesDatatype(value: SchemaValue, datatype: string): boolean {
  switch (datatype) {
    case 'xsd:string':
      return value.kind === 'string';
    case 'xsd:anyURI':
      return value.kind === 'url' || (value.kind === 'string' && isAbsoluteUrl(value.value));
    case 'xsd:date':
      return value.kind === 'date' || (value.kind === 'string' && isIsoDate(value.value));
    case 'xsd:dateTime':
      return value.kind === 'date' || (value.kind === 'string' && !Number.isNaN(Date.parse(value.value)));
    case 'xsd:decimal':
      return value.kind === 'number';
    case 'xsd:positiveInteger':
      return value.kind === 'number' && Number.isInteger(value.value) && value.value > 0;
    default:
      return true;
  }
}

function isAbsoluteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const [year, month, day] = value.split('-').map(Number);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day;
}
