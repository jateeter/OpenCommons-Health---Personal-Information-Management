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
    ]));
    expect(preview.changes.every((change) => change.provenance.sourceSystem === 'epic')).toBe(true);
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
});
