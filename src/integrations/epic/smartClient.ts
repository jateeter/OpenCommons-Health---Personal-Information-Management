import { createHash, createSign, randomBytes, randomUUID } from 'node:crypto';
import type { EpicRuntimeConfig } from '../../runtimeConfig';
import type { EpicFhirResource, EpicGrant, EpicOperationOutcomeIssue, EpicPatientResourceFetch, EpicSourceDiagnostic } from './types';

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
  { resourceType: 'Patient', operation: 'read' as const, paths: (patientId: string) => [`Patient/${patientId}`] },
  { resourceType: 'Condition', operation: 'search' as const, paths: (patientId: string) => [`Condition?patient=${patientId}`] },
  { resourceType: 'MedicationRequest', operation: 'search' as const, paths: (patientId: string) => [`MedicationRequest?patient=${patientId}`] },
  { resourceType: 'MedicationStatement', operation: 'search' as const, paths: (patientId: string) => [`MedicationStatement?patient=${patientId}`] },
  { resourceType: 'AllergyIntolerance', operation: 'search' as const, paths: (patientId: string) => [`AllergyIntolerance?patient=${patientId}`] },
  { resourceType: 'Immunization', operation: 'search' as const, paths: (patientId: string) => [`Immunization?patient=${patientId}`] },
  {
    resourceType: 'Observation',
    operation: 'search' as const,
    paths: (patientId: string) => [
      fhirSearchPath('Observation', { patient: patientId, category: 'vital-signs' }),
      fhirSearchPath('Observation', { patient: patientId, category: 'laboratory' }),
      fhirSearchPath('Observation', { patient: patientId, category: 'social-history' }),
      fhirSearchPath('Observation', { patient: patientId, category: 'survey' }),
      fhirSearchPath('Observation', { patient: patientId, category: 'core-characteristics' }),
    ],
  },
  {
    resourceType: 'DiagnosticReport',
    operation: 'search' as const,
    paths: (patientId: string) => [
      fhirSearchPath('DiagnosticReport', { patient: patientId, category: 'http://terminology.hl7.org/CodeSystem/v2-0074|LAB' }),
      fhirSearchPath('DiagnosticReport', { patient: patientId, category: 'http://loinc.org|LP29708-2' }),
      fhirSearchPath('DiagnosticReport', { patient: patientId, category: 'http://loinc.org|LP29684-5' }),
      fhirSearchPath('DiagnosticReport', { patient: patientId, category: 'http://loinc.org|LP7839-6' }),
    ],
  },
  { resourceType: 'Coverage', operation: 'search' as const, paths: (patientId: string) => [`Coverage?patient=${patientId}`] },
  { resourceType: 'DocumentReference', operation: 'search' as const, paths: (patientId: string) => [`DocumentReference?patient=${patientId}`] },
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
      client_id: this.oauthClientId(),
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
    const headers = this.applyTokenClientAuthentication(params, configuration.token_endpoint);
    return this.tokenRequest(configuration.token_endpoint, params, headers);
  }

  async exchangeJwtBearerGrant(): Promise<EpicGrant> {
    const configuration = await this.discover();
    const clientId = this.requireDynamicClientId();
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: this.jwtBearerGrantAssertion(clientId),
      client_id: clientId,
    });
    return this.tokenRequest(configuration.token_endpoint, params);
  }

  async refreshGrant(grant: EpicGrant): Promise<EpicGrant> {
    if (!grant.refreshToken) throw new Error('Epic refresh token was not granted; reconnect is required.');
    const configuration = await this.discover();
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: grant.refreshToken,
    });
    const headers = this.applyTokenClientAuthentication(params, configuration.token_endpoint);
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
      const paths = request.paths(encodedPatientId);
      const result = request.operation === 'read'
        ? await this.fhirReadPreview(request.resourceType, paths[0], accessToken)
        : await this.fhirSearchPreviewPaths(request.resourceType, paths, accessToken);
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
          diagnostic: sourceDiagnostic(resourceType, 'read', response.status, body.resourceType, 0, 0, outcomeIssuesFrom(body)),
        };
      }
      throw new Error(`Epic FHIR read ${path} failed with HTTP ${response.status}.`);
    }
    const resources = body.resourceType === resourceType ? [body] : [];
    return {
      resources,
      diagnostic: sourceDiagnostic(resourceType, 'read', response.status, body.resourceType, 1, resources.length, outcomeIssuesFrom(body)),
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
    const outcomeIssues: EpicOperationOutcomeIssue[] = [];
    let next: string | undefined = this.fhirUrl(path);
    while (next) {
      const response = await this.httpFetch(next, { headers: fhirHeaders(accessToken) });
      const body = await response.json().catch(() => ({})) as {
        resourceType?: string;
        entry?: Array<{ resource?: EpicFhirResource }>;
        link?: Array<{ relation?: string; url?: string }>;
      };
      outcomeIssues.push(...outcomeIssuesFrom(body));
      firstFhirType ??= body.resourceType;
      if (!response.ok) {
        if (response.status === 400 || response.status === 403 || response.status === 404) {
          return {
            resources,
            diagnostic: sourceDiagnostic(resourceType, 'search', response.status, body.resourceType, entryCount, resources.length, outcomeIssues),
          };
        }
        throw new Error(`Epic FHIR search ${path} failed with HTTP ${response.status}.`);
      }
      if (body.resourceType !== 'Bundle') {
        return {
          resources,
          diagnostic: sourceDiagnostic(resourceType, 'search', response.status, body.resourceType, entryCount, resources.length, outcomeIssues),
        };
      }
      for (const entry of body.entry ?? []) {
        entryCount += 1;
        if (entry.resource) outcomeIssues.push(...outcomeIssuesFrom(entry.resource));
        if (entry.resource?.resourceType === resourceType) resources.push(entry.resource);
      }
      next = body.link?.find((link) => link.relation === 'next')?.url;
    }
    return {
      resources,
      diagnostic: sourceDiagnostic(resourceType, 'search', 200, firstFhirType, entryCount, resources.length, outcomeIssues),
    };
  }

  private async fhirSearchPreviewPaths(
    resourceType: string,
    paths: string[],
    accessToken: string,
  ): Promise<{ resources: EpicFhirResource[]; diagnostic: EpicSourceDiagnostic }> {
    if (paths.length === 1) return this.fhirSearchPreview(resourceType, paths[0], accessToken);
    const resources = new Map<string, EpicFhirResource>();
    const diagnostics: EpicSourceDiagnostic[] = [];
    for (const path of paths) {
      const result = await this.fhirSearchPreview(resourceType, path, accessToken);
      diagnostics.push(result.diagnostic);
      for (const resource of result.resources) resources.set(resourceIdentity(resource), resource);
    }
    const uniqueResources = Array.from(resources.values());
    return {
      resources: uniqueResources,
      diagnostic: aggregateSearchDiagnostics(resourceType, diagnostics, uniqueResources, paths.length),
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

  private oauthClientId(): string {
    return this.config.connectFlow === 'dynamic_jwt_bearer'
      ? this.requireDynamicClientId()
      : this.config.dynamicClientId ?? this.requireClientId();
  }

  private requireDynamicClientId(): string {
    if (!this.config.dynamicClientId) throw new Error('EPIC_DYNAMIC_CLIENT_ID is required for Epic dynamic JWT bearer access.');
    return this.config.dynamicClientId;
  }

  private requireRedirectUri(): string {
    if (!this.config.redirectUri) throw new Error('EPIC_REDIRECT_URI is required for live Epic access.');
    return this.config.redirectUri;
  }

  private applyTokenClientAuthentication(params: URLSearchParams, tokenEndpoint: string): Record<string, string> {
    const method = this.effectiveClientAuthMethod();
    if (method === 'client_secret_basic') {
      const credentials = `${formEncode(this.oauthClientId())}:${formEncode(this.requireClientSecret())}`;
      return { authorization: `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}` };
    }
    if (method === 'private_key_jwt') {
      params.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
      params.set('client_assertion', this.clientAssertion(tokenEndpoint));
      return {};
    }
    params.set('client_id', this.oauthClientId());
    return {};
  }

  private effectiveClientAuthMethod(): 'none' | 'client_secret_basic' | 'private_key_jwt' {
    if (this.config.clientAuthMethod === 'private_key_jwt') return 'private_key_jwt';
    if (this.config.clientAuthMethod === 'client_secret_basic') return 'client_secret_basic';
    if (this.config.clientAuthMethod === 'none') return 'none';
    if (this.config.clientAssertionPrivateKey) return 'private_key_jwt';
    if (this.config.clientSecret) return 'client_secret_basic';
    return 'none';
  }

  private requireClientSecret(): string {
    if (!this.config.clientSecret) throw new Error('EPIC_CLIENT_SECRET or EPIC_CLIENT_SECRET_FILE is required for client_secret_basic Epic authentication.');
    return this.config.clientSecret;
  }

  private clientAssertion(tokenEndpoint: string, subject = this.oauthClientId()): string {
    return this.signedJwtAssertion({
      audience: tokenEndpoint,
      issuer: subject,
      subject,
    });
  }

  private jwtBearerGrantAssertion(subject = this.requireDynamicClientId()): string {
    return this.signedJwtAssertion({
      audience: ensureTrailingSlash(this.requireFhirBaseUrl()),
      issuer: subject,
      subject,
    });
  }

  private signedJwtAssertion({
    audience,
    issuer,
    subject,
  }: {
    audience: string;
    issuer: string;
    subject: string;
  }): string {
    const privateKey = this.config.clientAssertionPrivateKey;
    if (!privateKey) {
      throw new Error('EPIC_CLIENT_ASSERTION_PRIVATE_KEY_FILE or EPIC_CLIENT_ASSERTION_PRIVATE_KEY is required for Epic JWT authentication.');
    }
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: this.config.clientAssertionAlgorithm,
      typ: 'JWT',
      ...(this.config.clientAssertionKeyId ? { kid: this.config.clientAssertionKeyId } : {}),
    };
    const payload = {
      iss: issuer,
      sub: subject,
      aud: audience,
      jti: randomUUID(),
      exp: now + 300,
      nbf: now - 60,
      iat: now,
    };
    const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
    const signer = createSign(this.config.clientAssertionAlgorithm === 'RS256' ? 'RSA-SHA256' : 'RSA-SHA384');
    signer.update(signingInput);
    signer.end();
    return `${signingInput}.${signer.sign(privateKey).toString('base64url')}`;
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

function base64UrlJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function fhirSearchPath(resourceType: string, params: Record<string, string>): string {
  return `${resourceType}?${new URLSearchParams(params).toString()}`;
}

function resourceIdentity(resource: EpicFhirResource): string {
  const id = typeof resource.id === 'string' && resource.id.length > 0
    ? resource.id
    : createHash('sha256').update(JSON.stringify(resource)).digest('hex');
  return `${resource.resourceType ?? 'Resource'}/${id}`;
}

function aggregateSearchDiagnostics(
  resourceType: string,
  diagnostics: EpicSourceDiagnostic[],
  resources: EpicFhirResource[],
  queryProfileCount: number,
): EpicSourceDiagnostic {
  const entryCount = diagnostics.reduce((sum, diagnostic) => sum + diagnostic.entryCount, 0);
  const outcomeIssues = uniqueOutcomeIssues(diagnostics.flatMap((diagnostic) => diagnostic.outcomeIssues ?? []));
  const attention = diagnostics.find((diagnostic) => diagnostic.status === 'attention');
  const okBundle = diagnostics.find((diagnostic) => diagnostic.httpStatus === 200 && diagnostic.fhirResourceType === 'Bundle');
  const primary = resources.length > 0 ? okBundle ?? diagnostics[0] : attention ?? okBundle ?? diagnostics[0];
  const status = resources.length > 0
    ? 'mapped'
    : attention
      ? 'attention'
      : 'empty';
  const issueDetail = summarizeOutcomeIssues(outcomeIssues);
  const baseDetail = resources.length > 0
    ? `${resourceType} returned ${resources.length} mappable resource(s) across ${queryProfileCount} Epic query profile(s).`
    : `${resourceType} returned no mappable resources across ${queryProfileCount} Epic query profile(s).`;
  return {
    resourceType,
    operation: 'search',
    status,
    httpStatus: primary?.httpStatus,
    fhirResourceType: primary?.fhirResourceType,
    entryCount,
    mappableCount: resources.length,
    detail: issueDetail ? `${baseDetail}; ${issueDetail}.` : baseDetail,
    outcomeIssues: outcomeIssues.length > 0 ? outcomeIssues.slice(0, 6) : undefined,
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
  outcomeIssues: EpicOperationOutcomeIssue[] = [],
): EpicSourceDiagnostic {
  const status: EpicSourceDiagnostic['status'] = mappableCount > 0
    ? 'mapped'
    : httpStatus === 200 ? 'empty' : 'attention';
  const issueDetail = summarizeOutcomeIssues(outcomeIssues);
  const detail = status === 'mapped'
    ? `${resourceType} returned ${mappableCount} mappable record${mappableCount === 1 ? '' : 's'}${issueDetail}.`
    : httpStatus === 200
      ? `${resourceType} returned no mappable records${entryCount > 0 ? ` (${entryCount} non-domain entr${entryCount === 1 ? 'y' : 'ies'} such as OperationOutcome)` : ''}${issueDetail}.`
      : `${resourceType} ${operation} returned HTTP ${httpStatus}${fhirResourceType ? ` (${fhirResourceType})` : ''}${issueDetail}; preview skipped this family.`;
  return {
    resourceType,
    operation,
    status,
    httpStatus,
    fhirResourceType,
    entryCount,
    mappableCount,
    outcomeIssues: outcomeIssues.length > 0 ? uniqueOutcomeIssues(outcomeIssues).slice(0, 6) : undefined,
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

function outcomeIssuesFrom(resource: unknown): EpicOperationOutcomeIssue[] {
  if (!resource || typeof resource !== 'object') return [];
  const value = resource as { resourceType?: unknown; issue?: unknown };
  if (value.resourceType !== 'OperationOutcome' || !Array.isArray(value.issue)) return [];
  return value.issue
    .filter((issue): issue is Record<string, unknown> => Boolean(issue) && typeof issue === 'object')
    .map((issue) => ({
      severity: typeof issue.severity === 'string' ? issue.severity : undefined,
      code: typeof issue.code === 'string' ? issue.code : undefined,
      diagnosticsClass: sanitizeOutcomeDiagnostics(issue.diagnostics),
    }));
}

function sanitizeOutcomeDiagnostics(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/gi, '[redacted-email]')
    .replace(/\bPatient\/[A-Za-z0-9._-]+\b/g, 'Patient/[redacted]')
    .replace(/\b[A-Za-z0-9_-]{16,}\b/g, '[redacted-id]')
    .slice(0, 180);
}

function uniqueOutcomeIssues(issues: EpicOperationOutcomeIssue[]): EpicOperationOutcomeIssue[] {
  const seen = new Set<string>();
  const unique: EpicOperationOutcomeIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.severity ?? ''}|${issue.code ?? ''}|${issue.diagnosticsClass ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(issue);
  }
  return unique;
}

function summarizeOutcomeIssues(issues: EpicOperationOutcomeIssue[]): string {
  const unique = uniqueOutcomeIssues(issues);
  if (unique.length === 0) return '';
  const summary = unique
    .slice(0, 3)
    .map((issue) => [issue.severity, issue.code].filter(Boolean).join('/'))
    .filter(Boolean)
    .join(', ');
  return summary ? `; OperationOutcome ${summary}` : '; OperationOutcome details present';
}
