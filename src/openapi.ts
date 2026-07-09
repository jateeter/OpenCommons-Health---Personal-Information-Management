type JsonSchema = Record<string, unknown>;

interface DomainApiDefinition {
  title: string;
  description: string;
  schema: JsonSchema;
  example: Record<string, unknown>;
}

export const DOMAIN_API_DEFINITIONS: Record<string, DomainApiDefinition> = {
  profiles: {
    title: 'PersonProfile',
    description: 'Identity and demographic information held in the local Solid pod.',
    schema: objectSchema(['name', 'birthDate', 'biologicalSex'], {
      url: resourceUrl(),
      name: objectSchema(['family', 'given'], {
        family: string('Family name'),
        given: { type: 'array', items: string('Given name') },
        prefix: string('Name prefix'),
        suffix: string('Name suffix'),
      }),
      birthDate: date(),
      biologicalSex: enumSchema(['male', 'female', 'other', 'unknown']),
      photo: uri('Photo URL'),
      createdAt: dateTime(),
      updatedAt: dateTime(),
    }),
    example: {
      name: { family: 'Example', given: ['Alex'] },
      birthDate: '1984-05-12',
      biologicalSex: 'unknown',
    },
  },
  conditions: {
    title: 'MedicalCondition',
    description: 'Diagnoses, active conditions, and resolved health concerns.',
    schema: objectSchema(['code', 'status'], {
      url: resourceUrl(),
      code: coding('SNOMED CT condition code'),
      status: enumSchema(['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved']),
      severity: enumSchema(['mild', 'moderate', 'severe']),
      onsetDate: date(),
      abatementDate: date(),
      notes: string('Free-text notes'),
      recordedBy: string('Recorder or source'),
      createdAt: dateTime(),
      updatedAt: dateTime(),
    }),
    example: {
      code: { system: 'http://snomed.info/id/', code: '162864005', display: 'Deployment smoke test' },
      status: 'active',
      notes: 'Created by deployment verification',
    },
  },
  medications: {
    title: 'Medication',
    description: 'Current and historical medications, dosage, and prescriber information.',
    schema: objectSchema(['medicationCode', 'status'], {
      url: resourceUrl(),
      medicationCode: coding('RxNorm medication code'),
      status: enumSchema(['active', 'completed', 'stopped', 'on-hold']),
      dosage: objectSchema([], {
        text: string('Dosage instructions'),
        timing: string('Timing instructions'),
        route: string('Administration route'),
        doseQuantity: objectSchema(['value', 'unit'], {
          value: number('Dose value'),
          unit: string('Dose unit'),
        }),
      }),
      startDate: date(),
      endDate: date(),
      prescriber: string('Prescriber name'),
      reason: string('Medication reason'),
      notes: string('Free-text notes'),
      createdAt: dateTime(),
      updatedAt: dateTime(),
    }),
    example: {
      medicationCode: { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '860975', display: 'Metformin' },
      status: 'active',
      dosage: { text: '500 mg by mouth daily' },
    },
  },
  allergies: {
    title: 'AllergyIntolerance',
    description: 'Allergies and intolerances relevant to care.',
    schema: objectSchema(['substance', 'category', 'status'], {
      url: resourceUrl(),
      substance: coding('Substance code'),
      category: enumSchema(['food', 'medication', 'environment', 'biologic']),
      status: enumSchema(['active', 'inactive', 'resolved']),
      onsetDate: date(),
      notes: string('Free-text notes'),
      createdAt: dateTime(),
      updatedAt: dateTime(),
    }),
    example: {
      substance: { system: 'http://snomed.info/id/', code: '91936005', display: 'Peanut' },
      category: 'food',
      status: 'active',
    },
  },
  immunizations: {
    title: 'Immunization',
    description: 'Vaccination records, dose history, and administration details.',
    schema: objectSchema(['vaccineCode', 'status', 'occurrenceDate'], {
      url: resourceUrl(),
      vaccineCode: coding('CVX vaccine code'),
      status: enumSchema(['completed', 'not-done', 'entered-in-error']),
      occurrenceDate: date(),
      doseNumber: integer('Dose number'),
      seriesDoses: integer('Total series doses'),
      lotNumber: string('Lot number'),
      site: string('Administration site'),
      route: string('Administration route'),
      performer: string('Performer'),
      notes: string('Free-text notes'),
      createdAt: dateTime(),
      updatedAt: dateTime(),
    }),
    example: {
      vaccineCode: { system: 'http://hl7.org/fhir/sid/cvx', code: '207', display: 'COVID-19 vaccine' },
      status: 'completed',
      occurrenceDate: '2026-01-15',
      doseNumber: 1,
    },
  },
  'vital-signs': {
    title: 'VitalSign',
    description: 'Vital sign observations and measurements.',
    schema: objectSchema(['code', 'value', 'unit', 'effectiveDateTime'], {
      url: resourceUrl(),
      code: enumSchema([
        'body-weight',
        'body-height',
        'bmi',
        'blood-pressure',
        'heart-rate',
        'respiratory-rate',
        'body-temperature',
        'oxygen-saturation',
        'blood-glucose',
      ]),
      value: {
        oneOf: [
          number('Scalar measurement value'),
          objectSchema(['systolic', 'diastolic'], {
            systolic: number('Systolic blood pressure'),
            diastolic: number('Diastolic blood pressure'),
          }),
        ],
      },
      unit: string('Measurement unit'),
      effectiveDateTime: dateTime(),
      notes: string('Free-text notes'),
      createdAt: dateTime(),
      updatedAt: dateTime(),
    }),
    example: {
      code: 'heart-rate',
      value: 72,
      unit: 'beats/min',
      effectiveDateTime: '2026-01-15T12:00:00Z',
    },
  },
  providers: {
    title: 'HealthcareProvider',
    description: 'Clinicians, pharmacies, laboratories, and care organizations.',
    schema: objectSchema(['name', 'role'], {
      url: resourceUrl(),
      name: string('Provider name'),
      role: enumSchema(['primary-care', 'specialist', 'emergency', 'pharmacy', 'lab', 'hospital', 'other']),
      specialty: string('Specialty'),
      npi: string('National Provider Identifier'),
      organization: string('Organization'),
      notes: string('Free-text notes'),
      createdAt: dateTime(),
      updatedAt: dateTime(),
    }),
    example: {
      name: 'OpenCommons Clinic',
      role: 'primary-care',
      organization: 'OpenCommons Health',
    },
  },
  'lab-results': {
    title: 'LabResult',
    description: 'Laboratory observations, values, and reference ranges.',
    schema: objectSchema(['code', 'effectiveDateTime'], {
      url: resourceUrl(),
      code: coding('LOINC lab code'),
      value: { oneOf: [number('Numeric result'), string('Text result')] },
      unit: string('Result unit'),
      interpretation: enumSchema(['normal', 'high', 'low', 'critical-high', 'critical-low', 'abnormal']),
      referenceRange: objectSchema([], {
        low: number('Low reference bound'),
        high: number('High reference bound'),
        text: string('Reference range text'),
        unit: string('Reference range unit'),
      }),
      effectiveDateTime: dateTime(),
      performer: string('Performing lab'),
      specimen: string('Specimen'),
      notes: string('Free-text notes'),
      createdAt: dateTime(),
      updatedAt: dateTime(),
    }),
    example: {
      code: { system: 'http://loinc.org', code: '4548-4', display: 'Hemoglobin A1c' },
      value: 5.6,
      unit: '%',
      interpretation: 'normal',
      effectiveDateTime: '2026-01-15T12:00:00Z',
    },
  },
  'insurance-policies': {
    title: 'InsurancePolicy',
    description: 'Health coverage and plan details.',
    schema: objectSchema(['type', 'insurerName', 'memberId', 'effectiveDate'], {
      url: resourceUrl(),
      type: enumSchema(['medical', 'dental', 'vision', 'pharmacy', 'other']),
      insurerName: string('Insurer name'),
      planName: string('Plan name'),
      memberId: string('Member identifier'),
      groupNumber: string('Group number'),
      effectiveDate: date(),
      expirationDate: date(),
      policyHolder: string('Policy holder'),
      notes: string('Free-text notes'),
      createdAt: dateTime(),
      updatedAt: dateTime(),
    }),
    example: {
      type: 'medical',
      insurerName: 'OpenCommons Smoke Plan',
      memberId: 'SMOKE-42',
      effectiveDate: '2026-01-01',
    },
  },
};

export const DOMAIN_NAMES = Object.keys(DOMAIN_API_DEFINITIONS);

export const OPENAPI_DOCUMENT = {
  openapi: '3.1.0',
  info: {
    title: 'OpenCommons Health PIM API',
    version: '0.1.0',
    description: 'Solid-backed local health Personal Information Management API.',
  },
  servers: [
    {
      url: '/',
      description: 'Current local deployment',
    },
  ],
  tags: DOMAIN_NAMES.map((name) => ({
    name,
    description: DOMAIN_API_DEFINITIONS[name].description,
  })),
  paths: {
    '/livez': {
      get: {
        operationId: 'getLiveness',
        summary: 'Process liveness probe',
        responses: okResponse('Liveness status', { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' } } }),
      },
    },
    '/healthz': {
      get: {
        operationId: 'getReadiness',
        summary: 'Authenticated Solid readiness probe',
        responses: statusResponses(),
      },
    },
    '/api/status': {
      get: {
        operationId: 'getApiStatus',
        summary: 'Application and authenticated pod readiness',
        responses: statusResponses(),
      },
    },
    ...domainPaths(),
  },
  components: {
    schemas: {
      ErrorResponse: objectSchema(['error'], {
        error: string('Error message'),
        issues: {
          type: 'array',
          items: objectSchema(['field', 'reason'], {
            field: string('Field path'),
            reason: string('Validation failure reason'),
            value: {},
          }),
        },
      }),
      StatusResponse: objectSchema(['ok', 'service', 'podAccess', 'domains'], {
        ok: { type: 'boolean' },
        service: { type: 'string', example: 'opencommons-health-pim' },
        podServerUrl: uri('Configured Solid server URL'),
        podBaseUrl: uri('Configured Solid pod base URL'),
        podAccess: { type: 'boolean' },
        domains: { type: 'array', items: { type: 'string', enum: DOMAIN_NAMES } },
      }),
      ...Object.fromEntries(
        Object.values(DOMAIN_API_DEFINITIONS).map((definition) => [definition.title, definition.schema]),
      ),
    },
  },
};

function domainPaths(): Record<string, unknown> {
  return Object.fromEntries(DOMAIN_NAMES.map((domain) => {
    const definition = DOMAIN_API_DEFINITIONS[domain];
    const schemaRef = `#/components/schemas/${definition.title}`;
    const resourceResponse = objectSchema(['data'], {
      data: { $ref: schemaRef },
    });
    const listResponse = objectSchema(['data'], {
      data: { type: 'array', items: { $ref: schemaRef } },
    });
    return [`/api/resources/${domain}`, {
      get: {
        tags: [domain],
        operationId: `readOrList${pascal(domain)}`,
        summary: `List ${domain} or read one resource by absolute pod URL`,
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: false,
            description: 'Absolute pod resource URL. Omit to list all resources in the domain.',
            schema: resourceUrl(),
          },
        ],
        responses: {
          '200': {
            description: `A ${domain} resource or list of resources.`,
            content: {
              'application/json': {
                schema: { oneOf: [resourceResponse, listResponse] },
              },
            },
          },
          ...errorResponses(),
        },
      },
      post: {
        tags: [domain],
        operationId: `create${pascal(domain)}`,
        summary: `Create a ${definition.title} resource`,
        requestBody: jsonRequest(schemaRef, definition.example),
        responses: {
          '201': {
            description: 'Created resource.',
            content: { 'application/json': { schema: resourceResponse } },
          },
          ...errorResponses(),
        },
      },
      put: {
        tags: [domain],
        operationId: `update${pascal(domain)}`,
        summary: `Update a ${definition.title} resource`,
        requestBody: jsonRequest(schemaRef, { ...definition.example, url: `http://localhost:3000/alice/health-pim/${definition.title.toLowerCase()}/example.ttl` }),
        responses: {
          '200': {
            description: 'Updated resource.',
            content: { 'application/json': { schema: resourceResponse } },
          },
          ...errorResponses(),
        },
      },
      delete: {
        tags: [domain],
        operationId: `delete${pascal(domain)}`,
        summary: `Delete a ${definition.title} resource`,
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: true,
            description: 'Absolute pod resource URL to delete.',
            schema: resourceUrl(),
          },
        ],
        responses: {
          '204': { description: 'Deleted.' },
          ...errorResponses(),
        },
      },
    }];
  }));
}

function jsonRequest(schemaRef: string, example: Record<string, unknown>): Record<string, unknown> {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: schemaRef },
        example,
      },
    },
  };
}

function statusResponses(): Record<string, unknown> {
  return {
    '200': {
      description: 'The app is authenticated and can access the configured pod.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusResponse' } } },
    },
    '503': {
      description: 'The app is not ready or cannot access the configured pod.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusResponse' } } },
    },
  };
}

function okResponse(description: string, schema: JsonSchema): Record<string, unknown> {
  return {
    '200': {
      description,
      content: { 'application/json': { schema } },
    },
  };
}

function errorResponses(): Record<string, unknown> {
  return {
    '400': { description: 'Invalid request.', content: errorContent() },
    '401': { description: 'The PIM is not authenticated with Solid.', content: errorContent() },
    '404': { description: 'The domain or resource was not found.', content: errorContent() },
    '409': { description: 'Write conflict.', content: errorContent() },
    '502': { description: 'Solid/API dependency failure.', content: errorContent() },
  };
}

function errorContent(): Record<string, unknown> {
  return { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } };
}

function coding(description: string): JsonSchema {
  return objectSchema(['system', 'code'], {
    system: uri(`${description} system URI`),
    code: string(`${description} code`),
    display: string(`${description} display name`),
  });
}

function objectSchema(required: string[], properties: Record<string, unknown>): JsonSchema {
  return {
    type: 'object',
    required,
    additionalProperties: false,
    properties,
  };
}

function string(description: string): JsonSchema {
  return { type: 'string', description };
}

function number(description: string): JsonSchema {
  return { type: 'number', description };
}

function integer(description: string): JsonSchema {
  return { type: 'integer', description };
}

function date(): JsonSchema {
  return { type: 'string', format: 'date' };
}

function dateTime(): JsonSchema {
  return { type: 'string', format: 'date-time' };
}

function uri(description: string): JsonSchema {
  return { type: 'string', format: 'uri', description };
}

function resourceUrl(): JsonSchema {
  return uri('Absolute Solid pod resource URL');
}

function enumSchema(values: string[]): JsonSchema {
  return { type: 'string', enum: values };
}

function pascal(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
