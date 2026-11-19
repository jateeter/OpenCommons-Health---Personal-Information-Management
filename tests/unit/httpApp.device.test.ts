import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import https, { type Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDeviceRequestHandler, type ApplicationContext, type DomainRepository } from '../../src/httpApp';
import { InMemoryPodActivityLog } from '../../src/podActivity';
import { HealthKitMirrorService, InMemoryMetricRegistryStore } from '../../src/integrations/healthkit';
import { serverOptions, type LaneTlsSettings } from '../../src/laneTls';
import { loadDeviceListenerConfig } from '../../src/runtimeConfig';

// The device listener (PIM#91, owner decision 2026-11-19): what the iPhone
// bridge calls on the LAN, and nothing else. Served here as server.ts serves
// it: TLS 1.3 with a server certificate only, from a throwaway CA made with
// the openssl CLI, and called by a client that trusts only that CA.
const TOKEN = 'bridge-secret';

let dir: string;
let lane: LaneTlsSettings;

function openssl(...args: string[]): void {
  execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'pim-device-'));
  openssl('ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', 'ca.key');
  openssl('req', '-x509', '-new', '-key', 'ca.key', '-subj', '/CN=test device CA', '-days', '1', '-sha384',
    '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign', '-out', 'ca.crt');
  openssl('ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', 'pim.key');
  openssl('req', '-new', '-key', 'pim.key', '-subj', '/CN=pim', '-out', 'pim.csr');
  writeFileSync(join(dir, 'pim.ext'), [
    'basicConstraints=critical,CA:FALSE',
    'keyUsage=critical,digitalSignature',
    'extendedKeyUsage=serverAuth',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ].join('\n'));
  openssl('x509', '-req', '-in', 'pim.csr', '-CA', 'ca.crt', '-CAkey', 'ca.key', '-CAcreateserial',
    '-days', '1', '-sha384', '-extfile', 'pim.ext', '-out', 'pim.crt');
  lane = { cert: join(dir, 'pim.crt'), key: join(dir, 'pim.key'), ca: join(dir, 'ca.crt') };
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface Answer { status: number; allow?: string; body: string }

describe('device listener handler', () => {
  let server: Server;
  let port: number;
  let context: ApplicationContext;
  let vitals: DomainRepository;
  let deviceToken: string | undefined;
  let provided: number;

  beforeEach(async () => {
    const records = [{ url: 'https://pod/vitals/1', type: 'heart-rate', value: 61 }];
    vitals = {
      findAll: jest.fn(async () => records),
      findByUrl: jest.fn(async () => null),
      create: jest.fn(async (entity: never) => entity),
      update: jest.fn(async (entity: never) => entity),
      delete: jest.fn(async () => undefined),
    };
    context = {
      authenticated: true,
      podServerUrl: 'https://solid',
      podBaseUrl: 'https://pod/',
      checkPodAccess: jest.fn(async () => undefined),
      activityLog: new InMemoryPodActivityLog(),
      repositories: { 'vital-signs': vitals },
      healthkit: new HealthKitMirrorService(new InMemoryMetricRegistryStore(), { 'vital-signs': vitals }, () => vitals, { bridgeId: 'b', peScopeUrls: [] }),
      healthkitBridgeToken: TOKEN,
    };
    deviceToken = TOKEN;
    provided = 0;
    server = https.createServer(serverOptions(lane), (req, res) => {
      void createDeviceRequestHandler(async () => { provided += 1; return context; }, deviceToken)(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const call = (path: string, init: { method?: string; token?: string | null } = {}): Promise<Answer> =>
    new Promise((resolve, reject) => {
      const req = https.request({
        host: '127.0.0.1',
        port,
        path,
        method: init.method ?? 'GET',
        ca: readFileSync(lane.ca),
        minVersion: 'TLSv1.3',
        headers: init.token === null ? {} : { authorization: `Bearer ${init.token ?? TOKEN}` },
      }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, allow: res.headers.allow as string | undefined, body }));
      });
      req.on('error', reject);
      req.end();
    });

  it('serves /healthz without a token', async () => {
    const res = await call('/healthz', { token: null });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.podAccess).toBe(true);
    expect(body.podBaseUrl).toBe('https://pod/');
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
    expect(JSON.parse(res.body).data).toHaveLength(1);
  });

  it('only reads records: no write through hydration', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = await call('/api/resources/vital-signs', { method });
      expect(res.status).toBe(405);
      expect(res.allow).toBe('GET');
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

  it('refuses TLS 1.2', async () => {
    await expect(new Promise((resolve, reject) => {
      const req = https.request({ host: '127.0.0.1', port, path: '/healthz', ca: readFileSync(lane.ca), maxVersion: 'TLSv1.2' }, resolve);
      req.on('error', reject);
      req.end();
    })).rejects.toThrow();
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
