import { generateKeyPairSync } from 'node:crypto';
import { EpicSmartClient, grantNeedsRefresh } from '../../../src/integrations/epic';
import type { EpicRuntimeConfig } from '../../../src/runtimeConfig';

describe('EpicSmartClient', () => {
  const config: EpicRuntimeConfig = {
    enabled: true,
    mode: 'sandbox',
    connectFlow: 'authorization_code',
    clientAuthMethod: 'auto',
    fhirBaseUrl: 'https://epic.example.test/FHIR/R4',
    clientId: 'smart-client-id',
    clientAssertionAlgorithm: 'RS384',
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
      expect(body.get('client_id')).toBe('smart-client-id');
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

  it('uses HTTP Basic client authentication for confidential token exchange', async () => {
    const confidentialConfig: EpicRuntimeConfig = {
      ...config,
      clientSecret: 'this-is-the-secret-2/7',
    };
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example.test/oauth2/authorize',
          token_endpoint: 'https://epic.example.test/oauth2/token',
        });
      }
      expect(url).toBe('https://epic.example.test/oauth2/token');
      expect(init?.method).toBe('POST');
      expect((init?.headers as Record<string, string>).authorization).toBe(
        `Basic ${Buffer.from('smart-client-id:this-is-the-secret-2%2F7', 'utf8').toString('base64')}`,
      );
      const body = new URLSearchParams(String(init?.body));
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('code-123');
      expect(body.get('redirect_uri')).toBe('http://localhost:8080/api/integrations/epic/connect/callback');
      expect(body.get('code_verifier')).toBe('verifier-123');
      expect(body.has('client_id')).toBe(false);
      expect(body.has('client_secret')).toBe(false);
      return jsonResponse({
        access_token: 'access-123',
        refresh_token: 'refresh-123',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid fhirUser patient/Patient.rs',
        patient: 'patient-123',
      });
    });
    const client = new EpicSmartClient(confidentialConfig, fetchMock as never);

    const grant = await client.exchangeCode('code-123', 'verifier-123');

    expect(grant).toMatchObject({
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
      patient: 'patient-123',
    });
  });

  it('uses HTTP Basic client authentication for confidential token refresh', async () => {
    const confidentialConfig: EpicRuntimeConfig = {
      ...config,
      clientSecret: 'refresh-secret/7',
    };
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example.test/oauth2/authorize',
          token_endpoint: 'https://epic.example.test/oauth2/token',
        });
      }
      expect(url).toBe('https://epic.example.test/oauth2/token');
      expect((init?.headers as Record<string, string>).authorization).toBe(
        `Basic ${Buffer.from('smart-client-id:refresh-secret%2F7', 'utf8').toString('base64')}`,
      );
      const body = new URLSearchParams(String(init?.body));
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('refresh-123');
      expect(body.has('client_id')).toBe(false);
      expect(body.has('client_secret')).toBe(false);
      return jsonResponse({
        access_token: 'new-access-123',
        token_type: 'Bearer',
        expires_in: 3600,
      });
    });
    const client = new EpicSmartClient(confidentialConfig, fetchMock as never);

    const grant = await client.refreshGrant({ refreshToken: 'refresh-123', patient: 'patient-123' });

    expect(grant).toMatchObject({
      accessToken: 'new-access-123',
      refreshToken: 'refresh-123',
      patient: 'patient-123',
    });
  });

  it('uses private_key_jwt client authentication for authorization-code token exchange', async () => {
    const jwtConfig: EpicRuntimeConfig = {
      ...config,
      clientAuthMethod: 'private_key_jwt',
      dynamicClientId: 'dynamic-client-id',
      clientAssertionPrivateKey: testPrivateKey(),
      clientAssertionKeyId: 'kid-123',
      clientAssertionAlgorithm: 'RS384',
    };
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example.test/oauth2/authorize',
          token_endpoint: 'https://epic.example.test/oauth2/token',
        });
      }
      expect((init?.headers as Record<string, string>).authorization).toBeUndefined();
      const body = new URLSearchParams(String(init?.body));
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.has('client_id')).toBe(false);
      expect(body.get('client_assertion_type')).toBe('urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
      const assertion = decodeJwt(body.get('client_assertion') as string);
      expect(assertion.header).toMatchObject({ alg: 'RS384', typ: 'JWT', kid: 'kid-123' });
      expect(assertion.payload).toMatchObject({
        iss: 'dynamic-client-id',
        sub: 'dynamic-client-id',
        aud: 'https://epic.example.test/oauth2/token',
      });
      expect(assertion.payload.jti).toBeTruthy();
      return jsonResponse({
        access_token: 'access-123',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid fhirUser patient/Patient.rs',
        patient: 'patient-123',
      });
    });
    const client = new EpicSmartClient(jwtConfig, fetchMock as never);

    const grant = await client.exchangeCode('code-123', 'verifier-123');

    expect(grant.patient).toBe('patient-123');
  });

  it('uses the Epic dynamic JWT bearer grant flow when selected', async () => {
    const jwtConfig: EpicRuntimeConfig = {
      ...config,
      connectFlow: 'dynamic_jwt_bearer',
      dynamicClientId: 'dynamic-client-id',
      clientAssertionPrivateKey: testPrivateKey(),
      clientAssertionKeyId: 'kid-123',
      clientAssertionAlgorithm: 'RS384',
    };
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/.well-known/smart-configuration')) {
        return jsonResponse({
          authorization_endpoint: 'https://epic.example.test/oauth2/authorize',
          token_endpoint: 'https://epic.example.test/oauth2/token',
        });
      }
      const body = new URLSearchParams(String(init?.body));
      expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
      expect(body.get('client_id')).toBe('dynamic-client-id');
      expect(body.has('client_assertion')).toBe(false);
      const assertion = decodeJwt(body.get('assertion') as string);
      expect(assertion.header).toMatchObject({ alg: 'RS384', typ: 'JWT', kid: 'kid-123' });
      expect(assertion.payload).toMatchObject({
        iss: 'dynamic-client-id',
        sub: 'dynamic-client-id',
        aud: 'https://epic.example.test/FHIR/R4/',
      });
      return jsonResponse({
        access_token: 'access-123',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid fhirUser patient/Patient.rs',
        patient: 'patient-123',
      });
    });
    const client = new EpicSmartClient(jwtConfig, fetchMock as never);

    const grant = await client.exchangeJwtBearerGrant();

    expect(grant.patient).toBe('patient-123');
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

  it('skips Epic resource families that were not granted and continues preview reads', async () => {
    const requestedUrls: string[] = [];
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      requestedUrls.push(url);
      expect((init?.headers as Record<string, string>).authorization).toBe('Bearer access-123');
      if (url.includes('/Patient/')) {
        throw new Error('Patient read should be skipped when patient/Patient.r is not granted.');
      }
      if (url.includes('/Condition?')) {
        return jsonResponse({
          resourceType: 'Bundle',
          entry: [{ resource: { resourceType: 'Condition', id: 'condition-1' } }],
        });
      }
      if (url.includes('/Observation?')) {
        return jsonResponse({
          resourceType: 'Bundle',
          entry: [{ resource: { resourceType: 'Observation', id: 'observation-1' } }],
        });
      }
      throw new Error(`Unexpected ungranted resource request ${url}`);
    });
    const client = new EpicSmartClient(config, fetchMock as never);

    const resources = await client.fetchPatientResources({
      accessToken: 'access-123',
      scope: 'openid fhirUser launch/patient patient/Condition.r patient/Observation.r',
    }, 'patient-123');

    expect(resources.map((resource) => resource.resourceType)).toEqual(['Condition', 'Observation']);
    expect(requestedUrls.some((url) => url.includes('/Patient/'))).toBe(false);
    expect(requestedUrls.some((url) => url.includes('/MedicationRequest?'))).toBe(false);
    expect(requestedUrls.some((url) => url.includes('/Observation?') && url.includes('category=vital-signs'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/Observation?') && url.includes('category=laboratory'))).toBe(true);
  });

  it('reports PHI-safe source diagnostics for previewed Epic resource families', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('/DocumentReference?')) {
        return jsonResponse({
          resourceType: 'Bundle',
          entry: [
            { resource: { resourceType: 'DocumentReference', id: 'doc-1' } },
            { resource: { resourceType: 'OperationOutcome', id: 'outcome-1' } },
          ],
        });
      }
      if (url.includes('/Observation?')) return jsonResponse({ resourceType: 'OperationOutcome' }, 400);
      return jsonResponse({ resourceType: 'Bundle', entry: [] });
    });
    const client = new EpicSmartClient(config, fetchMock as never);

    const result = await client.fetchPatientResourcePreview({
      accessToken: 'access-123',
      scope: 'patient/DocumentReference.r patient/Observation.r',
    }, 'patient-123');

    expect(result.resources).toHaveLength(1);
    expect(result.sourceDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        resourceType: 'DocumentReference',
        status: 'mapped',
        httpStatus: 200,
        fhirResourceType: 'Bundle',
        entryCount: 2,
        mappableCount: 1,
      }),
      expect.objectContaining({
        resourceType: 'Observation',
        status: 'attention',
        httpStatus: 400,
        fhirResourceType: 'OperationOutcome',
        mappableCount: 0,
      }),
      expect.objectContaining({
        resourceType: 'Patient',
        status: 'skipped',
        mappableCount: 0,
      }),
    ]));
    expect(JSON.stringify(result.sourceDiagnostics)).not.toContain('patient-123');
  });

  it('captures sanitized OperationOutcome issue codes in preview diagnostics', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('/Observation?')) {
        return jsonResponse({
          resourceType: 'OperationOutcome',
          issue: [{
            severity: 'fatal',
            code: 'required',
            diagnostics: 'Must have either code or category for Patient/patient-123 and token abcdefghijklmnop.',
          }],
        }, 400);
      }
      return jsonResponse({ resourceType: 'Bundle', entry: [] });
    });
    const client = new EpicSmartClient(config, fetchMock as never);

    const result = await client.fetchPatientResourcePreview({
      accessToken: 'access-123',
      scope: 'patient/Observation.r',
    }, 'patient-123');

    const observation = result.sourceDiagnostics.find((diagnostic) => diagnostic.resourceType === 'Observation');
    expect(observation).toMatchObject({
      status: 'attention',
      httpStatus: 400,
      outcomeIssues: [expect.objectContaining({
        severity: 'fatal',
        code: 'required',
        diagnosticsClass: 'Must have either code or category for Patient/[redacted] and token [redacted-id].',
      })],
    });
    expect(observation?.detail).toContain('OperationOutcome fatal/required');
    expect(JSON.stringify(observation)).not.toContain('patient-123');
    expect(JSON.stringify(observation)).not.toContain('abcdefghijklmnop');
  });

  it('treats denied Patient reads as optional when Epic omits scope detail from the token', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('/Patient/')) return jsonResponse({ resourceType: 'OperationOutcome' }, 403);
      if (url.includes('/Condition?')) {
        return jsonResponse({
          resourceType: 'Bundle',
          entry: [{ resource: { resourceType: 'Condition', id: 'condition-1' } }],
        });
      }
      return jsonResponse({ resourceType: 'Bundle', entry: [] });
    });
    const client = new EpicSmartClient(config, fetchMock as never);

    const resources = await client.fetchPatientResources({ accessToken: 'access-123' }, 'patient-123');

    expect(resources.some((resource) => resource.resourceType === 'Patient')).toBe(false);
    expect(resources.some((resource) => resource.resourceType === 'Condition')).toBe(true);
  });

  it('treats unsupported Epic search families as skipped preview sources', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('/Patient/')) return jsonResponse({ resourceType: 'Patient', id: 'patient-123' });
      if (url.includes('/Condition?')) {
        return jsonResponse({
          resourceType: 'Bundle',
          entry: [{ resource: { resourceType: 'Condition', id: 'condition-1' } }],
        });
      }
      if (url.includes('/Observation?')) return jsonResponse({ resourceType: 'OperationOutcome' }, 400);
      return jsonResponse({ resourceType: 'Bundle', entry: [] });
    });
    const client = new EpicSmartClient(config, fetchMock as never);

    const resources = await client.fetchPatientResources({
      accessToken: 'access-123',
      scope: 'patient/Patient.r patient/Condition.r patient/Observation.r',
    }, 'patient-123');

    expect(resources.map((resource) => resource.resourceType)).toEqual(['Patient', 'Condition']);
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

function testPrivateKey(): string {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }).privateKey;
}

function decodeJwt(jwt: string): { header: Record<string, unknown>; payload: Record<string, unknown> } {
  const [header, payload] = jwt.split('.');
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as Record<string, unknown>,
    payload: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>,
  };
}
