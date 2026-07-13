import { EpicSmartClient, grantNeedsRefresh } from '../../../src/integrations/epic';
import type { EpicRuntimeConfig } from '../../../src/runtimeConfig';

describe('EpicSmartClient', () => {
  const config: EpicRuntimeConfig = {
    enabled: true,
    mode: 'sandbox',
    fhirBaseUrl: 'https://epic.example.test/FHIR/R4',
    clientId: 'smart-client-id',
    redirectUri: 'http://localhost:8080/api/integrations/epic/connect/callback',
    scopes: ['openid', 'fhirUser', 'launch/patient', 'patient/Patient.rs'],
    encryptionKey: 'unit-test-key',
    syncOnStartup: false,
  };

  it('discovers SMART endpoints and builds a PKCE authorization URL', async () => {
    const fetchMock = jest.fn(async () => jsonResponse({
      authorization_endpoint: 'https://epic.example.test/oauth2/authorize',
      token_endpoint: 'https://epic.example.test/oauth2/token',
    }));
    const client = new EpicSmartClient(config, fetchMock as never);

    const start = await client.startAuthorization('state-123');
    const url = new URL(start.authorizationUrl);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://epic.example.test/FHIR/R4/.well-known/smart-configuration',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
    expect(url.href).toContain('https://epic.example.test/oauth2/authorize?');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('smart-client-id');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('aud')).toBe('https://epic.example.test/FHIR/R4');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(start.codeVerifier).toBeTruthy();
  });

  it('exchanges an authorization code for token grant material', async () => {
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example.test/oauth2/authorize',
          token_endpoint: 'https://epic.example.test/oauth2/token',
        });
      }
      expect(url).toBe('https://epic.example.test/oauth2/token');
      expect(init?.method).toBe('POST');
      const body = new URLSearchParams(String(init?.body));
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('code-123');
      expect(body.get('code_verifier')).toBe('verifier-123');
      return jsonResponse({
        access_token: 'access-123',
        refresh_token: 'refresh-123',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid fhirUser patient/Patient.rs',
        patient: 'patient-123',
        id_token: 'id-token-123',
      });
    });
    const client = new EpicSmartClient(config, fetchMock as never);

    const grant = await client.exchangeCode('code-123', 'verifier-123');

    expect(grant).toMatchObject({
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
      tokenType: 'Bearer',
      scope: 'openid fhirUser patient/Patient.rs',
      patient: 'patient-123',
      idToken: 'id-token-123',
    });
    expect(grant.expiresAt).toBeDefined();
  });

  it('reads patient-scoped FHIR resources using the bearer token', async () => {
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).authorization).toBe('Bearer access-123');
      if (url.endsWith('/Patient/patient-123')) {
        return jsonResponse({ resourceType: 'Patient', id: 'patient-123' });
      }
      return jsonResponse({
        resourceType: 'Bundle',
        entry: [{ resource: { resourceType: 'Condition', id: 'condition-1' } }],
      });
    });
    const client = new EpicSmartClient(config, fetchMock as never);

    const resources = await client.fetchPatientResources({ accessToken: 'access-123' }, 'patient-123');

    expect(resources.some((resource) => resource.resourceType === 'Patient')).toBe(true);
    expect(resources.some((resource) => resource.resourceType === 'Condition')).toBe(true);
  });

  it('detects grants that are expired or about to expire', () => {
    expect(grantNeedsRefresh({ expiresAt: new Date(Date.now() - 1000).toISOString() })).toBe(true);
    expect(grantNeedsRefresh({ expiresAt: new Date(Date.now() + 3_600_000).toISOString() })).toBe(false);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

