import { createHash, randomBytes } from 'node:crypto';
import type { EpicRuntimeConfig } from '../../runtimeConfig';
import type { EpicFhirResource, EpicGrant } from './types';

export interface SmartConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  capabilities?: string[];
  scopes_supported?: string[];
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
      client_id: this.requireClientId(),
      code_verifier: codeVerifier,
    });
    if (this.config.clientSecret) params.set('client_secret', this.config.clientSecret);
    return this.tokenRequest(configuration.token_endpoint, params);
  }

  async refreshGrant(grant: EpicGrant): Promise<EpicGrant> {
    if (!grant.refreshToken) throw new Error('Epic refresh token was not granted; reconnect is required.');
    const configuration = await this.discover();
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: grant.refreshToken,
      client_id: this.requireClientId(),
    });
    if (this.config.clientSecret) params.set('client_secret', this.config.clientSecret);
    const refreshed = await this.tokenRequest(configuration.token_endpoint, params);
    return {
      ...grant,
      ...refreshed,
      refreshToken: refreshed.refreshToken ?? grant.refreshToken,
      patient: refreshed.patient ?? grant.patient,
      idToken: refreshed.idToken ?? grant.idToken,
    };
  }

  async fetchPatientResources(grant: EpicGrant, patientId: string): Promise<EpicFhirResource[]> {
    const accessToken = grant.accessToken;
    if (!accessToken) throw new Error('Epic access token is missing; reconnect is required.');
    const resources: EpicFhirResource[] = [];
    resources.push(await this.fhirRead(`Patient/${encodeURIComponent(patientId)}`, accessToken));
    for (const path of [
      `Condition?patient=${encodeURIComponent(patientId)}`,
      `MedicationRequest?patient=${encodeURIComponent(patientId)}`,
      `MedicationStatement?patient=${encodeURIComponent(patientId)}`,
      `AllergyIntolerance?patient=${encodeURIComponent(patientId)}`,
      `Immunization?patient=${encodeURIComponent(patientId)}`,
      `Observation?patient=${encodeURIComponent(patientId)}`,
      `DiagnosticReport?patient=${encodeURIComponent(patientId)}`,
      `Coverage?patient=${encodeURIComponent(patientId)}`,
      `DocumentReference?patient=${encodeURIComponent(patientId)}`,
    ]) {
      resources.push(...await this.fhirSearch(path, accessToken));
    }
    return resources;
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

  private async tokenRequest(tokenEndpoint: string, params: URLSearchParams): Promise<EpicGrant> {
    const response = await this.httpFetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
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
        if (response.status === 403 || response.status === 404) return results;
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

function sha256Base64Url(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
