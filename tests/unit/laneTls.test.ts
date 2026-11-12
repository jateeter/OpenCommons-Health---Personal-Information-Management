import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import https from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import tls from 'node:tls';
import { getGlobalDispatcher } from 'undici';
import {
  epicOptions,
  epicTls12Hosts,
  installOutboundLaneTls,
  isInternalHost,
  outboundKind,
  profileOptions,
  laneSettings,
  refusePlaintextInternal,
  serverOptions,
  type LaneTlsSettings,
} from '../../src/laneTls';
import { loadHealthKitRuntimeConfig, loadSolidRuntimeConfig } from '../../src/runtimeConfig';

// A throwaway CA and two leaves (P-384, as the profile issues), made with the
// openssl CLI so the test exercises real handshakes, not mocks.
let dir: string;
let lane: LaneTlsSettings;
let peerCert: string;
let peerKey: string;

function openssl(...args: string[]): void {
  execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
}

function leaf(name: string): void {
  openssl('ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', `${name}.key`);
  openssl('req', '-new', '-key', `${name}.key`, '-subj', `/CN=${name}`, '-out', `${name}.csr`);
  writeFileSync(join(dir, `${name}.ext`), [
    'basicConstraints=critical,CA:FALSE',
    'keyUsage=critical,digitalSignature',
    'extendedKeyUsage=serverAuth,clientAuth',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ].join('\n'));
  openssl('x509', '-req', '-in', `${name}.csr`, '-CA', 'ca.crt', '-CAkey', 'ca.key', '-CAcreateserial',
    '-days', '1', '-sha384', '-extfile', `${name}.ext`, '-out', `${name}.crt`);
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'pim-lane-tls-'));
  openssl('ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', 'ca.key');
  openssl('req', '-x509', '-new', '-key', 'ca.key', '-subj', '/CN=test lane CA', '-days', '1', '-sha384',
    '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign', '-out', 'ca.crt');
  leaf('pim');
  leaf('peer');
  lane = { cert: join(dir, 'pim.crt'), key: join(dir, 'pim.key'), ca: join(dir, 'ca.crt') };
  peerCert = join(dir, 'peer.crt');
  peerKey = join(dir, 'peer.key');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const onLane = (): Record<string, string> => ({ RE_TLS_CERT: lane.cert, RE_TLS_KEY: lane.key, RE_TLS_CA: lane.ca });

describe('lane settings', () => {
  it('is off without RE_TLS_CERT', () => {
    expect(laneSettings({})).toBeUndefined();
  });

  it('refuses a partial configuration rather than starting plaintext', () => {
    expect(() => laneSettings({ RE_TLS_CERT: '/x/cert.pem' })).toThrow(/RE_TLS_KEY and RE_TLS_CA/);
  });

  it('classifies peers by the shared internal rule', () => {
    for (const h of ['localhost', 'css.localhost', '127.0.0.1', '10.1.2.3', '172.20.0.5', '192.168.1.194', '169.254.1.1', '::1', 'fd00::1', 'css', 'pim.local']) {
      expect(isInternalHost(h)).toBe(true);
    }
    for (const h of ['fhir.epic.com', '8.8.8.8', '172.32.0.1', '2001:db8::1', '']) {
      expect(isInternalHost(h)).toBe(false);
    }
  });
});

describe('Epic, the TLS 1.2 deficiency (pim-to-epic, owner 2026-11-12)', () => {
  it('names no host while Epic is off', () => {
    expect(epicTls12Hosts({ EPIC_FHIR_BASE_URL: 'https://fhir.epic.com/api/FHIR/R4' }).size).toBe(0);
  });
  it('names the FHIR base host and any extra hosts when Epic is on', () => {
    const hosts = epicTls12Hosts({
      EPIC_ENABLED: 'true',
      EPIC_FHIR_BASE_URL: 'https://FHIR.epic.com/interconnect/api/FHIR/R4',
      EPIC_TLS12_EXTRA_HOSTS: 'auth.example.org, ',
    });
    expect([...hosts].sort()).toEqual(['auth.example.org', 'fhir.epic.com']);
  });
  it('gives TLS 1.2 to Epic alone; every other external host stays TLS 1.3', () => {
    const hosts = new Set(['fhir.epic.com']);
    expect(outboundKind('fhir.epic.com', hosts)).toBe('epic');
    expect(outboundKind('api.openai.com', hosts)).toBe('external');
    expect(outboundKind('localhost', hosts)).toBe('internal');
    expect(profileOptions().minVersion).toBe('TLSv1.3');
    const epic = epicOptions();
    expect(epic.minVersion).toBe('TLSv1.2');
    expect(String(epic.ciphers).split(':').every((c) => c.startsWith('TLS_') || (c.startsWith('ECDHE-') && /GCM|POLY1305/.test(c)))).toBe(true);
  });
});

describe('plaintext internal URLs on the lane', () => {
  it('are refused for the Solid connection and the PE scope push', () => {
    const env = { ...onLane(), SOLID_POD_SERVER_URL: 'http://localhost:13000', SOLID_POD_BASE_URL: 'https://localhost:13000/alice/', SOLID_CLIENT_ID: 'a', SOLID_CLIENT_SECRET: 'b' };
    expect(() => loadSolidRuntimeConfig(env)).toThrow(/SOLID_POD_SERVER_URL .*every internal link is https/);
    expect(() => loadHealthKitRuntimeConfig({ ...onLane(), HEALTHKIT_PE_SCOPE_URLS: 'https://192.168.1.194:5300,http://192.168.1.194:5600' }))
      .toThrow(/HEALTHKIT_PE_SCOPE_URLS .*every internal link is https/);
  });

  it('are allowed with the lane off, and https or an external host are allowed on it', () => {
    expect(() => refusePlaintextInternal('http://localhost:13000', 'X', {})).not.toThrow();
    expect(() => refusePlaintextInternal('https://localhost:13000', 'X', onLane())).not.toThrow();
    expect(() => refusePlaintextInternal('http://fhir.example.org', 'X', onLane())).not.toThrow();
  });
});

describe('the wire', () => {
  // Stands in for a PE: TLS 1.3 and a client certificate from the lane CA required.
  let peer: https.Server;
  let peerPort: number;
  const seen: Array<{ authorized: boolean; subject?: string; protocol: string | null }> = [];

  beforeAll(async () => {
    peer = https.createServer({
      cert: readFileSync(peerCert),
      key: readFileSync(peerKey),
      ca: readFileSync(lane.ca),
      requestCert: true,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.3',
    }, (req, res) => {
      const socket = req.socket as tls.TLSSocket;
      seen.push({ authorized: socket.authorized, subject: String(socket.getPeerCertificate().subject?.CN ?? ''), protocol: socket.getProtocol() });
      res.end('ok');
    });
    await new Promise<void>((resolve) => peer.listen(0, '127.0.0.1', resolve));
    peerPort = (peer.address() as AddressInfo).port;
    installOutboundLaneTls(lane);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => peer.close(() => resolve()));
  });

  // Jest runs each file in its own VM context, so setGlobalDispatcher lands on the
  // sandbox's global while Node's built-in fetch reads its own; the fetch calls
  // here pass the installed dispatcher explicitly. Outside jest the global one is
  // used (checked against dist/laneTls.js with plain node in PIM#86's PR).
  const viaLane = (init: RequestInit = {}): RequestInit => ({ ...init, dispatcher: getGlobalDispatcher() } as RequestInit);

  it('fetch to an internal peer presents PIM\'s certificate over TLS 1.3 (Solid, the scope push)', async () => {
    const response = await fetch(`https://localhost:${peerPort}/api/integrations/healthkit/scope`, viaLane({ method: 'POST', body: '{}' }));
    expect(response.status).toBe(200);
    expect(seen.at(-1)).toEqual({ authorized: true, subject: 'pim', protocol: 'TLSv1.3' });
  });

  it('node:https to an internal peer does the same (openid-client)', async () => {
    const status = await new Promise<number>((resolve, reject) => {
      https.get(`https://localhost:${peerPort}/.well-known/openid-configuration`, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      }).on('error', reject);
    });
    expect(status).toBe(200);
    expect(seen.at(-1)).toEqual({ authorized: true, subject: 'pim', protocol: 'TLSv1.3' });
  });

  it('fetch refuses plaintext to an internal peer', async () => {
    await expect(fetch(`http://127.0.0.1:${peerPort}/`, viaLane())).rejects.toThrow(/fetch failed/);
    await fetch(`http://127.0.0.1:${peerPort}/`, viaLane()).catch((error: Error & { cause?: Error }) => {
      expect(error.cause?.message).toMatch(/refusing plaintext http:\/\/127\.0\.0\.1: the lane is on/);
    });
  });

  it('the listener serves TLS 1.3 only, without asking for a client certificate', async () => {
    const server = https.createServer(serverOptions(lane), (_req, res) => res.end('ok'));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    const ca = readFileSync(lane.ca);
    try {
      const protocol = await new Promise<string | null>((resolve, reject) => {
        const s = tls.connect({ host: '127.0.0.1', port, servername: 'localhost', ca }, () => { resolve(s.getProtocol()); s.end(); });
        s.on('error', reject);
      });
      expect(protocol).toBe('TLSv1.3');
      await expect(new Promise((resolve, reject) => {
        const s = tls.connect({ host: '127.0.0.1', port, servername: 'localhost', ca, maxVersion: 'TLSv1.2' }, () => { resolve(s.getProtocol()); s.end(); });
        s.on('error', reject);
      })).rejects.toThrow();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
