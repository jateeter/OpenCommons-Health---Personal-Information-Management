import { DOMAIN_NAMES } from '../openapi';

type JsonSchema = Record<string, unknown>;

export const FHIR_VERSION = '5.0.0';
export const FHIR_BASE_URL = 'https://hl7.org/fhir';

export interface FhirDomainMapping {
  domain: string;
  fhirResourceType: string;
  fhirProfile: string;
  description: string;
  terminologySystems: string[];
  ownerHeldDirectIdentifiers: string[];
  anonymizedReleaseFields: string[];
}

export const FHIR_DOMAIN_MAPPINGS: Record<string, FhirDomainMapping> = {
  profiles: {
    domain: 'profiles',
    fhirResourceType: 'Patient',
    fhirProfile: `${FHIR_BASE_URL}/patient.html`,
    description: 'FHIR Patient demographics mapped from the pod owner profile.',
    terminologySystems: ['AdministrativeGender'],
    ownerHeldDirectIdentifiers: ['name', 'birthDate', 'address', 'telecom', 'photo'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'birthYear', 'biologicalSex'],
  },
  conditions: {
    domain: 'conditions',
    fhirResourceType: 'Condition',
    fhirProfile: `${FHIR_BASE_URL}/condition.html`,
    description: 'FHIR Condition equivalent for diagnoses and problem-list items.',
    terminologySystems: ['SNOMED CT'],
    ownerHeldDirectIdentifiers: ['url', 'notes', 'recordedBy'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'code', 'status', 'severity', 'onsetYear', 'abatementYear'],
  },
  medications: {
    domain: 'medications',
    fhirResourceType: 'MedicationStatement',
    fhirProfile: `${FHIR_BASE_URL}/medicationstatement.html`,
    description: 'FHIR MedicationStatement equivalent for medications taken by the patient.',
    terminologySystems: ['RxNorm'],
    ownerHeldDirectIdentifiers: ['url', 'prescriber', 'notes'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'medicationCode', 'status', 'startYear', 'endYear'],
  },
  allergies: {
    domain: 'allergies',
    fhirResourceType: 'AllergyIntolerance',
    fhirProfile: `${FHIR_BASE_URL}/allergyintolerance.html`,
    description: 'FHIR AllergyIntolerance equivalent for allergies and intolerances.',
    terminologySystems: ['SNOMED CT'],
    ownerHeldDirectIdentifiers: ['url', 'notes'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'substance', 'category', 'status', 'onsetYear'],
  },
  immunizations: {
    domain: 'immunizations',
    fhirResourceType: 'Immunization',
    fhirProfile: `${FHIR_BASE_URL}/immunization.html`,
    description: 'FHIR Immunization equivalent for vaccine administration records.',
    terminologySystems: ['CVX'],
    ownerHeldDirectIdentifiers: ['url', 'lotNumber', 'performer', 'notes'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'vaccineCode', 'status', 'occurrenceYear', 'doseNumber', 'seriesDoses'],
  },
  'vital-signs': {
    domain: 'vital-signs',
    fhirResourceType: 'Observation',
    fhirProfile: `${FHIR_BASE_URL}/observation-vitalsigns.html`,
    description: 'FHIR Observation/Vital Signs profile equivalent for measurements.',
    terminologySystems: ['LOINC'],
    ownerHeldDirectIdentifiers: ['url', 'notes'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'code', 'value', 'unit', 'effectiveYear'],
  },
  providers: {
    domain: 'providers',
    fhirResourceType: 'PractitionerRole',
    fhirProfile: `${FHIR_BASE_URL}/practitionerrole.html`,
    description: 'FHIR PractitionerRole/Organization reference equivalent for care providers.',
    terminologySystems: [],
    ownerHeldDirectIdentifiers: ['url', 'name', 'npi', 'organization', 'address', 'telecom', 'notes'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'role', 'specialty'],
  },
  'lab-results': {
    domain: 'lab-results',
    fhirResourceType: 'Observation',
    fhirProfile: `${FHIR_BASE_URL}/observation.html`,
    description: 'FHIR Observation equivalent for coded laboratory result values.',
    terminologySystems: ['LOINC'],
    ownerHeldDirectIdentifiers: ['url', 'performer', 'specimen', 'notes'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'code', 'value', 'unit', 'interpretation', 'referenceRange', 'effectiveYear'],
  },
  'insurance-policies': {
    domain: 'insurance-policies',
    fhirResourceType: 'Coverage',
    fhirProfile: `${FHIR_BASE_URL}/coverage.html`,
    description: 'FHIR Coverage equivalent for health insurance and plan coverage details.',
    terminologySystems: [],
    ownerHeldDirectIdentifiers: ['url', 'insurerName', 'planName', 'memberId', 'groupNumber', 'policyHolder', 'telecom', 'notes'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'type', 'effectiveYear', 'expirationYear'],
  },
  documents: {
    domain: 'documents',
    fhirResourceType: 'DocumentReference',
    fhirProfile: `${FHIR_BASE_URL}/documentreference.html`,
    description: 'FHIR DocumentReference equivalent for owner-held clinical document metadata.',
    terminologySystems: ['LOINC', 'SNOMED CT'],
    ownerHeldDirectIdentifiers: ['url', 'title', 'sourceSystem', 'sourceDocumentUrl', 'binaryUrl', 'custodian', 'notes'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'documentType', 'status', 'category', 'authoredYear'],
  },
  'workflow-tasks': {
    domain: 'workflow-tasks',
    fhirResourceType: 'Task',
    fhirProfile: `${FHIR_BASE_URL}/task.html`,
    description: 'FHIR Task equivalent for owner-held workflow, message, and care coordination status metadata.',
    terminologySystems: ['SNOMED CT'],
    ownerHeldDirectIdentifiers: ['url', 'description', 'requester', 'owner', 'relatedDocumentUrl', 'notes'],
    anonymizedReleaseFields: ['domain', 'fhirResourceType', 'taskType', 'status', 'intent', 'authoredYear', 'dueYear'],
  },
};

export const PERSONAL_HEALTH_INFORMATION_SCHEMA: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://opencommons.health/schemas/personal-health-information.schema.json',
  title: 'OpenCommons Personal Health Information Pod Record',
  description: 'FHIR-aligned envelope for identifiable personal health information owned by the authenticated Solid pod owner.',
  type: 'object',
  required: ['owner', 'storage', 'domain', 'fhir', 'data', 'privacy'],
  additionalProperties: false,
  properties: {
    owner: {
      type: 'object',
      required: ['webId', 'authenticationWorkflow'],
      additionalProperties: false,
      properties: {
        webId: { type: 'string', format: 'uri' },
        authenticationWorkflow: { type: 'string', enum: ['Solid-OIDC', 'Solid client credentials'] },
      },
    },
    storage: {
      type: 'object',
      required: ['solidPodResourceUrl', 'solidContainerUrl'],
      additionalProperties: false,
      properties: {
        solidPodResourceUrl: { type: 'string', format: 'uri' },
        solidContainerUrl: { type: 'string', format: 'uri' },
      },
    },
    domain: { type: 'string', enum: DOMAIN_NAMES },
    fhir: {
      type: 'object',
      required: ['version', 'resourceType', 'profile'],
      additionalProperties: false,
      properties: {
        version: { type: 'string', const: FHIR_VERSION },
        resourceType: {
          type: 'string',
          enum: [...new Set(Object.values(FHIR_DOMAIN_MAPPINGS).map((mapping) => mapping.fhirResourceType))],
        },
        profile: { type: 'string', format: 'uri' },
      },
    },
    data: {
      type: 'object',
      description: 'Owner-held identifiable PHI. This object is available only through authenticated owner-controlled pod access.',
    },
    privacy: {
      type: 'object',
      required: ['classification', 'releasePolicy'],
      additionalProperties: false,
      properties: {
        classification: { type: 'string', const: 'patient-sensitive' },
        releasePolicy: {
          type: 'object',
          required: ['identifiableApiRelease', 'anonymizedReleaseRequiresOwnerApproval'],
          additionalProperties: false,
          properties: {
            identifiableApiRelease: { type: 'boolean', const: false },
            anonymizedReleaseRequiresOwnerApproval: { type: 'boolean', const: true },
          },
        },
      },
    },
  },
};

export const ANONYMIZED_HEALTH_INFORMATION_SCHEMA: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://opencommons.health/schemas/anonymized-health-information.schema.json',
  title: 'OpenCommons Anonymized Health Information Release',
  description: 'FHIR-aligned, direct-identifier-free release record approved by the authenticated pod owner.',
  type: 'object',
  required: ['domain', 'fhirResourceType', 'anonymized', 'data'],
  additionalProperties: false,
  properties: {
    domain: { type: 'string', enum: DOMAIN_NAMES },
    fhirResourceType: {
      type: 'string',
      enum: [...new Set(Object.values(FHIR_DOMAIN_MAPPINGS).map((mapping) => mapping.fhirResourceType))],
    },
    anonymized: { type: 'boolean', const: true },
    data: {
      type: 'object',
      description: 'Direct identifiers, URLs, free-text notes, provider identifiers, contact details, and exact dates are removed or generalized.',
    },
  },
};

export const OPENCOMMONS_FHIR_CAPABILITY_STATEMENT = {
  resourceType: 'CapabilityStatement',
  status: 'active',
  kind: 'capability',
  date: '2026-07-09',
  publisher: 'OpenCommons Health',
  fhirVersion: FHIR_VERSION,
  format: ['json', 'ttl'],
  implementationGuide: ['https://opencommons.health/docs/hl7-fhir-solid-pim'],
  rest: [{
    mode: 'server',
    security: {
      service: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
          code: 'OAuth',
          display: 'OAuth',
        }],
      }],
      description: 'Solid-OIDC authenticated owner-controlled pod access. Anonymized release requires explicit owner approval.',
    },
    resource: Object.values(FHIR_DOMAIN_MAPPINGS).map((mapping) => ({
      type: mapping.fhirResourceType,
      profile: mapping.fhirProfile,
      documentation: mapping.description,
      interaction: [
        { code: 'read' },
        { code: 'create' },
        { code: 'update' },
        { code: 'delete' },
        { code: 'search-type' },
      ],
    })),
  }],
} as const;

export function fhirMappingForDomain(domain: string): FhirDomainMapping | undefined {
  return FHIR_DOMAIN_MAPPINGS[domain];
}
