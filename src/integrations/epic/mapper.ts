import type { Coding } from '../../types';
import type { EpicFhirResource, EpicImportCandidate, EpicImportProvenance } from './types';

const MAPPER_VERSION = 'epic-mvp-2026-07';

export function mapEpicResourcesToPim(
  resources: EpicFhirResource[],
  context: {
    fhirBaseUrl: string;
    patientId: string;
    authorizationGrantId?: string;
    importedAt: string;
  },
): EpicImportCandidate[] {
  return resources.flatMap((resource) => {
    const provenance = provenanceFor(resource, context);
    switch (resource.resourceType) {
      case 'Patient':
        return [{
          domain: 'profiles',
          action: 'create',
          display: displayName(resource) || 'Epic patient profile',
          provenance,
          entity: {
            name: {
              family: firstString(resource, ['name', 0, 'family']) || 'Unknown',
              given: asStringArray(firstUnknown(resource, ['name', 0, 'given'])),
            },
            birthDate: firstString(resource, ['birthDate']) || '1900-01-01',
            biologicalSex: normalizeGender(firstString(resource, ['gender'])),
          },
        }];
      case 'Coverage':
        return [{
          domain: 'insurance-policies',
          action: 'create',
          display: firstString(resource, ['class', 0, 'value']) || 'Epic coverage',
          provenance,
          entity: {
            type: 'medical',
            insurerName: firstString(resource, ['payor', 0, 'display']) || 'Epic coverage payer',
            planName: firstString(resource, ['class', 0, 'value']),
            memberId: firstString(resource, ['subscriberId']) || 'unknown',
            effectiveDate: firstString(resource, ['period', 'start']) || context.importedAt.slice(0, 10),
          },
        }];
      case 'Practitioner':
        return [{
          domain: 'providers',
          action: 'create',
          display: displayName(resource) || 'Epic practitioner',
          provenance,
          entity: {
            name: displayName(resource) || 'Epic practitioner',
            role: 'primary-care',
            specialty: firstString(resource, ['qualification', 0, 'code', 'text']),
            npi: firstString(resource, ['identifier', 0, 'value']),
          },
        }];
      case 'Condition': {
        const code = firstCoding(resource, 'code');
        return [{
          domain: 'conditions',
          action: 'create',
          display: code.display || code.code,
          provenance,
          entity: {
            code,
            status: normalizeConditionStatus(firstString(resource, ['clinicalStatus', 'coding', 0, 'code'])),
            severity: normalizeSeverity(firstString(resource, ['severity', 'coding', 0, 'code'])),
            onsetDate: datePart(firstString(resource, ['onsetDateTime'])),
            recordedBy: firstString(resource, ['recorder', 'display']),
            notes: provenanceNote(provenance),
          },
        }];
      }
      case 'MedicationStatement':
      case 'MedicationRequest': {
        const code = firstCoding(resource, resource.resourceType === 'MedicationRequest' ? 'medicationCodeableConcept' : 'medicationCodeableConcept');
        return [{
          domain: 'medications',
          action: 'create',
          display: code.display || code.code,
          provenance,
          entity: {
            medicationCode: code,
            status: normalizeMedicationStatus(firstString(resource, ['status'])),
            dosage: { text: firstString(resource, ['dosage', 0, 'text']) },
            startDate: datePart(firstString(resource, ['effectivePeriod', 'start']) || firstString(resource, ['authoredOn'])),
            prescriber: firstString(resource, ['informationSource', 'display']) || firstString(resource, ['requester', 'display']),
            notes: provenanceNote(provenance),
          },
        }];
      }
      case 'AllergyIntolerance': {
        const code = firstCoding(resource, 'code');
        return [{
          domain: 'allergies',
          action: 'create',
          display: code.display || code.code,
          provenance,
          entity: {
            substance: code,
            category: normalizeAllergyCategory(firstString(resource, ['category', 0])),
            status: normalizeAllergyStatus(firstString(resource, ['clinicalStatus', 'coding', 0, 'code'])),
            notes: provenanceNote(provenance),
          },
        }];
      }
      case 'Immunization': {
        const code = firstCoding(resource, 'vaccineCode');
        return [{
          domain: 'immunizations',
          action: 'create',
          display: code.display || code.code,
          provenance,
          entity: {
            vaccineCode: code,
            status: normalizeImmunizationStatus(firstString(resource, ['status'])),
            occurrenceDate: datePart(firstString(resource, ['occurrenceDateTime'])) || context.importedAt.slice(0, 10),
            doseNumber: firstNumber(resource, ['protocolApplied', 0, 'doseNumberPositiveInt']),
            performer: firstString(resource, ['performer', 0, 'actor', 'display']),
            notes: provenanceNote(provenance),
          },
        }];
      }
      case 'Observation':
        return mapObservation(resource, provenance);
      case 'DocumentReference': {
        const code = firstCoding(resource, 'type');
        return [{
          domain: 'documents',
          action: 'create',
          display: firstString(resource, ['description']) || code.display || code.code,
          provenance,
          entity: {
            documentType: code,
            status: normalizeDocumentStatus(firstString(resource, ['status'])),
            title: firstString(resource, ['description']) || code.display || 'Epic clinical document',
            category: firstCoding(resource, 'category'),
            authoredDate: firstString(resource, ['date']) || firstString(resource, ['content', 0, 'attachment', 'creation']),
            sourceSystem: 'epic',
            sourceDocumentUrl: firstString(resource, ['content', 0, 'attachment', 'url']),
            custodian: firstString(resource, ['custodian', 'display']),
            notes: provenanceNote(provenance),
          },
        }];
      }
      case 'Task': {
        const code = firstCoding(resource, 'code');
        return [{
          domain: 'workflow-tasks',
          action: 'create',
          display: firstString(resource, ['description']) || code.display || code.code,
          provenance,
          entity: {
            taskType: code,
            status: normalizeTaskStatus(firstString(resource, ['status'])),
            intent: normalizeTaskIntent(firstString(resource, ['intent'])),
            description: firstString(resource, ['description']) || code.display || 'Epic workflow task',
            authoredDate: firstString(resource, ['authoredOn']),
            dueDate: datePart(firstString(resource, ['executionPeriod', 'end'])),
            requester: firstString(resource, ['requester', 'display']),
            owner: firstString(resource, ['owner', 'display']),
            notes: provenanceNote(provenance),
          },
        }];
      }
      default:
        return [];
    }
  });
}

function mapObservation(resource: EpicFhirResource, provenance: EpicImportProvenance): EpicImportCandidate[] {
  const code = firstCoding(resource, 'code');
  const category = firstString(resource, ['category', 0, 'coding', 0, 'code']);
  const effectiveDateTime = firstString(resource, ['effectiveDateTime']) || new Date().toISOString();
  const value = firstNumber(resource, ['valueQuantity', 'value']) ?? firstString(resource, ['valueString']) ?? '';
  const unit = firstString(resource, ['valueQuantity', 'unit']);
  if (category === 'vital-signs' || code.code === '39156-5') {
    return [{
      domain: 'vital-signs',
      action: 'create',
      display: code.display || code.code,
      provenance,
      entity: {
        code: code.code === '39156-5' ? 'bmi' : 'body-weight',
        loincCode: code,
        value: typeof value === 'number' ? value : Number.parseFloat(value) || 0,
        unit: unit || '',
        effectiveDateTime,
        notes: provenanceNote(provenance),
      },
    }];
  }

  return [{
    domain: 'lab-results',
    action: 'create',
    display: code.display || code.code,
    provenance,
    entity: {
      code,
      value,
      unit,
      interpretation: normalizeInterpretation(firstString(resource, ['interpretation', 0, 'coding', 0, 'code'])),
      effectiveDateTime,
      performer: firstString(resource, ['performer', 0, 'display']),
      notes: provenanceNote(provenance),
    },
  }];
}

function provenanceFor(
  resource: EpicFhirResource,
  context: { fhirBaseUrl: string; patientId: string; authorizationGrantId?: string; importedAt: string },
): EpicImportProvenance {
  return {
    sourceSystem: 'epic',
    sourceFhirBaseUrl: context.fhirBaseUrl,
    sourcePatientId: context.patientId,
    sourceResourceType: resource.resourceType,
    sourceResourceId: resource.id || 'unknown',
    sourceVersion: resource.meta?.versionId,
    sourceLastUpdated: resource.meta?.lastUpdated,
    importedAt: context.importedAt,
    authorizationGrantId: context.authorizationGrantId,
    mapperVersion: MAPPER_VERSION,
  };
}

function firstCoding(resource: EpicFhirResource, field: string): Coding {
  const coding = firstUnknown(resource, [field, 'coding', 0]) as Record<string, unknown> | undefined;
  return {
    system: typeof coding?.system === 'string' ? coding.system : 'urn:unknown',
    code: typeof coding?.code === 'string' ? coding.code : 'unknown',
    display: typeof coding?.display === 'string' ? coding.display : undefined,
  };
}

function displayName(resource: EpicFhirResource): string | undefined {
  return firstString(resource, ['name', 0, 'text'])
    || [firstString(resource, ['name', 0, 'given', 0]), firstString(resource, ['name', 0, 'family'])]
      .filter(Boolean)
      .join(' ')
    || undefined;
}

function provenanceNote(provenance: EpicImportProvenance): string {
  return `Imported from Epic ${provenance.sourceResourceType}/${provenance.sourceResourceId}`;
}

function datePart(value: string | undefined): string | undefined {
  return value?.slice(0, 10);
}

function firstString(resource: unknown, path: Array<string | number>): string | undefined {
  const value = firstUnknown(resource, path);
  return typeof value === 'string' ? value : undefined;
}

function firstNumber(resource: unknown, path: Array<string | number>): number | undefined {
  const value = firstUnknown(resource, path);
  return typeof value === 'number' ? value : undefined;
}

function firstUnknown(resource: unknown, path: Array<string | number>): unknown {
  let current = resource;
  for (const key of path) {
    if (typeof key === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[key];
    } else {
      if (!current || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }
  }
  return current;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeGender(value: string | undefined): 'male' | 'female' | 'other' | 'unknown' {
  if (value === 'male' || value === 'female' || value === 'other') return value;
  return 'unknown';
}

function normalizeConditionStatus(value: string | undefined): 'active' | 'inactive' | 'resolved' {
  if (value === 'inactive' || value === 'resolved') return value;
  return 'active';
}

function normalizeSeverity(value: string | undefined): 'mild' | 'moderate' | 'severe' | undefined {
  if (value === 'mild' || value === 'moderate' || value === 'severe') return value;
  return undefined;
}

function normalizeDocumentStatus(value: string | undefined): 'current' | 'superseded' | 'entered-in-error' {
  if (value === 'superseded' || value === 'entered-in-error') return value;
  return 'current';
}

function normalizeTaskStatus(value: string | undefined): 'draft' | 'requested' | 'received' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' {
  if (
    value === 'draft'
    || value === 'requested'
    || value === 'received'
    || value === 'accepted'
    || value === 'in-progress'
    || value === 'completed'
    || value === 'cancelled'
  ) return value;
  if (value === 'ready') return 'requested';
  return 'requested';
}

function normalizeTaskIntent(value: string | undefined): 'proposal' | 'plan' | 'order' | 'option' {
  if (value === 'proposal' || value === 'plan' || value === 'order' || value === 'option') return value;
  return 'plan';
}

function normalizeMedicationStatus(value: string | undefined): 'active' | 'completed' | 'stopped' | 'on-hold' {
  if (value === 'completed' || value === 'stopped' || value === 'on-hold') return value;
  return 'active';
}

function normalizeAllergyCategory(value: string | undefined): 'food' | 'medication' | 'environment' | 'biologic' {
  if (value === 'medication' || value === 'environment' || value === 'biologic') return value;
  return 'food';
}

function normalizeAllergyStatus(value: string | undefined): 'active' | 'inactive' | 'resolved' {
  if (value === 'inactive' || value === 'resolved') return value;
  return 'active';
}

function normalizeImmunizationStatus(value: string | undefined): 'completed' | 'not-done' | 'entered-in-error' {
  if (value === 'not-done' || value === 'entered-in-error') return value;
  return 'completed';
}

function normalizeInterpretation(value: string | undefined): 'normal' | 'high' | 'low' | 'abnormal' | undefined {
  if (value === 'H') return 'high';
  if (value === 'L') return 'low';
  if (value === 'A') return 'abnormal';
  if (value === 'N') return 'normal';
  return undefined;
}
