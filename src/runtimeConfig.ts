import { readFileSync } from 'node:fs';

export interface ServerRuntimeConfig {
  host: string;
  port: number;
}

export interface SolidRuntimeConfig {
  podServerUrl: string;
  oidcIssuer: string;
  podBaseUrl: string;
  podPath: string;
  redirectUrl?: string;
  clientId: string;
  clientSecret: string;
}

export type EpicIntegrationMode = 'mock' | 'sandbox' | 'production';

export interface EpicRuntimeConfig {
  enabled: boolean;
  mode: EpicIntegrationMode;
  fhirBaseUrl?: string;
  clientId?: string;
  redirectUri?: string;
  scopes: string[];
  encryptionKey?: string;
  syncOnStartup: boolean;
}

type Environment = Record<string, string | undefined>;

const DEFAULT_EPIC_SCOPES = [
  'openid',
  'fhirUser',
  'launch/patient',
  'offline_access',
  'patient/Patient.rs',
  'patient/Condition.rs',
  'patient/MedicationRequest.rs',
  'patient/MedicationStatement.rs',
  'patient/AllergyIntolerance.rs',
  'patient/Immunization.rs',
  'patient/Observation.rs',
  'patient/DiagnosticReport.rs',
  'patient/Coverage.rs',
  'patient/DocumentReference.rs',
];

/** Load network settings needed before the HTTP server starts. */
export function loadServerRuntimeConfig(env: Environment = process.env): ServerRuntimeConfig {
  const rawPort = env.PORT ?? env.APP_PORT ?? '8080';
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT/APP_PORT must be an integer between 1 and 65535; received: ${rawPort}`);
  }
  return {
    host: env.HOST?.trim() || '127.0.0.1',
    port,
  };
}

/** Load and validate the complete Solid connection contract. */
export function loadSolidRuntimeConfig(env: Environment = process.env): SolidRuntimeConfig {
  const podServerUrl = requiredHttpUrl(env, 'SOLID_POD_SERVER_URL');
  const redirectUrl = optionalHttpUrl(env, 'SOLID_REDIRECT_URL');
  const rawPath = env.SOLID_POD_PATH?.trim() || '/health-pim/';
  const podPath = `/${rawPath.replace(/^\/+|\/+$/g, '')}/`;
  const credentials = loadClientCredentials(env);

  return {
    podServerUrl,
    oidcIssuer: optionalHttpUrl(env, 'SOLID_OIDC_ISSUER') ?? podServerUrl,
    podBaseUrl: requiredHttpUrl(env, 'SOLID_POD_BASE_URL', true),
    podPath,
    redirectUrl,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
  };
}

/** Load optional Epic SMART/FHIR integration settings. Disabled by default. */
export function loadEpicRuntimeConfig(env: Environment = process.env): EpicRuntimeConfig {
  const enabled = parseBoolean(env.EPIC_ENABLED, false);
  const mode = parseEpicMode(env.EPIC_MODE);
  const scopes = splitScopes(env.EPIC_SCOPES);
  const config: EpicRuntimeConfig = {
    enabled,
    mode,
    fhirBaseUrl: optionalHttpUrl(env, 'EPIC_FHIR_BASE_URL'),
    clientId: env.EPIC_CLIENT_ID?.trim() || undefined,
    redirectUri: optionalHttpUrl(env, 'EPIC_REDIRECT_URI'),
    scopes,
    encryptionKey: env.EPIC_GRANT_ENCRYPTION_KEY?.trim() || undefined,
    syncOnStartup: parseBoolean(env.EPIC_SYNC_ON_STARTUP, false),
  };

  if (!enabled) return config;

  if (!config.encryptionKey) {
    throw new Error('EPIC_GRANT_ENCRYPTION_KEY is required when EPIC_ENABLED=true.');
  }
  if (mode !== 'mock') {
    if (!config.fhirBaseUrl) throw new Error('EPIC_FHIR_BASE_URL is required when Epic is enabled outside mock mode.');
    if (!config.clientId) throw new Error('EPIC_CLIENT_ID is required when Epic is enabled outside mock mode.');
    if (!config.redirectUri) throw new Error('EPIC_REDIRECT_URI is required when Epic is enabled outside mock mode.');
  }

  return config;
}

function loadClientCredentials(env: Environment): { clientId: string; clientSecret: string } {
  const clientId = env.SOLID_CLIENT_ID?.trim();
  const clientSecret = env.SOLID_CLIENT_SECRET?.trim();
  if (clientId || clientSecret) {
    if (!clientId) throw new Error('SOLID_CLIENT_ID is required when SOLID_CLIENT_SECRET is set.');
    if (!clientSecret) throw new Error('SOLID_CLIENT_SECRET is required when SOLID_CLIENT_ID is set.');
    return { clientId, clientSecret };
  }

  const file = env.SOLID_CLIENT_CREDENTIALS_FILE?.trim();
  if (!file) {
    throw new Error(
      'SOLID_CLIENT_ID and SOLID_CLIENT_SECRET, or SOLID_CLIENT_CREDENTIALS_FILE, are required to initialize the Solid-backed domain APIs.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read SOLID_CLIENT_CREDENTIALS_FILE ${file}: ${reason}`);
  }
  if (!isCredentials(parsed)) {
    throw new Error(
      `SOLID_CLIENT_CREDENTIALS_FILE ${file} must contain non-empty clientId and clientSecret strings.`,
    );
  }
  return { clientId: parsed.clientId.trim(), clientSecret: parsed.clientSecret.trim() };
}

function isCredentials(value: unknown): value is { clientId: string; clientSecret: string } {
  if (!value || typeof value !== 'object') return false;
  const credentials = value as Record<string, unknown>;
  return typeof credentials.clientId === 'string'
    && credentials.clientId.trim().length > 0
    && typeof credentials.clientSecret === 'string'
    && credentials.clientSecret.trim().length > 0;
}

function required(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required to initialize the Solid-backed domain APIs.`);
  return value;
}

function requiredHttpUrl(env: Environment, name: string, trailingSlash = false): string {
  const value = required(env, name);
  const normalized = validateHttpUrl(value, name);
  return trailingSlash && !normalized.endsWith('/') ? `${normalized}/` : normalized;
}

function optionalHttpUrl(env: Environment, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? validateHttpUrl(value, name) : undefined;
}

function validateHttpUrl(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use http or https.`);
  }
  return url.href.replace(/\/$/, '');
}

function parseEpicMode(value: string | undefined): EpicIntegrationMode {
  const mode = value?.trim() || 'mock';
  if (mode === 'mock' || mode === 'sandbox' || mode === 'production') return mode;
  throw new Error(`EPIC_MODE must be one of mock, sandbox, or production; received: ${mode}`);
}

function splitScopes(value: string | undefined): string[] {
  const scopes = value?.trim()
    ? value.trim().split(/\s+/).filter(Boolean)
    : DEFAULT_EPIC_SCOPES;
  return [...new Set(scopes)];
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Boolean environment value must be true or false; received: ${value}`);
}
