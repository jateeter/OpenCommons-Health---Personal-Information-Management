import http, { type Server } from 'node:http';
import { createRequestHandler, type ApplicationContext, type DomainRepository } from '../../src/httpApp';
import { OWNER_APPROVAL_HEADER } from '../../src/privacy';
import { InMemoryPodActivityLog } from '../../src/podActivity';
import { HealthKitMirrorService, InMemoryMetricRegistryStore } from '../../src/integrations/healthkit';

const TOKEN = 'bridge-secret';
const HR = { metric: 'HKQuantityTypeIdentifierHeartRate', kind: 'quantity', unit: '/min', loinc: '8867-4', appleCategory: 'Heart' };

describe('HealthKit mirror routes', () => {
  let server: Server;
  let baseUrl: string;
  let records: Array<Record<string, unknown>>;
  let context: ApplicationContext;

  beforeEach(async () => {
    records = [];
    const vitals: DomainRepository = {
      findAll: jest.fn(async () => records),
      findByUrl: jest.fn(async () => null),
      create: jest.fn(async (entity: never) => {
        const created = { ...(entity as Record<string, unknown>), url: `http://pod/vitals/${records.length + 1}` };
        records.push(created);
        return created;
      }),
      update: jest.fn(async (entity: never) => entity),
      delete: jest.fn(async () => undefined),
    };
    context = {
      authenticated: true,
      podServerUrl: 'http://solid',
      podBaseUrl: 'http://pod/',
      checkPodAccess: jest.fn(async () => undefined),
      activityLog: new InMemoryPodActivityLog(),
      repositories: { 'vital-signs': vitals },
      healthkit: new HealthKitMirrorService(new InMemoryMetricRegistryStore(), { 'vital-signs': vitals }, () => vitals, { bridgeId: 'b', peScopeUrls: [] }),
      healthkitBridgeToken: TOKEN,
    };
    server = http.createServer((req, res) => {
      void createRequestHandler(async () => context, `${process.cwd()}/public`)(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const call = (path: string, init: { method?: string; body?: unknown; owner?: boolean; token?: string | null } = {}) => fetch(`${baseUrl}${path}`, {
    method: init.method ?? 'POST',
    headers: {
      'content-type': 'application/json',
      ...(init.token === null ? {} : { authorization: `Bearer ${init.token ?? TOKEN}` }),
      ...(init.owner ? { [OWNER_APPROVAL_HEADER]: 'true' } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  it('requires the bridge token', async () => {
    expect((await call('/api/integrations/healthkit/metrics', { method: 'GET', token: null })).status).toBe(401);
    expect((await call('/api/integrations/healthkit/metrics', { method: 'GET', token: 'wrong' })).status).toBe(401);
    expect((await call('/api/integrations/healthkit/metrics', { method: 'GET' })).status).toBe(200);
  });

  it('lets the bridge declare without owner approval, but not approve', async () => {
    const declared = await call('/api/integrations/healthkit/metrics', { body: { action: 'declare', descriptors: [HR] } });
    expect(declared.status).toBe(200);
    expect((await declared.json()).data.applied[0].state).toBe('proposed');

    expect((await call('/api/integrations/healthkit/metrics', { body: { action: 'add', metrics: [HR.metric] } })).status).toBe(403);
    const added = await call('/api/integrations/healthkit/metrics', { body: { action: 'add', metrics: [HR.metric] }, owner: true });
    expect(added.status).toBe(200);
    expect((await added.json()).data.generation).toBe(1);
  });

  it('previews without approval; apply needs the owner-approval header per batch', async () => {
    await call('/api/integrations/healthkit/metrics', { body: { action: 'declare', descriptors: [HR] } });
    await call('/api/integrations/healthkit/metrics', { body: { action: 'add', metrics: [HR.metric] }, owner: true });
    const batch = { generation: 1, samples: [{ uuid: 's-1', metric: HR.metric, startDate: '2026-09-25T08:00:00Z', value: 62 }] };

    const preview = await call('/api/integrations/healthkit/sync/preview', { body: batch });
    expect(preview.status).toBe(200);
    expect((await preview.json()).data.summary.create).toBe(1);
    expect(records).toHaveLength(0);

    expect((await call('/api/integrations/healthkit/sync/apply', { body: batch })).status).toBe(403);
    expect(records).toHaveLength(0);

    const applied = await call('/api/integrations/healthkit/sync/apply', { body: batch, owner: true });
    expect(applied.status).toBe(200);
    expect((await applied.json()).data.applied).toBe(1);
    expect(records).toHaveLength(1);
  });

  it('answers a stale generation with 409', async () => {
    await call('/api/integrations/healthkit/metrics', { body: { action: 'declare', descriptors: [HR] } });
    await call('/api/integrations/healthkit/metrics', { body: { action: 'add', metrics: [HR.metric] }, owner: true });
    const stale = await call('/api/integrations/healthkit/sync/preview', { body: { generation: 0, samples: [] } });
    expect(stale.status).toBe(409);
  });

  it('reports the mirror on the HealthKit status surface: counts, not values', async () => {
    await call('/api/integrations/healthkit/metrics', { body: { action: 'declare', descriptors: [HR] } });
    await call('/api/integrations/healthkit/metrics', { body: { action: 'add', metrics: [HR.metric] }, owner: true });
    await call('/api/integrations/healthkit/sync/apply', { body: { samples: [{ uuid: 's-1', metric: HR.metric, startDate: '2026-09-25T08:00:00Z', value: 62 }] }, owner: true });
    const status = await (await fetch(`${baseUrl}/api/pod/healthkit/status`)).json();
    expect(status.data).toMatchObject({ observationCount: 1, pillars: { 'vital-signs': 1 }, metrics: { generation: 1, active: 1 } });
    expect(JSON.stringify(status)).not.toContain('"value"');
  });

  it('404s an unknown HealthKit route', async () => {
    expect((await call('/api/integrations/healthkit/nope', { body: {} })).status).toBe(404);
  });
});
