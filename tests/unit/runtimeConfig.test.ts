import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadServerRuntimeConfig, loadSolidRuntimeConfig } from '../../src/runtimeConfig';

describe('runtime configuration', () => {
  it('loads every Solid setting supplied by Compose or .env', () => {
    expect(loadSolidRuntimeConfig({
      SOLID_POD_SERVER_URL: 'http://css:3000',
      SOLID_OIDC_ISSUER: 'http://localhost:3000',
      SOLID_POD_BASE_URL: 'http://css:3000/alice',
      SOLID_POD_PATH: 'personal-health',
      SOLID_REDIRECT_URL: 'http://localhost:8080/callback',
      SOLID_CLIENT_ID: 'client-id',
      SOLID_CLIENT_SECRET: 'client-secret',
    })).toEqual({
      podServerUrl: 'http://css:3000',
      oidcIssuer: 'http://localhost:3000',
      podBaseUrl: 'http://css:3000/alice/',
      podPath: '/personal-health/',
      redirectUrl: 'http://localhost:8080/callback',
      clientId: 'client-id',
      clientSecret: 'client-secret',
    });
  });

  it('defaults the OIDC issuer to the pod server URL', () => {
    expect(loadSolidRuntimeConfig({
      SOLID_POD_SERVER_URL: 'http://localhost:3000',
      SOLID_POD_BASE_URL: 'http://localhost:3000/alice/',
      SOLID_CLIENT_ID: 'client-id',
      SOLID_CLIENT_SECRET: 'client-secret',
    }).oidcIssuer).toBe('http://localhost:3000');
  });

  it('loads bootstrap-generated client credentials from a mounted file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'opencommons-credentials-'));
    const file = join(directory, 'client-credentials.json');
    try {
      writeFileSync(file, JSON.stringify({
        clientId: 'file-client-id',
        clientSecret: 'file-client-secret',
        resource: 'http://css:3000/.account/client-credentials/1',
      }));
      expect(loadSolidRuntimeConfig({
        SOLID_POD_SERVER_URL: 'http://css:3000',
        SOLID_POD_BASE_URL: 'http://css:3000/alice/',
        SOLID_CLIENT_CREDENTIALS_FILE: file,
      })).toMatchObject({
        clientId: 'file-client-id',
        clientSecret: 'file-client-secret',
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects an invalid client credentials file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'opencommons-credentials-'));
    const file = join(directory, 'client-credentials.json');
    try {
      writeFileSync(file, JSON.stringify({ clientId: 'missing-secret' }));
      expect(() => loadSolidRuntimeConfig({
        SOLID_POD_SERVER_URL: 'http://css:3000',
        SOLID_POD_BASE_URL: 'http://css:3000/alice/',
        SOLID_CLIENT_CREDENTIALS_FILE: file,
      })).toThrow('must contain non-empty clientId and clientSecret strings');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails with the exact missing runtime setting', () => {
    expect(() => loadSolidRuntimeConfig({})).toThrow(
      'SOLID_POD_SERVER_URL is required to initialize the Solid-backed domain APIs.',
    );
  });

  it('rejects non-HTTP Solid URLs', () => {
    expect(() => loadSolidRuntimeConfig({
      SOLID_POD_SERVER_URL: 'file:///tmp/pod',
      SOLID_POD_BASE_URL: 'http://localhost:3000/alice/',
      SOLID_CLIENT_ID: 'client-id',
      SOLID_CLIENT_SECRET: 'client-secret',
    })).toThrow('SOLID_POD_SERVER_URL must use http or https.');
  });

  it('loads the server bind settings and validates the port', () => {
    expect(loadServerRuntimeConfig({ APP_PORT: '9090', HOST: '0.0.0.0' })).toEqual({
      host: '0.0.0.0',
      port: 9090,
    });
    expect(() => loadServerRuntimeConfig({ PORT: '70000' })).toThrow(
      'PORT/APP_PORT must be an integer between 1 and 65535',
    );
  });
});
