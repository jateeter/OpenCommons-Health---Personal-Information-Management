// Lane TLS for PIM (OpenCommons-Health PIM#86, RealityEngine_CI#668).
//
// The runtime contract is RealityEngine_CI docs/TRANSPORT_SECURITY.md:
// RE_TLS_CERT, RE_TLS_KEY, RE_TLS_CA and optionally RE_TLS_CRL. With RE_TLS_CERT set:
//   - PIM serves https only, TLS 1.3 at the transport profile. PIM is a
//     user-facing service (the browser UI and the HealthKit bridge), so its
//     port is server TLS: users and devices authenticate on top of it.
//   - Every outbound call to an internal peer (its Solid Community Server, the
//     PEs' /api/integrations/healthkit/scope) trusts the lane CA alone, checks
//     the CRL, presents PIM's lane certificate and is held to the profile. A
//     plaintext URL to an internal peer is refused: the lane has no plaintext
//     links.
//   - An external peer (Epic) is verified against the system store and held to
//     TLS 1.3 and the profile's suites, and gets no lane certificate.
// PIM speaks HTTP through two stacks, and both are covered: Node's global fetch
// (Solid, the scope push) through undici's global dispatcher, and node:https
// (openid-client) through https.globalAgent.
// With RE_TLS_CERT unset nothing here runs, and PIM is what it was.
//
// The choices are the engines', Manager's and RealityEngine_CI mcp/src/lane-tls.js's:
// the same suites and groups, and the same rule for what is internal
// (RealityEngine_CI#739).

import { readFileSync } from 'node:fs';
import https from 'node:https';
import { isIP } from 'node:net';
import tls from 'node:tls';
import { Agent as UndiciAgent, buildConnector, setGlobalDispatcher } from 'undici';

export const PROFILE_SUITES = 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';
export const GROUPS_PQ = 'X25519MLKEM768:X25519:secp384r1';
export const GROUPS_FALLBACK = 'X25519:secp384r1';

type Environment = Record<string, string | undefined>;

export interface LaneTlsSettings {
  cert: string;
  key: string;
  ca: string;
  crl?: string;
}

function value(env: Environment, name: string): string | undefined {
  const v = env[name]?.trim();
  return v ? v : undefined;
}

/** RE_TLS_CERT set: the lane is on. A partial configuration is an error, never a plaintext start. */
export function laneSettings(env: Environment = process.env): LaneTlsSettings | undefined {
  const cert = value(env, 'RE_TLS_CERT');
  if (!cert) return undefined;
  const key = value(env, 'RE_TLS_KEY');
  const ca = value(env, 'RE_TLS_CA');
  if (!key || !ca) throw new Error('TLS: RE_TLS_CERT is set, so RE_TLS_KEY and RE_TLS_CA must be too');
  return { cert, key, ca, crl: value(env, 'RE_TLS_CRL') };
}

let groupsInForce: string | undefined;
/** The profile's groups this Node's OpenSSL accepts: the post-quantum hybrid first. */
export function profileGroups(): string {
  if (groupsInForce) return groupsInForce;
  try {
    tls.createSecureContext({ ecdhCurve: GROUPS_PQ });
    groupsInForce = GROUPS_PQ;
  } catch {
    groupsInForce = GROUPS_FALLBACK;
  }
  return groupsInForce;
}

function read(path: string, what: string): Buffer {
  try {
    return readFileSync(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`TLS: cannot load ${what} ${path}: ${reason}`);
  }
}

/** The profile alone: TLS 1.3, its suites and groups. What an external call gets. */
export function profileOptions(): tls.SecureContextOptions {
  return {
    minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3',
    ciphers: PROFILE_SUITES,
    ecdhCurve: profileGroups(),
  };
}

/** The profile with the lane's identity and trust. What an internal call gets. */
export function laneOptions(s: LaneTlsSettings): tls.SecureContextOptions {
  return {
    ...profileOptions(),
    cert: read(s.cert, 'RE_TLS_CERT'),
    key: read(s.key, 'RE_TLS_KEY'),
    ca: read(s.ca, 'RE_TLS_CA'),
    ...(s.crl ? { crl: read(s.crl, 'RE_TLS_CRL') } : {}),
  };
}

/** The listener: TLS 1.3 at the profile, server TLS (a user-facing port). */
export function serverOptions(s: LaneTlsSettings): https.ServerOptions {
  const { ca: _ca, crl: _crl, ...own } = laneOptions(s);
  return { ...own, requestCert: false };
}

/** An internal peer, by the shared rule (RealityEngine_CI#739). */
export function isInternalHost(raw: string | undefined | null): boolean {
  const h = (raw ?? '').replace(/^\[|\]$/g, '').toLowerCase();
  if (h === '') return false;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  const kind = isIP(h);
  if (kind === 4) {
    const [a, b] = h.split('.').map(Number);
    return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  if (kind === 6) {
    if (h === '::1') return true;
    const first = Number.parseInt(h.split(':')[0] || '0', 16);
    return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80;
  }
  return !h.includes('.');
}

/** On the lane, a plaintext URL to an internal peer is a configuration error. */
export function refusePlaintextInternal(url: string, name: string, env: Environment = process.env): void {
  if (!laneSettings(env)) return;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return;
  }
  if (u.protocol === 'http:' && isInternalHost(u.hostname)) {
    throw new Error(`${name} is ${url}: the lane is on (RE_TLS_CERT), so every internal link is https`);
  }
}

/** node:https agent choosing the lane's or the profile's options by the peer's host. */
class LaneAwareHttpsAgent extends https.Agent {
  constructor(private readonly internal: tls.SecureContextOptions, private readonly external: tls.SecureContextOptions) {
    super({ keepAlive: true });
  }

  override createConnection(options: tls.ConnectionOptions, callback?: (err: Error | null, socket: tls.TLSSocket) => void): tls.TLSSocket {
    const host = options.servername || options.host;
    const chosen = isInternalHost(host) ? this.internal : this.external;
    const socket = tls.connect({ ...options, ...chosen });
    if (callback) {
      socket.once('secureConnect', () => callback(null, socket));
      socket.once('error', (error) => callback(error, socket));
    }
    return socket;
  }
}

let installed = false;

/**
 * Hold every outbound call to the lane's rules: internal peers over the lane's
 * mTLS, external peers on the profile with the system store. Global, because
 * the Solid client and openid-client make their own requests.
 */
export function installOutboundLaneTls(s: LaneTlsSettings): void {
  if (installed) return;
  const internal = laneOptions(s);
  const external = profileOptions();
  https.globalAgent = new LaneAwareHttpsAgent(internal, external);

  const internalConnect = buildConnector({ ...internal, rejectUnauthorized: true } as buildConnector.BuildOptions);
  const externalConnect = buildConnector({ ...external, rejectUnauthorized: true } as buildConnector.BuildOptions);
  setGlobalDispatcher(new UndiciAgent({
    connect: (options, callback) => {
      if (options.protocol === 'http:' && isInternalHost(options.hostname)) {
        callback(new Error(`refusing plaintext http://${options.hostname}: the lane is on (RE_TLS_CERT), so every internal link is https`), null);
        return;
      }
      (isInternalHost(options.hostname) ? internalConnect : externalConnect)(options, callback);
    },
  }));
  installed = true;
}

/** For the startup line. */
export function laneDescription(): string {
  return `TLS 1.3, server TLS, groups ${profileGroups()}; internal calls on the lane's mTLS`;
}
