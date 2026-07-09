import { fhirMappingForDomain } from './standards/fhir';

export const OWNER_APPROVAL_HEADER = 'x-opencommons-owner-approved';
export const RELEASE_PURPOSE_HEADER = 'x-opencommons-release-purpose';

const DIRECT_IDENTIFIER_KEYS = new Set([
  'url',
  'name',
  'family',
  'given',
  'prefix',
  'suffix',
  'address',
  'line',
  'city',
  'state',
  'postalCode',
  'country',
  'telecom',
  'photo',
  'notes',
  'recordedBy',
  'prescriber',
  'performer',
  'specimen',
  'npi',
  'organization',
  'insurerName',
  'planName',
  'memberId',
  'groupNumber',
  'policyHolder',
  'createdAt',
  'updatedAt',
  'effectiveDateTime',
  'birthDate',
  'onsetDate',
  'abatementDate',
  'startDate',
  'endDate',
  'occurrenceDate',
  'effectiveDate',
  'expirationDate',
  'lotNumber',
]);

export interface AnonymizedResource {
  domain: string;
  fhirResourceType: string;
  anonymized: true;
  data: Record<string, unknown>;
}

export function anonymizeResource(domain: string, resource: unknown): AnonymizedResource {
  const mapping = fhirMappingForDomain(domain);
  if (!mapping) throw new Error(`Unknown domain for anonymization: ${domain}`);

  const source = isRecord(resource) ? resource : {};
  return {
    domain,
    fhirResourceType: mapping.fhirResourceType,
    anonymized: true,
    data: anonymizedDataFor(domain, source),
  };
}

export function anonymizeResources(domain: string, resources: unknown[]): AnonymizedResource[] {
  return resources.map((resource) => anonymizeResource(domain, resource));
}

export function containsDirectIdentifier(value: unknown): boolean {
  return directIdentifierPaths(value).length > 0;
}

export function directIdentifierPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => directIdentifierPaths(item, `${prefix}[${index}]`));
  }
  if (!isRecord(value)) return [];

  const paths: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (DIRECT_IDENTIFIER_KEYS.has(key)) paths.push(path);
    paths.push(...directIdentifierPaths(child, path));
  }
  return paths;
}

function anonymizedDataFor(domain: string, source: Record<string, unknown>): Record<string, unknown> {
  switch (domain) {
    case 'profiles':
      return compact({
        birthYear: yearFrom(source.birthDate),
        biologicalSex: source.biologicalSex,
      });
    case 'conditions':
      return compact({
        code: source.code,
        status: source.status,
        severity: source.severity,
        onsetYear: yearFrom(source.onsetDate),
        abatementYear: yearFrom(source.abatementDate),
      });
    case 'medications':
      return compact({
        medicationCode: source.medicationCode,
        status: source.status,
        startYear: yearFrom(source.startDate),
        endYear: yearFrom(source.endDate),
      });
    case 'allergies':
      return compact({
        substance: source.substance,
        category: source.category,
        status: source.status,
        onsetYear: yearFrom(source.onsetDate),
      });
    case 'immunizations':
      return compact({
        vaccineCode: source.vaccineCode,
        status: source.status,
        occurrenceYear: yearFrom(source.occurrenceDate),
        doseNumber: source.doseNumber,
        seriesDoses: source.seriesDoses,
      });
    case 'vital-signs':
      return compact({
        code: source.code,
        value: source.value,
        unit: source.unit,
        effectiveYear: yearFrom(source.effectiveDateTime),
      });
    case 'providers':
      return compact({
        role: source.role,
        specialty: source.specialty,
      });
    case 'lab-results':
      return compact({
        code: source.code,
        value: source.value,
        unit: source.unit,
        interpretation: source.interpretation,
        referenceRange: source.referenceRange,
        effectiveYear: yearFrom(source.effectiveDateTime),
      });
    case 'insurance-policies':
      return compact({
        type: source.type,
        effectiveYear: yearFrom(source.effectiveDate),
        expirationYear: yearFrom(source.expirationDate),
      });
    default:
      return {};
  }
}

function yearFrom(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4})/.exec(value);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function compact(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
