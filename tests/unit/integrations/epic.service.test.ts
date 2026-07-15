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
      patientId: 'epic-patient-mock-001',
      grantedScopes: config.scopes,
    });
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

    expect(preview.patientId).toBe('epic-patient-mock-001');
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
    });
    expect(diagnostics.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'epic-enabled', status: 'ok' }),
      expect.objectContaining({ name: 'smart-discovery', status: 'skipped' }),
    ]));
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

    const result = await service.apply({ domains: ['conditions'] });

    expect(result.created.conditions).toBe(0);
    expect(conditionRepository.create).not.toHaveBeenCalled();
    expect(conditionRepository.update).not.toHaveBeenCalled();
  });

  it('uses live SMART token exchange in sandbox mode and stores only encrypted grant material publicly', async () => {
    const sandboxConfig = {
      enabled: true,
      mode: 'sandbox' as const,
      fhirBaseUrl: 'https://epic.example.test/FHIR/R4',
      clientId: 'smart-client-id',
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
      patientId: 'live-patient-id',
      grantedScopes: ['openid', 'fhirUser', 'patient/Patient.rs'],
    });
    expect(JSON.stringify(status)).not.toContain('live-access-token');
    expect(JSON.stringify(status)).not.toContain('live-refresh-token');
    expect(repository.record?.encryptedGrant).toBeDefined();
  });

  it('can run optional live SMART discovery diagnostics without token exchange', async () => {
    const sandboxConfig = {
      enabled: true,
      mode: 'sandbox' as const,
      fhirBaseUrl: 'https://epic.example.test/FHIR/R4',
      clientId: 'smart-client-id',
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
      throw new Error(`Unexpected URL ${url}`);
    });
    const service = new EpicIntegrationService(sandboxConfig, new FakeEpicRepository() as never, {}, fetchMock as never);

    const diagnostics = await service.diagnostics({ live: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(diagnostics).toMatchObject({
      enabled: true,
      mode: 'sandbox',
      readiness: 'ready',
      live: true,
      localhostMvp: true,
    });
    expect(diagnostics.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'smart-discovery', status: 'ok' }),
      expect.objectContaining({ name: 'authorization-endpoint', status: 'ok' }),
      expect.objectContaining({ name: 'token-endpoint', status: 'ok' }),
      expect.objectContaining({ name: 'scope-support', status: 'ok' }),
    ]));
    expect(JSON.stringify(diagnostics)).not.toContain('unit-test-epic-grant-key');
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
