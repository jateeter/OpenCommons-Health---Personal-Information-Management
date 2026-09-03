import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decryptJson, EpicIntegrationService, type EpicConnectionRecord } from '../../../src/integrations/epic';
import type { DomainRepository } from '../../../src/httpApp';

class FakeEpicRepository {
  record: EpicConnectionRecord | null = null;

  async get(): Promise<EpicConnectionRecord | null> {
    return this.record;
  }

  async save(record: EpicConnectionRecord): Promise<EpicConnectionRecord> {
    this.record = record;
    return record;
  }
}

describe('Epic MVP integration service', () => {
  const config = {
    enabled: true,
    mode: 'mock' as const,
    connectFlow: 'authorization_code' as const,
    clientAuthMethod: 'auto' as const,
    clientAssertionAlgorithm: 'RS384' as const,
    scopes: ['openid', 'fhirUser', 'launch/patient', 'offline_access', 'patient/Condition.rs'],
    encryptionKey: 'unit-test-epic-grant-key',
    syncOnStartup: false,
  };

  it('stores Epic grant material encrypted in the pod-owned connection record and redacts public status', async () => {
    const repository = new FakeEpicRepository();
    const service = new EpicIntegrationService(config, repository as never, {});

    const start = await service.connectStart();
    expect(start.authorizationUrl).toContain('/api/integrations/epic/connect/callback');

    const state = String(start.state);
    const status = await service.connectCallback(new URLSearchParams({ code: 'mock-code', state }));

    expect(status).toMatchObject({
      enabled: true,
      mode: 'mock',
      status: 'connected',
      hasPatientContext: true,
      grantedScopes: config.scopes,
    });
    expect(status).not.toHaveProperty('patientId');
    expect(status).not.toHaveProperty('encryptedGrant');
    expect(JSON.stringify(status)).not.toContain('refresh-token');
    expect(repository.record?.encryptedGrant).toBeDefined();
    expect(repository.record?.encryptedGrant).not.toContain('mock-refresh-token');

    const grant = decryptJson<{ refreshToken: string }>(
      repository.record?.encryptedGrant as string,
      config.encryptionKey,
    );
    expect(grant.refreshToken).toBe('mock-refresh-token');
  });

  it('previews Annual Medicare Wellness FHIR resources across all MVP domains', async () => {
    const repository = new FakeEpicRepository();
    const service = new EpicIntegrationService(config, repository as never, {});
    const start = await service.connectStart();
    await service.connectCallback(new URLSearchParams({ code: 'mock-code', state: String(start.state) }));

    const preview = await service.preview();

    expect(preview.hasPatientContext).toBe(true);
    expect(preview).not.toHaveProperty('patientId');
    expect(new Set(preview.changes.map((change) => change.domain))).toEqual(new Set([
      'profiles',
      'conditions',
      'medications',
      'allergies',
      'immunizations',
      'vital-signs',
      'providers',
      'lab-results',
      'insurance-policies',
      'documents',
      'workflow-tasks',
    ]));
    expect(preview.changes.every((change) => change.provenance.sourceSystem === 'epic')).toBe(true);
    expect(preview.reconciliationSummary).toMatchObject({
      total: preview.changes.length,
      safeToApply: preview.changes.length,
      blocked: 0,
      reviewRequired: false,
      byAction: {
        create: preview.changes.length,
        update: 0,
        unchanged: 0,
        conflict: 0,
      },
    });
  });

  it('reports localhost MVP diagnostics in mock mode without live network checks', async () => {
    const repository = new FakeEpicRepository();
    const service = new EpicIntegrationService(config, repository as never, {});

    const diagnostics = await service.diagnostics();

    expect(diagnostics).toMatchObject({
      enabled: true,
      mode: 'mock',
      readiness: 'ready',
      live: false,
      localhostMvp: true,
      registration: {
        localhostMvp: true,
        mode: 'mock',
        liveDiscoveryReadiness: 'skipped',
        configured: expect.objectContaining({
          grantEncryptionKey: true,
        }),
      },
    });
    expect(diagnostics.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'epic-enabled', status: 'ok' }),
      expect.objectContaining({ name: 'smart-discovery', status: 'skipped' }),
    ]));
    expect(diagnostics.resourceSupport).toEqual(expect.arrayContaining([
      expect.objectContaining({
        resourceType: 'Patient',
        capability: 'not-checked',
      }),
    ]));
    expect(JSON.stringify(diagnostics.safeExport)).not.toContain(config.encryptionKey);
  });

  it('applies selected Epic import candidates through existing domain repositories', async () => {
    const repository = new FakeEpicRepository();
    const saved: Record<string, unknown[]> = {};
    const domainRepository = (domain: string): DomainRepository => ({
      findAll: jest.fn(async () => []),
      findByUrl: jest.fn(async () => null),
      create: jest.fn(async (entity: never) => {
        saved[domain] = [...(saved[domain] ?? []), entity];
        return { ...(entity as Record<string, unknown>), url: `http://pod/${domain}/1` };
      }),
      update: jest.fn(async (entity: never) => entity),
      delete: jest.fn(async () => undefined),
    });
    const service = new EpicIntegrationService(config, repository as never, {
      profiles: domainRepository('profiles'),
      conditions: domainRepository('conditions'),
    });
    const start = await service.connectStart();
    await service.connectCallback(new URLSearchParams({ code: 'mock-code', state: String(start.state) }));

    const result = await service.apply({ domains: ['profiles', 'conditions'] });

    expect(result.created.profiles).toBe(1);
    expect(result.created.conditions).toBe(1);
    expect(result.created.medications).toBe(0);
    expect(saved.profiles).toHaveLength(1);
    expect(saved.conditions).toHaveLength(1);
    expect(repository.record?.lastImportJobId).toBe(result.importJobId);
    expect(repository.record?.audit.some((event) => event.action === 'sync-apply')).toBe(true);
  });

  it('reconciles Epic candidates against existing pod records before apply', async () => {
    const repository = new FakeEpicRepository();
    const existingCondition = {
      url: 'http://pod/conditions/hypertension',
      code: { system: 'http://snomed.info/sct', code: '38341003', display: 'Hypertensive disorder' },
      status: 'inactive',
      severity: 'mild',
      onsetDate: '2026-05-01',
      recordedBy: 'Dr. Ada Care',
    };
    const conditionRepository: DomainRepository = {
      findAll: jest.fn(async () => [existingCondition]),
      findByUrl: jest.fn(async () => existingCondition),
      create: jest.fn(async (entity: never) => entity),
      update: jest.fn(async (entity: never) => entity),
      delete: jest.fn(async () => undefined),
    };
    const service = new EpicIntegrationService(config, repository as never, {
      conditions: conditionRepository,
    });
    const start = await service.connectStart();
    await service.connectCallback(new URLSearchParams({ code: 'mock-code', state: String(start.state) }));

    const preview = await service.preview();
    const condition = preview.changes.find((change) => change.domain === 'conditions');

    expect(condition).toMatchObject({
      action: 'update',
      targetUrl: 'http://pod/conditions/hypertension',
      reconciliation: {
        status: 'changed',
      },
    });
    expect(preview.reconciliationSummary).toMatchObject({
      safeToApply: preview.changes.length,
      blocked: 0,
      reviewRequired: true,
      byAction: expect.objectContaining({ update: 1 }),
      byStatus: expect.objectContaining({ changed: 1 }),
    });

    const result = await service.apply({ domains: ['conditions'] });

    expect(result.created.conditions).toBe(1);
    expect(conditionRepository.create).not.toHaveBeenCalled();
    expect(conditionRepository.update).toHaveBeenCalledWith(expect.objectContaining({
      url: 'http://pod/conditions/hypertension',
      status: 'active',
    }));
  });

  it('marks ambiguous local matches as conflicts and skips them during apply', async () => {
    const repository = new FakeEpicRepository();
    const matchingCondition = {
      code: { system: 'http://snomed.info/sct', code: '38341003', display: 'Hypertensive disorder' },
      status: 'inactive',
    };
    const conditionRepository: DomainRepository = {
      findAll: jest.fn(async () => [
        { ...matchingCondition, url: 'http://pod/conditions/one' },
        { ...matchingCondition, url: 'http://pod/conditions/two' },
      ]),
      findByUrl: jest.fn(async () => null),
      create: jest.fn(async (entity: never) => entity),
      update: jest.fn(async (entity: never) => entity),
      delete: jest.fn(async () => undefined),
    };
    const service = new EpicIntegrationService(config, repository as never, {
      conditions: conditionRepository,
    });
    const start = await service.connectStart();
    await service.connectCallback(new URLSearchParams({ code: 'mock-code', state: String(start.state) }));

    const preview = await service.preview();
    const condition = preview.changes.find((change) => change.domain === 'conditions');

    expect(condition).toMatchObject({
      action: 'conflict',
      reconciliation: {
        status: 'ambiguous',
      },
    });
    expect(preview.reconciliationSummary).toMatchObject({
      blocked: 1,
      reviewRequired: true,
      byAction: expect.objectContaining({ conflict: 1 }),
      byStatus: expect.objectContaining({ ambiguous: 1 }),
    });

    const result = await service.apply({ domains: ['conditions'] });

    expect(result.created.conditions).toBe(0);
    expect(conditionRepository.create).not.toHaveBeenCalled();
    expect(conditionRepository.update).not.toHaveBeenCalled();
  });

  it('uses live SMART token exchange in sandbox mode and stores only encrypted grant material publicly', async () => {
    const sandboxConfig = {
      enabled: true,
      mode: 'sandbox' as const,
      connectFlow: 'authorization_code' as const,
      clientAuthMethod: 'auto' as const,
      fhirBaseUrl: 'https://epic.example.test/FHIR/R4',
      clientId: 'smart-client-id',
      clientAssertionAlgorithm: 'RS384' as const,
      redirectUri: 'http://localhost:8080/api/integrations/epic/connect/callback',
      scopes: ['openid', 'fhirUser', 'launch/patient', 'patient/Patient.rs'],
      encryptionKey: 'unit-test-epic-grant-key',
      syncOnStartup: false,
    };
    const fetchMock = jest.fn(async (url: string) => {
      if (url.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example.test/oauth2/authorize',
          token_endpoint: 'https://epic.example.test/oauth2/token',
        });
      }
      if (url === 'https://epic.example.test/oauth2/token') {
        return jsonResponse({
          access_token: 'live-access-token',
          refresh_token: 'live-refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid fhirUser patient/Patient.rs',
          patient: 'live-patient-id',
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    const repository = new FakeEpicRepository();
    const service = new EpicIntegrationService(sandboxConfig, repository as never, {}, fetchMock as never);

    const start = await service.connectStart();
    expect(String(start.authorizationUrl)).toContain('code_challenge_method=S256');
    expect(repository.record?.encryptedPkceCodeVerifier).toBeDefined();
    expect(JSON.stringify(repository.record)).not.toContain('codeVerifier');
    const status = await service.connectCallback(new URLSearchParams({ code: 'live-code', state: String(start.state) }));

    expect(status).toMatchObject({
      mode: 'sandbox',
      status: 'connected',
      hasPatientContext: true,
      grantedScopes: ['openid', 'fhirUser', 'patient/Patient.rs'],
    });
    expect(status).not.toHaveProperty('patientId');
    expect(JSON.stringify(status)).not.toContain('live-access-token');
    expect(JSON.stringify(status)).not.toContain('live-refresh-token');
    expect(repository.record?.encryptedGrant).toBeDefined();
  });

  it('connects directly with the Epic dynamic JWT bearer grant flow when selected', async () => {
    const sandboxConfig = {
      enabled: true,
      mode: 'sandbox' as const,
      connectFlow: 'dynamic_jwt_bearer' as const,
      clientAuthMethod: 'auto' as const,
      fhirBaseUrl: 'https://epic.example.test/FHIR/R4',
      clientId: 'software-client-id',
      dynamicClientId: 'dynamic-client-id',
      clientAssertionPrivateKey: testPrivateKey(),
      clientAssertionKeyId: 'kid-123',
      clientAssertionAlgorithm: 'RS384' as const,
      redirectUri: 'http://localhost:8080/api/integrations/epic/connect/callback',
      scopes: ['openid', 'fhirUser', 'launch/patient', 'patient/Patient.rs'],
      encryptionKey: 'unit-test-epic-grant-key',
      syncOnStartup: false,
    };
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example.test/oauth2/authorize',
          token_endpoint: 'https://epic.example.test/oauth2/token',
        });
      }
      if (url === 'https://epic.example.test/oauth2/token') {
        const body = new URLSearchParams(String(init?.body));
        expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
        expect(body.get('client_id')).toBe('dynamic-client-id');
        expect(body.get('assertion')).toBeTruthy();
        return jsonResponse({
          access_token: 'dynamic-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid fhirUser patient/Patient.rs',
          patient: 'dynamic-patient-id',
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    const repository = new FakeEpicRepository();
    const service = new EpicIntegrationService(sandboxConfig, repository as never, {}, fetchMock as never);

    const start = await service.connectStart();

    expect(start).toMatchObject({
      connectFlow: 'dynamic_jwt_bearer',
      connected: true,
      status: 'connected',
    });
    expect(repository.record).toMatchObject({
      status: 'connected',
      patientId: 'dynamic-patient-id',
    });
    expect(repository.record?.encryptedGrant).toBeDefined();
    expect(JSON.stringify(repository.record)).not.toContain('dynamic-access-token');
  });

  it('reports PHI-safe dynamic client artifact consistency checks', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'opencommons-epic-artifacts-'));
    const jwksFile = join(directory, 'jwks.json');
    const metadataFile = join(directory, 'metadata.json');
    const registrationRequestFile = join(directory, 'dynamic-client-registration.request.json');
    try {
      writeFileSync(jwksFile, JSON.stringify({
        keys: [{ kty: 'RSA', kid: 'kid-123', alg: 'RS384', n: 'public-modulus-placeholder', e: 'AQAB' }],
      }));
      writeFileSync(metadataFile, JSON.stringify({
        issuerSubject: 'dynamic-client-value-123',
        softwareId: 'software-client-value-123',
        fhirBaseUrl: 'https://epic.example.test/FHIR/R4',
        redirectUri: 'http://localhost:8080/api/integrations/epic/connect/callback',
      }));
      writeFileSync(registrationRequestFile, JSON.stringify({
        software_id: 'software-client-value-123',
        grant_types: ['urn:ietf:params:oauth:grant-type:jwt-bearer'],
        jwks: { keys: [{ kid: 'kid-123' }] },
      }));
      const sandboxConfig = {
        enabled: true,
        mode: 'sandbox' as const,
        connectFlow: 'dynamic_jwt_bearer' as const,
        clientAuthMethod: 'auto' as const,
        fhirBaseUrl: 'https://epic.example.test/FHIR/R4',
        clientId: 'software-client-value-123',
        dynamicClientId: 'dynamic-client-value-123',
        clientAssertionPrivateKey: testPrivateKey(),
        clientAssertionKeyId: 'kid-123',
        clientAssertionAlgorithm: 'RS384' as const,
        dynamicClientPublicJwksFile: jwksFile,
        dynamicClientMetadataFile: metadataFile,
        dynamicClientRegistrationRequestFile: registrationRequestFile,
        redirectUri: 'http://localhost:8080/api/integrations/epic/connect/callback',
        scopes: ['openid', 'fhirUser', 'launch/patient', 'patient/Patient.rs'],
        encryptionKey: 'unit-test-epic-grant-key',
        syncOnStartup: false,
      };
      const service = new EpicIntegrationService(sandboxConfig, new FakeEpicRepository() as never, {});

      const diagnostics = await service.diagnostics();

      expect(diagnostics.checks).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'jwt-bearer-audience', status: 'ok' }),
        expect.objectContaining({ name: 'dynamic-client-jwks-kid', status: 'ok' }),
        expect.objectContaining({ name: 'dynamic-client-jwks-alg', status: 'ok' }),
        expect.objectContaining({ name: 'dynamic-client-metadata-client-id', status: 'ok' }),
        expect.objectContaining({ name: 'dynamic-client-metadata-software-id', status: 'ok' }),
        expect.objectContaining({ name: 'dynamic-client-registration-software-id', status: 'ok' }),
        expect.objectContaining({ name: 'dynamic-client-registration-grant-type', status: 'ok' }),
      ]));
      expect(JSON.stringify(diagnostics)).not.toContain('software-client-value-123');
      expect(JSON.stringify(diagnostics)).not.toContain('dynamic-client-value-123');
      expect(JSON.stringify(diagnostics)).not.toContain('unit-test-epic-grant-key');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('can run optional live SMART discovery diagnostics without token exchange', async () => {
    const sandboxConfig = {
      enabled: true,
      mode: 'sandbox' as const,
      connectFlow: 'authorization_code' as const,
      clientAuthMethod: 'auto' as const,
      fhirBaseUrl: 'https://epic.example.test/FHIR/R4',
      clientId: 'smart-client-id',
      clientAssertionAlgorithm: 'RS384' as const,
      redirectUri: 'http://localhost:8080/api/integrations/epic/connect/callback',
      scopes: ['openid', 'fhirUser', 'launch/patient', 'patient/Patient.rs'],
      encryptionKey: 'unit-test-epic-grant-key',
      syncOnStartup: false,
    };
    const fetchMock = jest.fn(async (url: string) => {
      if (url.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example.test/oauth2/authorize',
          token_endpoint: 'https://epic.example.test/oauth2/token',
          scopes_supported: ['openid', 'fhirUser', 'launch/patient', 'patient/Patient.rs'],
        });
      }
      if (url.endsWith('/metadata')) {
        return jsonResponse({
          resourceType: 'CapabilityStatement',
          rest: [{
            resource: [
              { type: 'Patient' },
            ],
          }],
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    const service = new EpicIntegrationService(sandboxConfig, new FakeEpicRepository() as never, {}, fetchMock as never);

    const diagnostics = await service.diagnostics({ live: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(diagnostics).toMatchObject({
      enabled: true,
      mode: 'sandbox',
      readiness: 'attention',
      live: true,
      localhostMvp: true,
      registration: {
        liveDiscoveryReadiness: 'attention',
        configured: expect.objectContaining({
          fhirBaseUrl: true,
          fhirBaseUrlHost: 'epic.example.test',
          clientId: true,
          redirectUri: true,
          redirectUriHost: 'localhost:8080',
          redirectUriPath: '/api/integrations/epic/connect/callback',
          grantEncryptionKey: true,
        }),
      },
    });
    expect(diagnostics.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'smart-discovery', status: 'ok' }),
      expect.objectContaining({ name: 'authorization-endpoint', status: 'ok' }),
      expect.objectContaining({ name: 'token-endpoint', status: 'ok' }),
      expect.objectContaining({ name: 'scope-support', status: 'ok' }),
      expect.objectContaining({ name: 'fhir-capability-statement', status: 'ok' }),
      expect.objectContaining({ name: 'resource-scope-readiness', status: 'warning' }),
    ]));
    expect(diagnostics.resourceSupport).toEqual(expect.arrayContaining([
      expect.objectContaining({
        resourceType: 'Patient',
        configuredScopePresent: true,
        capability: 'supported',
      }),
      expect.objectContaining({
        resourceType: 'Task',
        configuredScopePresent: false,
        capability: 'unsupported',
      }),
    ]));
    expect(diagnostics.safeExport).toMatchObject({
      localhostMvp: true,
      mode: 'sandbox',
      readiness: 'attention',
      live: true,
    });
    expect(JSON.stringify(diagnostics)).not.toContain('unit-test-epic-grant-key');
    expect(JSON.stringify(diagnostics.safeExport)).not.toContain('smart-client-id');
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function testPrivateKey(): string {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }).privateKey;
}
