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

type Environment = Record<string, string | undefined>;

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

  return {
    podServerUrl,
    oidcIssuer: optionalHttpUrl(env, 'SOLID_OIDC_ISSUER') ?? podServerUrl,
    podBaseUrl: requiredHttpUrl(env, 'SOLID_POD_BASE_URL', true),
    podPath,
    redirectUrl,
    clientId: required(env, 'SOLID_CLIENT_ID'),
    clientSecret: required(env, 'SOLID_CLIENT_SECRET'),
  };
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
