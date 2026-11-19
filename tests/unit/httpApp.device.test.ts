import http, { type Server } from 'node:http';
import { createDeviceRequestHandler, type ApplicationContext, type DomainRepository } from '../../src/httpApp';
import { InMemoryPodActivityLog } from '../../src/podActivity';
import { HealthKitMirrorService, InMemoryMetricRegistryStore } from '../../src/integrations/healthkit';
import { loadDeviceListenerConfig } from '../../src/runtimeConfig';

// The device listener (PIM#91, owner decision 2026-11-19): what the iPhone
// bridge calls on the LAN, and nothing else. The handler is served over plain
// http here; server.ts gives it lane TLS and refuses to start it without.
const TOKEN = 'bridge-secret';

describe('device listener handler', () => {
  let server: Server;
  let baseUrl: string;
  let context: ApplicationContext;
  let vitals: DomainRepository;
  let deviceToken: string | undefined;
  let provided: number;

  beforeEach(async () => {
    const records = [{ url: 'http://pod/vitals/1', type: 'heart-rate', value: 61 }];
    vitals = {
      findAll: jest.fn(async () => records),
      findByUrl: jest.fn(async () => null),
      create: jest.fn(async (entity: never) => entity),
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
    deviceToken = TOKEN;
    provided = 0;
    server = http.createServer((req, res) => {
      void createDeviceRequestHandler(async () => { provided += 1; return context; }, deviceToken)(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const call = (path: string, init: { method?: string; token?: string | null } = {}) => fetch(`${baseUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: init.token === null ? {} : { authorization: `Bearer ${init.token ?? TOKEN}` },
  });

  it('serves /healthz without a token', async () => {
    const res = await call('/healthz', { token: null });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.podAccess).toBe(true);
    expect(body.podBaseUrl).toBe('http://pod/');
  });

  it('requires the bridge token on the HealthKit mirror routes', async () => {
    expect((await call('/api/integrations/healthkit/metrics', { token: null })).status).toBe(401);
    expect((await call('/api/integrations/healthkit/metrics', { token: 'wrong' })).status).toBe(401);
    expect((await call('/api/integrations/healthkit/metrics')).status).toBe(200);
  });

  it('requires the bridge token on pod hydration, and reads with it', async () => {
    expect((await call('/api/resources/vital-signs', { token: null })).status).toBe(401);
    expect((await call('/api/resources/vital-signs', { token: 'wrong' })).status).toBe(401);
    expect(vitals.findAll).not.toHaveBeenCalled();
    const res = await call('/api/resources/vital-signs');
    expect(res.status).toBe(200);
    expect((await res.json()).data).toHaveLength(1);
  });

  it('only reads records: no write through hydration', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = await call('/api/resources/vital-signs', { method });
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('GET');
    }
    expect(vitals.create).not.toHaveBeenCalled();
    expect(vitals.delete).not.toHaveBeenCalled();
  });

  it('answers 404 for every path off the list, token or not', async () => {
    for (const path of ['/', '/api/pod/activity', '/api/pod/healthkit/status', '/api/anonymized/resources/vital-signs',
      '/api/integrations/epic/status', '/api/wellness/summary', '/openapi.json', '/api/status', '/livez', '/index.html']) {
      expect([path, (await call(path)).status]).toEqual([path, 404]);
      expect([path, (await call(path, { token: null })).status]).toEqual([path, 404]);
    }
  });

  it('refuses every gated route when no bridge token is configured', async () => {
    deviceToken = undefined;
    expect((await call('/api/integrations/healthkit/metrics', { token: null })).status).toBe(401);
    expect((await call('/api/resources/vital-signs', { token: null })).status).toBe(401);
    expect((await call('/api/resources/vital-signs', { token: 'anything' })).status).toBe(401);
    expect(vitals.findAll).not.toHaveBeenCalled();
  });

  it('turns a caller without the token away before the application context is built', async () => {
    expect((await call('/api/resources/vital-signs', { token: null })).status).toBe(401);
    expect((await call('/api/integrations/healthkit/metrics', { token: 'wrong' })).status).toBe(401);
    expect(provided).toBe(0);
  });
});

describe('loadDeviceListenerConfig', () => {
  it('is off unless PIM_DEVICE_PORT is set', () => {
    expect(loadDeviceListenerConfig({})).toBeUndefined();
    expect(loadDeviceListenerConfig({ PIM_DEVICE_PORT: ' ' })).toBeUndefined();
  });

  it('listens on every interface by default, or on PIM_DEVICE_HOST', () => {
    expect(loadDeviceListenerConfig({ PIM_DEVICE_PORT: '8443' })).toEqual({ host: '0.0.0.0', port: 8443 });
    expect(loadDeviceListenerConfig({ PIM_DEVICE_PORT: '8443', PIM_DEVICE_HOST: '192.168.1.4' })).toEqual({ host: '192.168.1.4', port: 8443 });
  });

  it('rejects a port that is not an integer in range', () => {
    for (const raw of ['0', '65536', 'abc', '84a3', '-1']) {
      expect(() => loadDeviceListenerConfig({ PIM_DEVICE_PORT: raw })).toThrow(/PIM_DEVICE_PORT/);
    }
  });
});
