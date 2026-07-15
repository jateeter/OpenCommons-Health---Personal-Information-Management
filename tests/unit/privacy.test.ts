import {
  anonymizeResource,
  containsDirectIdentifier,
  directIdentifierPaths,
} from '../../src/privacy';
import {
  ANONYMIZED_HEALTH_INFORMATION_SCHEMA,
  FHIR_DOMAIN_MAPPINGS,
  OPENCOMMONS_FHIR_CAPABILITY_STATEMENT,
  PERSONAL_HEALTH_INFORMATION_SCHEMA,
} from '../../src/standards/fhir';
import { DOMAIN_NAMES } from '../../src/openapi';

describe('FHIR/PHI standards and anonymization controls', () => {
  it('maps every OpenCommons domain to a FHIR resource', () => {
    expect(Object.keys(FHIR_DOMAIN_MAPPINGS).sort()).toEqual([...DOMAIN_NAMES].sort());
    for (const domain of DOMAIN_NAMES) {
      const mapping = FHIR_DOMAIN_MAPPINGS[domain];
      expect(mapping.fhirResourceType).toBeTruthy();
      expect(mapping.fhirProfile).toMatch(/^https:\/\/hl7\.org\/fhir\//);
      expect(mapping.anonymizedReleaseFields).toContain('domain');
      expect(mapping.anonymizedReleaseFields).toContain('fhirResourceType');
    }
  });

  it('publishes a CapabilityStatement-style artifact for supported FHIR resources', () => {
    expect(OPENCOMMONS_FHIR_CAPABILITY_STATEMENT.resourceType).toBe('CapabilityStatement');
    expect(OPENCOMMONS_FHIR_CAPABILITY_STATEMENT.fhirVersion).toBe('5.0.0');
    const supported = new Set(
      OPENCOMMONS_FHIR_CAPABILITY_STATEMENT.rest[0].resource.map((resource) => resource.type),
    );
    for (const mapping of Object.values(FHIR_DOMAIN_MAPPINGS)) {
      expect(supported.has(mapping.fhirResourceType)).toBe(true);
    }
  });

  it('declares that identifiable PHI is owner-held and not released through anonymized APIs', () => {
    const identifiableProperties = PERSONAL_HEALTH_INFORMATION_SCHEMA.properties as Record<string, unknown>;
    expect(identifiableProperties.privacy).toBeDefined();
    const privacy = identifiableProperties.privacy as { properties?: Record<string, unknown> };
    const releasePolicy = privacy.properties?.releasePolicy as { properties?: Record<string, { const?: boolean }> };
    expect(releasePolicy.properties?.identifiableApiRelease.const).toBe(false);
    expect(releasePolicy.properties?.anonymizedReleaseRequiresOwnerApproval.const).toBe(true);
    const anonymizedProperties = ANONYMIZED_HEALTH_INFORMATION_SCHEMA.properties as Record<string, unknown>;
    expect(anonymizedProperties.anonymized).toEqual({ type: 'boolean', const: true });
  });

  it('removes direct identifiers from profile release payloads', () => {
    const anonymized = anonymizeResource('profiles', {
      url: 'http://pod/alice/profile',
      name: { family: 'Doe', given: ['Jane'] },
      birthDate: '1980-01-15',
      biologicalSex: 'female',
      address: { line: ['123 Main Street'], postalCode: '12345' },
      telecom: [{ system: 'email', value: 'jane@example.test' }],
      photo: 'http://pod/photo.jpg',
    });

    expect(anonymized).toEqual({
      domain: 'profiles',
      fhirResourceType: 'Patient',
      anonymized: true,
      data: {
        birthYear: 1980,
        biologicalSex: 'female',
      },
    });
    expect(containsDirectIdentifier(anonymized)).toBe(false);
  });

  it('removes direct identifiers from insurance and provider release payloads', () => {
    const insurance = anonymizeResource('insurance-policies', {
      url: 'http://pod/coverage/1',
      type: 'medical',
      insurerName: 'Named Insurer',
      planName: 'Employer Plan',
      memberId: 'MEMBER-123',
      groupNumber: 'GROUP-456',
      policyHolder: 'Jane Doe',
      effectiveDate: '2026-01-01',
      expirationDate: '2026-12-31',
      notes: 'Call Jane at 555-1212',
    });
    const provider = anonymizeResource('providers', {
      url: 'http://pod/provider/1',
      name: 'Dr Named Provider',
      role: 'primary-care',
      specialty: 'family medicine',
      npi: '1234567890',
      organization: 'Named Clinic',
      notes: 'Knows Jane Doe',
    });

    expect(insurance.data).toEqual({ type: 'medical', effectiveYear: 2026, expirationYear: 2026 });
    expect(provider.data).toEqual({ role: 'primary-care', specialty: 'family medicine' });
    expect(directIdentifierPaths([insurance, provider])).toEqual([]);
  });

  it('removes direct identifiers from document and workflow release payloads', () => {
    const document = anonymizeResource('documents', {
      url: 'http://pod/documents/1',
      documentType: { system: 'http://loinc.org', code: '34133-9', display: 'Summary of episode note' },
      status: 'current',
      title: 'Jane Doe Annual Wellness Visit Summary',
      category: { system: 'http://loinc.org', code: 'LP173421-1', display: 'Report' },
      authoredDate: '2026-01-15T12:00:00Z',
      sourceSystem: 'epic',
      sourceDocumentUrl: 'https://epic.example.test/fhir/DocumentReference/123',
      binaryUrl: 'http://pod/private/binary/123',
      custodian: 'Named Hospital',
      notes: 'Contains Jane Doe visit details',
    });
    const workflow = anonymizeResource('workflow-tasks', {
      url: 'http://pod/tasks/1',
      taskType: { system: 'http://snomed.info/id/', code: '386053000', display: 'Evaluation procedure' },
      status: 'requested',
      intent: 'plan',
      description: 'Jane Doe should review preventive plan',
      authoredDate: '2026-01-15T12:00:00Z',
      dueDate: '2026-02-01',
      requester: 'Dr Named Provider',
      owner: 'Jane Doe',
      relatedDocumentUrl: 'http://pod/documents/1',
      notes: 'Private task note',
    });

    expect(document).toEqual({
      domain: 'documents',
      fhirResourceType: 'DocumentReference',
      anonymized: true,
      data: {
        documentType: { system: 'http://loinc.org', code: '34133-9', display: 'Summary of episode note' },
        status: 'current',
        category: { system: 'http://loinc.org', code: 'LP173421-1', display: 'Report' },
        authoredYear: 2026,
      },
    });
    expect(workflow).toEqual({
      domain: 'workflow-tasks',
      fhirResourceType: 'Task',
      anonymized: true,
      data: {
        taskType: { system: 'http://snomed.info/id/', code: '386053000', display: 'Evaluation procedure' },
        status: 'requested',
        intent: 'plan',
        authoredYear: 2026,
        dueYear: 2026,
      },
    });
    expect(directIdentifierPaths([document, workflow])).toEqual([]);
  });
});
