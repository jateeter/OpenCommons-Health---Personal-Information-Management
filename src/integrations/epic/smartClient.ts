import { createHash, randomBytes } from 'node:crypto';
import type { EpicRuntimeConfig } from '../../runtimeConfig';
import type { EpicFhirResource, EpicGrant, EpicPatientResourceFetch, EpicSourceDiagnostic } from './types';

export interface SmartConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  capabilities?: string[];
  scopes_supported?: string[];
  [key: string]: unknown;
}

export interface FhirCapabilityStatement {
  resourceType: 'CapabilityStatement';
  rest?: Array<{
    resource?: Array<{
      type?: string;
      interaction?: Array<{ code?: string }>;
      searchParam?: Array<{ name?: string; type?: string }>;
    }>;
  }>;
  [key: string]: unknown;
}

export interface SmartAuthorizationStart {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  configuration: SmartConfiguration;
}

type FetchLike = typeof fetch;

const PATIENT_RESOURCE_REQUESTS = [
  { resourceType: 'Patient', operation: 'read' as const, path: (patientId: string) => `Patient/${patientId}` },
  { resourceType: 'Condition', operation: 'search' as const, path: (patientId: string) => `Condition?patient=${patientId}` },
  { resourceType: 'MedicationRequest', operation: 'search' as const, path: (patientId: string) => `MedicationRequest?patient=${patientId}` },
  { resourceType: 'MedicationStatement', operation: 'search' as const, path: (patientId: string) => `MedicationStatement?patient=${patientId}` },
  { resourceType: 'AllergyIntolerance', operation: 'search' as const, path: (patientId: string) => `AllergyIntolerance?patient=${patientId}` },
  { resourceType: 'Immunization', operation: 'search' as const, path: (patientId: string) => `Immunization?patient=${patientId}` },
  { resourceType: 'Observation', operation: 'search' as const, path: (patientId: string) => `Observation?patient=${patientId}` },
  { resourceType: 'DiagnosticReport', operation: 'search' as const, path: (patientId: string) => `DiagnosticReport?patient=${patientId}` },
  { resourceType: 'Coverage', operation: 'search' as const, path: (patientId: string) => `Coverage?patient=${patientId}` },
  { resourceType: 'DocumentReference', operation: 'search' as const, path: (patientId: string) => `DocumentReference?patient=${patientId}` },
];

export class EpicSmartClient {
  constructor(
    private readonly config: EpicRuntimeConfig,
    private readonly httpFetch: FetchLike = fetch,
  ) {}

  async startAuthorization(state: string): Promise<SmartAuthorizationStart> {
    const configuration = await this.discover();
    const codeVerifier = randomUrlSafe(64);
    const codeChallenge = sha256Base64Url(codeVerifier);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.requireClientId(),
      redirect_uri: this.requireRedirectUri(),
      scope: this.config.scopes.join(' '),
      state,
      aud: this.requireFhirBaseUrl(),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return {
      authorizationUrl: `${configuration.authorization_endpoint}?${params.toString()}`,
      state,
      codeVerifier,
      codeChallenge,
      configuration,
    };
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<EpicGrant> {
    const configuration = await this.discover();
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.requireRedirectUri(),
      code_verifier: codeVerifier,
    });
    const headers = this.clientAuthenticationHeaders();
    if (!this.config.clientSecret) params.set('client_id', this.requireClientId());
    return this.tokenRequest(configuration.token_endpoint, params, headers);
  }

  async refreshGrant(grant: EpicGrant): Promise<EpicGrant> {
    if (!grant.refreshToken) throw new Error('Epic refresh token was not granted; reconnect is required.');
    const configuration = await this.discover();
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: grant.refreshToken,
    });
    const headers = this.clientAuthenticationHeaders();
    if (!this.config.clientSecret) params.set('client_id', this.requireClientId());
    const refreshed = await this.tokenRequest(configuration.token_endpoint, params, headers);
    return {
      ...grant,
      ...refreshed,
      refreshToken: refreshed.refreshToken ?? grant.refreshToken,
      patient: refreshed.patient ?? grant.patient,
      idToken: refreshed.idToken ?? grant.idToken,
    };
  }

  async fetchPatientResources(grant: EpicGrant, patientId: string): Promise<EpicFhirResource[]> {
    return (await this.fetchPatientResourcePreview(grant, patientId)).resources;
  }

  async fetchPatientResourcePreview(grant: EpicGrant, patientId: string): Promise<EpicPatientResourceFetch> {
    const accessToken = grant.accessToken;
    if (!accessToken) throw new Error('Epic access token is missing; reconnect is required.');
    const resources: EpicFhirResource[] = [];
    const encodedPatientId = encodeURIComponent(patientId);
    const sourceDiagnostics: EpicSourceDiagnostic[] = [];
    for (const request of PATIENT_RESOURCE_REQUESTS) {
      if (!resourceReadAllowed(grant.scope, request.resourceType)) {
        sourceDiagnostics.push({
          resourceType: request.resourceType,
          operation: request.operation,
          status: 'skipped',
          entryCount: 0,
          mappableCount: 0,
          detail: `${request.resourceType} was not requested from Epic because no patient read scope was granted.`,
        });
        continue;
      }
      const result = request.operation === 'read'
        ? await this.fhirReadPreview(request.resourceType, request.path(encodedPatientId), accessToken)
        : await this.fhirSearchPreview(request.resourceType, request.path(encodedPatientId), accessToken);
      resources.push(...result.resources);
      sourceDiagnostics.push(result.diagnostic);
    }
    return { resources, sourceDiagnostics };
  }

  async discover(): Promise<SmartConfiguration> {
    const discoveryUrl = new URL('.well-known/smart-configuration', ensureTrailingSlash(this.requireFhirBaseUrl()));
    const response = await this.httpFetch(discoveryUrl.href, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Epic SMART discovery failed with HTTP ${response.status}.`);
    }
    const body = await response.json() as Partial<SmartConfiguration>;
    if (!body.authorization_endpoint || !body.token_endpoint) {
      throw new Error('Epic SMART discovery did not include authorization_endpoint and token_endpoint.');
    }
    return body as SmartConfiguration;
  }

  async capabilityStatement(): Promise<FhirCapabilityStatement> {
    const response = await this.httpFetch(this.fhirUrl('metadata'), {
      headers: { accept: 'application/fhir+json, application/json' },
    });
    if (!response.ok) {
      throw new Error(`Epic FHIR CapabilityStatement failed with HTTP ${response.status}.`);
    }
    const body = await response.json().catch(() => ({})) as Partial<FhirCapabilityStatement>;
    if (body.resourceType !== 'CapabilityStatement') {
      throw new Error('Epic FHIR metadata did not return a CapabilityStatement resource.');
    }
    return body as FhirCapabilityStatement;
  }

  private async tokenRequest(
    tokenEndpoint: string,
    params: URLSearchParams,
    extraHeaders: Record<string, string> = {},
  ): Promise<EpicGrant> {
    const response = await this.httpFetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        ...extraHeaders,
      },
      body: params.toString(),
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const detail = typeof body.error_description === 'string'
        ? body.error_description
        : typeof body.error === 'string' ? body.error : `HTTP ${response.status}`;
      throw new Error(`Epic token exchange failed: ${detail}`);
    }
    const issuedAt = new Date();
    const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : undefined;
    return {
      accessToken: stringValue(body.access_token),
      refreshToken: stringValue(body.refresh_token),
      tokenType: stringValue(body.token_type) ?? 'Bearer',
      scope: stringValue(body.scope),
      idToken: stringValue(body.id_token),
      patient: stringValue(body.patient),
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresIn ? new Date(issuedAt.getTime() + expiresIn * 1000).toISOString() : undefined,
    };
  }

  private async fhirRead(path: string, accessToken: string): Promise<EpicFhirResource> {
    const response = await this.httpFetch(this.fhirUrl(path), {
      headers: fhirHeaders(accessToken),
    });
    const body = await response.json().catch(() => ({})) as EpicFhirResource;
    if (!response.ok) {
      throw new Error(`Epic FHIR read ${path} failed with HTTP ${response.status}.`);
    }
    return body;
  }

  private async fhirReadOptional(path: string, accessToken: string): Promise<EpicFhirResource | undefined> {
    try {
      return await this.fhirRead(path, accessToken);
    } catch (error) {
      if (isDeniedOrMissingFhirRead(error)) return undefined;
      throw error;
    }
  }

  private async fhirReadPreview(
    resourceType: string,
    path: string,
    accessToken: string,
  ): Promise<{ resources: EpicFhirResource[]; diagnostic: EpicSourceDiagnostic }> {
    const response = await this.httpFetch(this.fhirUrl(path), { headers: fhirHeaders(accessToken) });
    const body = await response.json().catch(() => ({})) as EpicFhirResource;
    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        return {
          resources: [],
          diagnostic: sourceDiagnostic(resourceType, 'read', response.status, body.resourceType, 0, 0),
        };
      }
      throw new Error(`Epic FHIR read ${path} failed with HTTP ${response.status}.`);
    }
    const resources = body.resourceType === resourceType ? [body] : [];
    return {
      resources,
      diagnostic: sourceDiagnostic(resourceType, 'read', response.status, body.resourceType, 1, resources.length),
    };
  }

  private async fhirSearch(path: string, accessToken: string): Promise<EpicFhirResource[]> {
    const results: EpicFhirResource[] = [];
    let next: string | undefined = this.fhirUrl(path);
    while (next) {
      const response = await this.httpFetch(next, { headers: fhirHeaders(accessToken) });
      const body = await response.json().catch(() => ({})) as {
        resourceType?: string;
        entry?: Array<{ resource?: EpicFhirResource }>;
        link?: Array<{ relation?: string; url?: string }>;
      };
      if (!response.ok) {
        if (response.status === 400 || response.status === 403 || response.status === 404) return results;
        throw new Error(`Epic FHIR search ${path} failed with HTTP ${response.status}.`);
      }
      if (body.resourceType !== 'Bundle') return results;
      for (const entry of body.entry ?? []) {
        if (entry.resource) results.push(entry.resource);
      }
      next = body.link?.find((link) => link.relation === 'next')?.url;
    }
    return results;
  }

  private async fhirSearchPreview(
    resourceType: string,
    path: string,
    accessToken: string,
  ): Promise<{ resources: EpicFhirResource[]; diagnostic: EpicSourceDiagnostic }> {
    const resources: EpicFhirResource[] = [];
    let entryCount = 0;
    let firstFhirType: string | undefined;
    let next: string | undefined = this.fhirUrl(path);
    while (next) {
      const response = await this.httpFetch(next, { headers: fhirHeaders(accessToken) });
      const body = await response.json().catch(() => ({})) as {
        resourceType?: string;
        entry?: Array<{ resource?: EpicFhirResource }>;
        link?: Array<{ relation?: string; url?: string }>;
      };
      firstFhirType ??= body.resourceType;
      if (!response.ok) {
        if (response.status === 400 || response.status === 403 || response.status === 404) {
          return {
            resources,
            diagnostic: sourceDiagnostic(resourceType, 'search', response.status, body.resourceType, entryCount, resources.length),
          };
        }
        throw new Error(`Epic FHIR search ${path} failed with HTTP ${response.status}.`);
      }
      if (body.resourceType !== 'Bundle') {
        return {
          resources,
          diagnostic: sourceDiagnostic(resourceType, 'search', response.status, body.resourceType, entryCount, resources.length),
        };
      }
      for (const entry of body.entry ?? []) {
        entryCount += 1;
        if (entry.resource?.resourceType === resourceType) resources.push(entry.resource);
      }
      next = body.link?.find((link) => link.relation === 'next')?.url;
    }
    return {
      resources,
      diagnostic: sourceDiagnostic(resourceType, 'search', 200, firstFhirType, entryCount, resources.length),
    };
  }

  private fhirUrl(path: string): string {
    return new URL(path, ensureTrailingSlash(this.requireFhirBaseUrl())).href;
  }

  private requireFhirBaseUrl(): string {
    if (!this.config.fhirBaseUrl) throw new Error('EPIC_FHIR_BASE_URL is required for live Epic access.');
    return this.config.fhirBaseUrl;
  }

  private requireClientId(): string {
    if (!this.config.clientId) throw new Error('EPIC_CLIENT_ID is required for live Epic access.');
    return this.config.clientId;
  }

  private requireRedirectUri(): string {
    if (!this.config.redirectUri) throw new Error('EPIC_REDIRECT_URI is required for live Epic access.');
    return this.config.redirectUri;
  }

  private clientAuthenticationHeaders(): Record<string, string> {
    if (!this.config.clientSecret) return {};
    const credentials = `${formEncode(this.requireClientId())}:${formEncode(this.config.clientSecret)}`;
    return { authorization: `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}` };
  }
}

export function grantNeedsRefresh(grant: EpicGrant, skewMs = 60_000): boolean {
  if (!grant.expiresAt) return false;
  return new Date(grant.expiresAt).getTime() - skewMs <= Date.now();
}

function fhirHeaders(accessToken: string): Record<string, string> {
  return {
    accept: 'application/fhir+json, application/json',
    authorization: `Bearer ${accessToken}`,
  };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function randomUrlSafe(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

function formEncode(value: string): string {
  return new URLSearchParams({ value }).toString().slice('value='.length);
}

function sha256Base64Url(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function isDeniedOrMissingFhirRead(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /failed with HTTP (403|404)\b/.test(message);
}

function sourceDiagnostic(
  resourceType: string,
  operation: 'read' | 'search',
  httpStatus: number,
  fhirResourceType: string | undefined,
  entryCount: number,
  mappableCount: number,
): EpicSourceDiagnostic {
  const status: EpicSourceDiagnostic['status'] = mappableCount > 0
    ? 'mapped'
    : httpStatus === 200 ? 'empty' : 'attention';
  const detail = status === 'mapped'
    ? `${resourceType} returned ${mappableCount} mappable record${mappableCount === 1 ? '' : 's'}.`
    : httpStatus === 200
      ? `${resourceType} returned no mappable records${entryCount > 0 ? ` (${entryCount} non-domain entr${entryCount === 1 ? 'y' : 'ies'} such as OperationOutcome).` : '.'}`
      : `${resourceType} ${operation} returned HTTP ${httpStatus}${fhirResourceType ? ` (${fhirResourceType})` : ''}; preview skipped this family.`;
  return {
    resourceType,
    operation,
    status,
    httpStatus,
    fhirResourceType,
    entryCount,
    mappableCount,
    detail,
  };
}

function resourceReadAllowed(scope: string | undefined, resourceType: string): boolean {
  if (!scope?.trim()) return true;
  const resource = resourceType.toLowerCase();
  return scope.split(/\s+/).some((rawScope) => {
    const normalized = rawScope.split('?')[0]?.toLowerCase();
    if (!normalized?.startsWith('patient/')) return false;
    const [, permission = ''] = normalized.split('/');
    const [scopeResource = '', operations = ''] = permission.split('.');
    if (scopeResource !== '*' && scopeResource !== resource) return false;
    return operations === '*' || operations === 'read' || operations.includes('r');
  });
}
