import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { EpicRuntimeConfig } from '../../runtimeConfig';
import type { DomainRepository } from '../../httpApp';
import { ValidationError } from '../../errors';
import { summarizeReconciliation } from '../../reconciliation';
import { nowIso } from '../../utils/rdfUtils';
import { decryptJson, encryptJson } from './crypto';
import { mapEpicResourcesToPim } from './mapper';
import { mockAnnualWellnessResources } from './mockFhir';
import { EpicSmartClient, grantNeedsRefresh, type FhirCapabilityStatement } from './smartClient';
import type {
  EpicApplyResult,
  EpicAuditEvent,
  EpicConnectionPublicStatus,
  EpicConnectionRecord,
  EpicDiagnosticCheck,
  EpicDiagnostics,
  EpicGrant,
  EpicImportCandidate,
  EpicImportPreview,
  EpicMvpDomain,
  EpicRegistrationReadiness,
  EpicResourceSupport,
  EpicSafeDiagnosticsExport,
  EpicSourceDiagnostic,
} from './types';
import { EpicConnectionPodRepository } from './podRepository';

type FetchLike = typeof fetch;

const EPIC_RESOURCE_FAMILIES: Array<{
  resourceType: string;
  pimDomains: EpicMvpDomain[];
  scopeResource: string;
}> = [
  { resourceType: 'Patient', pimDomains: ['profiles'], scopeResource: 'Patient' },
  { resourceType: 'Condition', pimDomains: ['conditions'], scopeResource: 'Condition' },
  { resourceType: 'MedicationRequest', pimDomains: ['medications'], scopeResource: 'MedicationRequest' },
  { resourceType: 'MedicationStatement', pimDomains: ['medications'], scopeResource: 'MedicationStatement' },
  { resourceType: 'AllergyIntolerance', pimDomains: ['allergies'], scopeResource: 'AllergyIntolerance' },
  { resourceType: 'Immunization', pimDomains: ['immunizations'], scopeResource: 'Immunization' },
  { resourceType: 'Observation', pimDomains: ['vital-signs', 'lab-results'], scopeResource: 'Observation' },
  { resourceType: 'DiagnosticReport', pimDomains: ['lab-results', 'documents'], scopeResource: 'DiagnosticReport' },
  { resourceType: 'Coverage', pimDomains: ['insurance-policies'], scopeResource: 'Coverage' },
  { resourceType: 'DocumentReference', pimDomains: ['documents'], scopeResource: 'DocumentReference' },
  { resourceType: 'Task', pimDomains: ['workflow-tasks'], scopeResource: 'Task' },
  { resourceType: 'Communication', pimDomains: ['workflow-tasks'], scopeResource: 'Communication' },
  { resourceType: 'Questionnaire', pimDomains: ['workflow-tasks', 'documents'], scopeResource: 'Questionnaire' },
  { resourceType: 'QuestionnaireResponse', pimDomains: ['workflow-tasks', 'documents'], scopeResource: 'QuestionnaireResponse' },
  { resourceType: 'ServiceRequest', pimDomains: ['workflow-tasks'], scopeResource: 'ServiceRequest' },
  { resourceType: 'CarePlan', pimDomains: ['workflow-tasks'], scopeResource: 'CarePlan' },
  { resourceType: 'Goal', pimDomains: ['workflow-tasks'], scopeResource: 'Goal' },
  { resourceType: 'Practitioner', pimDomains: ['providers'], scopeResource: 'Practitioner' },
  { resourceType: 'Organization', pimDomains: ['providers'], scopeResource: 'Organization' },
  { resourceType: 'Binary', pimDomains: ['documents'], scopeResource: 'Binary' },
];

export class EpicIntegrationService {
  private readonly smartClient: EpicSmartClient;

  constructor(
    private readonly config: EpicRuntimeConfig,
    private readonly connectionRepository: EpicConnectionPodRepository | undefined,
    private readonly repositories: Record<string, DomainRepository>,
    httpFetch: FetchLike = fetch,
  ) {
    this.smartClient = new EpicSmartClient(config, httpFetch);
  }

  async initializeFromPod(): Promise<void> {
    if (!this.config.enabled || !this.connectionRepository) return;
    const existing = await this.connectionRepository.get();
    if (!existing) return;
    const updated = this.withAudit({
      ...existing,
      lastStartupAt: nowIso(),
    }, 'startup', 'ok', 'Epic connection state loaded from owner Solid pod.');
    await this.connectionRepository.save(updated);
    if (this.config.syncOnStartup && updated.status === 'connected') {
      await this.apply({});
    }
  }

  async status(): Promise<EpicConnectionPublicStatus> {
    if (!this.config.enabled || !this.connectionRepository) {
      return {
        enabled: false,
        mode: this.config.mode,
        status: 'disabled',
        requestedScopes: this.config.scopes,
        grantedScopes: [],
      };
    }
    const record = await this.connectionRepository.get();
    if (!record) {
      return {
        enabled: true,
        mode: this.config.mode,
        status: 'not-connected',
        fhirBaseUrl: this.config.fhirBaseUrl,
        requestedScopes: this.config.scopes,
        grantedScopes: [],
      };
    }
    return this.publicStatus(record);
  }

  async diagnostics(options: { live?: boolean } = {}): Promise<EpicDiagnostics> {
    const checks: EpicDiagnosticCheck[] = [];
    const checkedAt = nowIso();
    const live = options.live === true;
    let liveDiscoveryReadiness: EpicRegistrationReadiness['liveDiscoveryReadiness'] = live ? 'failed' : 'not-requested';
    let resourceSupport = this.resourceSupport();
    const add = (name: string, status: EpicDiagnosticCheck['status'], detail: string): void => {
      checks.push({ name, status, detail });
    };

    if (!this.config.enabled) {
      add('epic-enabled', 'skipped', 'Epic integration is disabled; localhost MVP can run Solid-only.');
      return this.diagnosticsResult(checks, checkedAt, live, this.registrationReadiness('skipped'), resourceSupport);
    }

    add('epic-enabled', 'ok', 'Epic integration is enabled for this localhost deployment.');
    add('mode', 'ok', `Epic mode is ${this.config.mode}.`);
    add('connect-flow', 'ok', `Epic connect flow is ${this.config.connectFlow}.`);
    add('client-auth-method', 'ok', `Epic token client authentication method is ${this.config.clientAuthMethod}.`);
    add('grant-encryption-key', this.config.encryptionKey ? 'ok' : 'failed', this.config.encryptionKey
      ? 'Grant encryption key is configured; value is not reported.'
      : 'EPIC_GRANT_ENCRYPTION_KEY is required when Epic is enabled.');
    add('scopes', this.config.scopes.length > 0 ? 'ok' : 'failed', this.config.scopes.length > 0
      ? `${this.config.scopes.length} SMART/FHIR scopes are configured.`
      : 'At least one SMART/FHIR scope is required.');

    if (this.config.mode === 'mock') {
      add('fhir-base-url', 'skipped', 'Mock mode uses deterministic synthetic FHIR resources and does not require EPIC_FHIR_BASE_URL.');
      add('client-id', 'skipped', 'Mock mode does not require EPIC_CLIENT_ID.');
      add('redirect-uri', 'ok', this.config.redirectUri
        ? 'Mock mode redirect URI is configured.'
        : 'Mock mode will use the local Epic callback path.');
      add('smart-discovery', 'skipped', 'SMART discovery is skipped in mock mode.');
      resourceSupport = this.resourceSupport(undefined, 'not-checked');
      return this.diagnosticsResult(checks, checkedAt, live, this.registrationReadiness('skipped'), resourceSupport);
    }

    add('fhir-base-url', this.config.fhirBaseUrl ? 'ok' : 'failed', this.config.fhirBaseUrl
      ? 'Epic FHIR base URL is configured.'
      : 'EPIC_FHIR_BASE_URL is required for sandbox/production mode.');
    add('client-id', this.config.clientId ? 'ok' : 'failed', this.config.clientId
      ? 'Epic SMART client id is configured.'
      : 'EPIC_CLIENT_ID is required for sandbox/production mode.');
    add('redirect-uri', this.config.redirectUri ? 'ok' : 'failed', this.config.redirectUri
      ? 'Epic SMART redirect URI is configured.'
      : 'EPIC_REDIRECT_URI is required for sandbox/production mode.');
    if (this.config.connectFlow === 'dynamic_jwt_bearer') {
      add('dynamic-client-id', this.config.dynamicClientId ? 'ok' : 'failed', this.config.dynamicClientId
        ? 'Epic dynamic client id is configured; value is not reported.'
        : 'EPIC_DYNAMIC_CLIENT_ID is required for dynamic JWT bearer connection.');
      add('jwt-bearer-audience', 'ok', 'Dynamic JWT bearer assertions use the discovered Epic token endpoint as the JWT aud claim.');
    }
    if (this.config.connectFlow === 'dynamic_jwt_bearer' || this.config.clientAuthMethod === 'private_key_jwt') {
      add('client-assertion-key', this.config.clientAssertionPrivateKey ? 'ok' : 'failed', this.config.clientAssertionPrivateKey
        ? `Epic JWT signing key is configured for ${this.config.clientAssertionAlgorithm}; key material is not reported.`
        : 'EPIC_CLIENT_ASSERTION_PRIVATE_KEY_FILE or EPIC_CLIENT_ASSERTION_PRIVATE_KEY is required for JWT bearer/private_key_jwt authentication.');
    }
    if (this.config.connectFlow === 'dynamic_jwt_bearer') {
      for (const check of dynamicClientArtifactChecks(this.config)) {
        checks.push(check);
      }
    }

    if (!live) {
      add('smart-discovery', 'skipped', 'Live SMART discovery was not requested; use ?live=true for a network diagnostic.');
      return this.diagnosticsResult(checks, checkedAt, live, this.registrationReadiness('not-requested'), resourceSupport);
    }

    try {
      const discovery = await this.smartClient.discover();
      liveDiscoveryReadiness = 'ready';
      add('smart-discovery', 'ok', 'SMART configuration was discovered from the Epic FHIR base URL.');
      add('authorization-endpoint', discovery.authorization_endpoint ? 'ok' : 'failed', discovery.authorization_endpoint
        ? 'SMART authorization endpoint is present.'
        : 'SMART discovery did not report authorization_endpoint.');
      add('token-endpoint', discovery.token_endpoint ? 'ok' : 'failed', discovery.token_endpoint
        ? 'SMART token endpoint is present.'
        : 'SMART discovery did not report token_endpoint.');
      if (Array.isArray(discovery.scopes_supported) && discovery.scopes_supported.length > 0) {
        const missing = this.config.scopes.filter((scope) => !discovery.scopes_supported?.includes(scope));
        add('scope-support', missing.length === 0 ? 'ok' : 'warning', missing.length === 0
          ? 'Configured scopes are listed by SMART discovery.'
          : `SMART discovery did not list ${missing.length} configured scope(s): ${missing.join(', ')}`);
      } else {
        add('scope-support', 'warning', 'SMART discovery did not publish scopes_supported; configured scopes could not be compared.');
      }
    } catch (error) {
      liveDiscoveryReadiness = 'failed';
      add('smart-discovery', 'failed', error instanceof Error ? error.message : 'SMART discovery failed.');
    }

    try {
      const capability = await this.smartClient.capabilityStatement();
      add('fhir-capability-statement', 'ok', 'FHIR CapabilityStatement was retrieved from the Epic FHIR metadata endpoint.');
      resourceSupport = this.resourceSupport(capability);
      const unsupportedConfigured = resourceSupport
        .filter((resource) => resource.configuredScopePresent && resource.capability === 'unsupported')
        .map((resource) => resource.resourceType);
      const missingScopes = resourceSupport
        .filter((resource) => !resource.configuredScopePresent)
        .map((resource) => resource.resourceType);
      if (unsupportedConfigured.length > 0) {
        add('resource-support', 'warning', `CapabilityStatement did not list ${unsupportedConfigured.length} configured resource type(s): ${unsupportedConfigured.join(', ')}`);
        liveDiscoveryReadiness = liveDiscoveryReadiness === 'failed' ? 'failed' : 'attention';
      } else {
        add('resource-support', 'ok', 'Configured Epic resource families are listed by the CapabilityStatement or not required by the current scope set.');
      }
      if (missingScopes.length > 0) {
        add('resource-scope-readiness', 'warning', `${missingScopes.length} roadmap resource type(s) do not have matching configured patient read scopes: ${missingScopes.join(', ')}`);
        liveDiscoveryReadiness = liveDiscoveryReadiness === 'failed' ? 'failed' : 'attention';
      } else {
        add('resource-scope-readiness', 'ok', 'Configured scopes cover all roadmap Epic resource families.');
      }
    } catch (error) {
      resourceSupport = this.resourceSupport(undefined, 'unknown');
      add('fhir-capability-statement', 'failed', error instanceof Error ? error.message : 'FHIR CapabilityStatement lookup failed.');
      liveDiscoveryReadiness = 'failed';
    }

    return this.diagnosticsResult(checks, checkedAt, live, this.registrationReadiness(liveDiscoveryReadiness), resourceSupport);
  }

  async connectStart(): Promise<Record<string, unknown>> {
    this.requireEnabled();
    const state = randomUUID();
    const now = nowIso();
    const fhirBaseUrl = this.config.fhirBaseUrl ?? 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
    if (this.config.mode !== 'mock' && this.config.connectFlow === 'dynamic_jwt_bearer') {
      const grant = await this.smartClient.exchangeJwtBearerGrant();
      if (!grant.patient) {
        throw new ValidationError('Epic JWT bearer token response did not include patient context.', [
          { field: 'patient', reason: 'dynamic client must be bound to an Epic patient context for personal data import' },
        ]);
      }
      const record = this.withAudit({
        status: 'connected',
        mode: this.config.mode,
        fhirBaseUrl,
        issuer: fhirBaseUrl,
        patientId: grant.patient,
        requestedScopes: this.config.scopes,
        grantedScopes: grant.scope?.split(/\s+/).filter(Boolean) ?? this.config.scopes,
        connectedAt: now,
        encryptedGrant: encryptJson(grant, this.config.encryptionKey as string),
        audit: [],
      }, 'connect-start', 'ok', 'Epic dynamic client JWT bearer grant completed and encrypted grant stored in the owner pod.');
      await this.connectionRepository?.save(record);
      return {
        mode: this.config.mode,
        connectFlow: this.config.connectFlow,
        connected: true,
        status: record.status,
        scopes: this.config.scopes,
        startedAt: now,
      };
    }
    const smartStart = this.config.mode === 'mock'
      ? undefined
      : await this.smartClient.startAuthorization(state);
    const record = this.withAudit({
      status: 'authorization-started',
      mode: this.config.mode,
      fhirBaseUrl,
      issuer: fhirBaseUrl,
      requestedScopes: this.config.scopes,
      grantedScopes: [],
      lastAuthorizationState: state,
      encryptedPkceCodeVerifier: smartStart?.codeVerifier
        ? encryptJson({ codeVerifier: smartStart.codeVerifier }, this.config.encryptionKey as string)
        : undefined,
      authorizationEndpoint: smartStart?.configuration.authorization_endpoint,
      tokenEndpoint: smartStart?.configuration.token_endpoint,
      audit: [],
    }, 'connect-start', 'ok', this.config.mode === 'mock'
      ? 'Started Epic mock authorization flow.'
      : 'Started Epic SMART authorization flow with discovery and PKCE.');
    await this.connectionRepository?.save(record);

    const callback = this.config.redirectUri ?? '/api/integrations/epic/connect/callback';
    const authorizationUrl = this.config.mode === 'mock'
      ? `${callback}?code=mock-authorization-code&state=${encodeURIComponent(state)}`
      : smartStart?.authorizationUrl;

    return {
      mode: this.config.mode,
      connectFlow: this.config.connectFlow,
      authorizationUrl,
      state,
      scopes: this.config.scopes,
      pkce: this.config.mode === 'mock' ? undefined : 'S256',
      startedAt: now,
    };
  }

  async connectCallback(query: URLSearchParams): Promise<EpicConnectionPublicStatus> {
    this.requireEnabled();
    const code = query.get('code')?.trim();
    const state = query.get('state')?.trim();
    if (!code) throw new ValidationError('Epic authorization callback requires a code.', [{ field: 'code', reason: 'code is required' }]);
    const existing = await this.connectionRepository?.get();
    if (existing?.lastAuthorizationState && existing.lastAuthorizationState !== state) {
      throw new ValidationError('Epic authorization state did not match the pod-owned connection request.', [{ field: 'state', reason: 'state mismatch' }]);
    }
    const connectedAt = nowIso();
    const grant = this.config.mode === 'mock'
      ? this.mockGrant()
      : await this.exchangeLiveGrant(code, existing);
    const patientId = grant.patient ?? (this.config.mode === 'mock' ? 'epic-patient-mock-001' : undefined);
    if (!patientId) {
      throw new ValidationError('Epic SMART token response did not include patient context.', [
        { field: 'patient', reason: 'launch/patient context is required for personal data import' },
      ]);
    }
    const record = this.withAudit({
      status: 'connected',
      mode: this.config.mode,
      fhirBaseUrl: this.config.fhirBaseUrl ?? existing?.fhirBaseUrl ?? 'mock://epic-fhir',
      issuer: this.config.fhirBaseUrl ?? existing?.issuer ?? 'mock://epic-fhir',
      patientId,
      requestedScopes: this.config.scopes,
      grantedScopes: grant.scope?.split(/\s+/).filter(Boolean) ?? this.config.scopes,
      lastAuthorizationState: state,
      authorizationEndpoint: existing?.authorizationEndpoint,
      tokenEndpoint: existing?.tokenEndpoint,
      connectedAt,
      encryptedGrant: encryptJson(grant, this.config.encryptionKey as string),
      audit: existing?.audit ?? [],
    }, 'connect-callback', 'ok', this.config.mode === 'mock'
      ? 'Epic mock authorization completed and encrypted grant stored in the owner pod.'
      : 'Epic SMART token exchange completed and encrypted grant stored in the owner pod.');
    await this.connectionRepository?.save(record);
    return this.publicStatus(record);
  }

  async disconnect(): Promise<EpicConnectionPublicStatus> {
    this.requireEnabled();
    const existing = await this.connectionRepository?.get();
    const record = this.withAudit({
      status: 'disconnected',
      mode: this.config.mode,
      fhirBaseUrl: existing?.fhirBaseUrl ?? this.config.fhirBaseUrl,
      patientId: existing?.patientId,
      requestedScopes: existing?.requestedScopes ?? this.config.scopes,
      grantedScopes: [],
      disconnectedAt: nowIso(),
      audit: existing?.audit ?? [],
    }, 'disconnect', 'ok', 'Epic grant removed from active connection state.');
    await this.connectionRepository?.save(record);
    return this.publicStatus(record);
  }

  async preview(_body: Record<string, unknown> = {}): Promise<EpicImportPreview> {
    const record = await this.connectedRecord();
    const active = await this.ensureFreshGrant(record);
    const generatedAt = nowIso();
    const importJobId = `epic-import-${Date.now()}`;
    const fetchResult = this.config.mode === 'mock'
      ? mockPatientResourceFetch()
      : await this.smartClient.fetchPatientResourcePreview(active.grant, record.patientId as string);
    const resources = fetchResult.resources;
    const mapped = mapEpicResourcesToPim(resources, {
      fhirBaseUrl: record.fhirBaseUrl ?? 'mock://epic-fhir',
      patientId: record.patientId as string,
      authorizationGrantId: record.connectedAt,
      importedAt: generatedAt,
    });
    const changes = await this.reconcile(mapped);
    return {
      importJobId,
      source: this.config.mode === 'mock' ? 'mock' : 'epic',
      generatedAt,
      hasPatientContext: Boolean(record.patientId),
      sourceDiagnostics: fetchResult.sourceDiagnostics,
      changes,
      reconciliationSummary: summarizeReconciliation(changes),
    };
  }

  async apply(body: Record<string, unknown> = {}): Promise<EpicApplyResult> {
    const preview = await this.preview(body);
    const selectedDomains = selectedDomainSet(body);
    const created = Object.fromEntries(
      ['profiles', 'conditions', 'medications', 'allergies', 'immunizations', 'vital-signs', 'providers', 'lab-results', 'insurance-policies', 'documents', 'workflow-tasks']
        .map((domain) => [domain, 0]),
    ) as Record<EpicMvpDomain, number>;
    const resources: EpicApplyResult['resources'] = [];
    for (const change of preview.changes) {
      if (selectedDomains && !selectedDomains.has(change.domain)) continue;
      const repository = this.repositories[change.domain];
      if (!repository) continue;
      if (change.action === 'unchanged' || change.action === 'conflict') continue;
      const saved = change.action === 'update' && change.targetUrl
        ? await repository.update({ ...(change.entity as unknown as Record<string, unknown>), url: change.targetUrl } as never) as { url?: string }
        : await repository.create(change.entity as never) as { url?: string };
      created[change.domain] += 1;
      resources.push({
        domain: change.domain,
        url: saved.url,
        display: change.display,
        provenance: change.provenance,
      });
    }
    const existing = await this.connectedRecord();
    await this.connectionRepository?.save(this.withAudit({
      ...existing,
      lastSyncAt: nowIso(),
      lastImportJobId: preview.importJobId,
    }, 'sync-apply', 'ok', `Applied ${resources.length} Epic import candidates to the owner pod.`));

    return {
      importJobId: preview.importJobId,
      appliedAt: nowIso(),
      created,
      resources,
    };
  }

  private async reconcile(changes: EpicImportCandidate[]): Promise<EpicImportCandidate[]> {
    const byDomain = new Map<EpicMvpDomain, EpicImportCandidate[]>();
    for (const change of changes) {
      byDomain.set(change.domain, [...(byDomain.get(change.domain) ?? []), change]);
    }

    const reconciled: EpicImportCandidate[] = [];
    for (const [domain, domainChanges] of byDomain) {
      const repository = this.repositories[domain];
      const existing = repository ? await repository.findAll() as Array<Record<string, unknown>> : [];
      for (const change of domainChanges) {
        const key = reconciliationKey(change.domain, change.entity as unknown as Record<string, unknown>);
        const matches = key
          ? existing.filter((record) => reconciliationKey(change.domain, record) === key)
          : [];
        if (matches.length === 0) {
          reconciled.push({
            ...change,
            action: 'create',
            reconciliation: { status: 'new', detail: 'No matching local pod record was found.' },
          });
          continue;
        }
        if (matches.length > 1) {
          reconciled.push({
            ...change,
            action: 'conflict',
            reconciliation: { status: 'ambiguous', detail: `${matches.length} local pod records match this Epic candidate; review manually before applying.` },
          });
          continue;
        }
        const [match] = matches;
        const targetUrl = typeof match.url === 'string' ? match.url : undefined;
        const incomingSignature = comparableSignature(change.entity as unknown as Record<string, unknown>);
        const existingSignature = comparableSignature(match);
        if (incomingSignature === existingSignature) {
          reconciled.push({
            ...change,
            action: 'unchanged',
            targetUrl,
            reconciliation: { status: 'matched', detail: 'A matching local pod record already has the same normalized values.' },
          });
        } else {
          reconciled.push({
            ...change,
            action: targetUrl ? 'update' : 'conflict',
            targetUrl,
            reconciliation: targetUrl
              ? { status: 'changed', detail: 'A matching local pod record exists with different normalized values and can be updated.' }
              : { status: 'ambiguous', detail: 'A matching local pod record exists but has no URL for safe update.' },
          });
        }
      }
    }
    return reconciled;
  }

  async audit(): Promise<EpicAuditEvent[]> {
    const record = await this.connectionRepository?.get();
    return record?.audit ?? [];
  }

  private async connectedRecord(): Promise<EpicConnectionRecord> {
    this.requireEnabled();
    const record = await this.connectionRepository?.get();
    if (!record || record.status !== 'connected' || !record.patientId) {
      throw new ValidationError('Epic is not connected for this pod owner.', [{ field: 'epic.status', reason: 'connect Epic before importing' }]);
    }
    return record;
  }

  private async exchangeLiveGrant(code: string, existing: EpicConnectionRecord | null | undefined): Promise<EpicGrant> {
    if (!existing?.encryptedPkceCodeVerifier) {
      throw new ValidationError('Epic authorization state is missing its PKCE verifier.', [
        { field: 'encryptedPkceCodeVerifier', reason: 'start Epic authorization before callback' },
      ]);
    }
    const pending = decryptJson<{ codeVerifier: string }>(
      existing.encryptedPkceCodeVerifier,
      this.config.encryptionKey as string,
    );
    return this.smartClient.exchangeCode(code, pending.codeVerifier);
  }

  private async ensureFreshGrant(record: EpicConnectionRecord): Promise<{ record: EpicConnectionRecord; grant: EpicGrant }> {
    if (!record.encryptedGrant) {
      throw new ValidationError('Epic grant material is missing; reconnect is required.', [
        { field: 'encryptedGrant', reason: 'missing encrypted grant' },
      ]);
    }
    let grant = decryptJson<EpicGrant>(record.encryptedGrant, this.config.encryptionKey as string);
    if (this.config.mode !== 'mock' && grantNeedsRefresh(grant)) {
      grant = await this.smartClient.refreshGrant(grant);
      const refreshed = this.withAudit({
        ...record,
        encryptedGrant: encryptJson(grant, this.config.encryptionKey as string),
        grantedScopes: grant.scope?.split(/\s+/).filter(Boolean) ?? record.grantedScopes,
        patientId: grant.patient ?? record.patientId,
      }, 'token-refresh', 'ok', 'Epic access token refreshed using encrypted pod-owned grant state.');
      await this.connectionRepository?.save(refreshed);
      return { record: refreshed, grant };
    }
    return { record, grant };
  }

  private mockGrant(): EpicGrant {
    return {
      accessToken: `${this.config.mode}-access-token`,
      refreshToken: `${this.config.mode}-refresh-token`,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      scope: this.config.scopes.join(' '),
      patient: 'epic-patient-mock-001',
      issuedAt: nowIso(),
    };
  }

  private requireEnabled(): void {
    if (!this.config.enabled || !this.connectionRepository) {
      throw new ValidationError('Epic integration is disabled for this deployment.', [{ field: 'EPIC_ENABLED', reason: 'set EPIC_ENABLED=true to use Epic integration APIs' }]);
    }
  }

  private publicStatus(record: EpicConnectionRecord): EpicConnectionPublicStatus {
    return {
      enabled: true,
      mode: record.mode,
      status: record.status,
      fhirBaseUrl: record.fhirBaseUrl,
      hasPatientContext: Boolean(record.patientId),
      requestedScopes: record.requestedScopes,
      grantedScopes: record.grantedScopes,
      connectedAt: record.connectedAt,
      disconnectedAt: record.disconnectedAt,
      lastStartupAt: record.lastStartupAt,
      lastSyncAt: record.lastSyncAt,
      lastImportJobId: record.lastImportJobId,
      lastError: record.lastError,
    };
  }

  private diagnosticsResult(
    checks: EpicDiagnosticCheck[],
    checkedAt: string,
    live: boolean,
    registration: EpicRegistrationReadiness,
    resourceSupport: EpicResourceSupport[],
  ): EpicDiagnostics {
    const hasFailure = checks.some((check) => check.status === 'failed');
    const hasWarning = checks.some((check) => check.status === 'warning');
    const readiness: EpicDiagnostics['readiness'] = hasFailure ? 'failed' : hasWarning ? 'attention' : this.config.enabled ? 'ready' : 'disabled';
    const safeExport: EpicSafeDiagnosticsExport = {
      generatedAt: checkedAt,
      localhostMvp: true as const,
      enabled: this.config.enabled,
      mode: this.config.mode,
      readiness,
      live,
      registration,
      resourceSupport,
      checks,
    };
    return {
      enabled: this.config.enabled,
      mode: this.config.mode,
      readiness,
      checkedAt,
      live,
      localhostMvp: true,
      registration,
      resourceSupport,
      safeExport,
      checks,
    };
  }

  private registrationReadiness(liveDiscoveryReadiness: EpicRegistrationReadiness['liveDiscoveryReadiness']): EpicRegistrationReadiness {
    const fhirBase = safeUrlParts(this.config.fhirBaseUrl);
    const redirect = safeUrlParts(this.config.redirectUri);
    return {
      localhostMvp: true,
      mode: this.config.mode,
      configured: {
        fhirBaseUrl: Boolean(this.config.fhirBaseUrl),
        fhirBaseUrlHost: fhirBase?.host,
        clientId: Boolean(this.config.clientId),
        dynamicClientId: Boolean(this.config.dynamicClientId),
        clientSecret: Boolean(this.config.clientSecret),
        clientAssertionPrivateKey: Boolean(this.config.clientAssertionPrivateKey),
        clientAssertionKeyId: Boolean(this.config.clientAssertionKeyId),
        clientAssertionAlgorithm: this.config.clientAssertionAlgorithm,
        connectFlow: this.config.connectFlow,
        clientAuthMethod: this.config.clientAuthMethod,
        redirectUri: Boolean(this.config.redirectUri),
        redirectUriHost: redirect?.host,
        redirectUriPath: redirect?.pathname,
        grantEncryptionKey: Boolean(this.config.encryptionKey),
        syncOnStartup: this.config.syncOnStartup,
      },
      requestedScopes: this.config.scopes,
      scopeCount: this.config.scopes.length,
      liveDiscoveryReadiness,
    };
  }

  private resourceSupport(
    capability?: FhirCapabilityStatement,
    fallback: EpicResourceSupport['capability'] = 'not-checked',
  ): EpicResourceSupport[] {
    const supportedResourceTypes = capabilityResourceTypes(capability);
    return EPIC_RESOURCE_FAMILIES.map((family) => {
      const configuredScopePresent = hasConfiguredReadScope(this.config.scopes, family.scopeResource);
      const capabilityStatus = supportedResourceTypes
        ? supportedResourceTypes.has(family.resourceType) ? 'supported' : 'unsupported'
        : fallback;
      return {
        resourceType: family.resourceType,
        pimDomains: family.pimDomains,
        configuredScopePresent,
        capability: capabilityStatus,
        detail: resourceSupportDetail(family.resourceType, configuredScopePresent, capabilityStatus),
      };
    });
  }

  private withAudit(
    record: EpicConnectionRecord,
    action: string,
    status: EpicAuditEvent['status'],
    detail?: string,
  ): EpicConnectionRecord {
    return {
      ...record,
      audit: [
        ...(record.audit ?? []),
        { at: nowIso(), action, status, detail },
      ].slice(-100),
    };
  }
}

function safeUrlParts(value: string | undefined): { host: string; pathname: string } | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return { host: url.host, pathname: url.pathname || '/' };
  } catch {
    return undefined;
  }
}

function dynamicClientArtifactChecks(config: EpicRuntimeConfig): EpicDiagnosticCheck[] {
  const checks: EpicDiagnosticCheck[] = [];
  const add = (name: string, status: EpicDiagnosticCheck['status'], detail: string): void => {
    checks.push({ name, status, detail });
  };
  const hasAnyArtifactPath = Boolean(
    config.dynamicClientPublicJwksFile
    || config.dynamicClientMetadataFile
    || config.dynamicClientRegistrationRequestFile,
  );
  if (!hasAnyArtifactPath) {
    add('dynamic-client-artifacts', 'skipped', 'Optional local dynamic-client artifact files are not configured; live token exchange can still run, but artifact consistency cannot be prechecked.');
    return checks;
  }

  if (config.dynamicClientPublicJwksFile) {
    const jwks = readJsonObject(config.dynamicClientPublicJwksFile);
    if (!jwks) {
      add('dynamic-client-jwks', 'failed', 'Configured local public JWKS file could not be read as JSON; path and key material are not reported.');
    } else {
      const key = Array.isArray(jwks.keys)
        ? jwks.keys.find((entry) => isRecord(entry) && entry.kid === config.clientAssertionKeyId)
        : undefined;
      add('dynamic-client-jwks-kid', key ? 'ok' : 'failed', key
        ? 'Configured KID is present in the local public JWKS.'
        : 'Configured KID was not found in the local public JWKS; values are not reported.');
      if (isRecord(key)) {
        add('dynamic-client-jwks-alg', key.alg === config.clientAssertionAlgorithm ? 'ok' : 'failed', key.alg === config.clientAssertionAlgorithm
          ? 'Configured signing algorithm matches the local public JWKS.'
          : 'Configured signing algorithm does not match the local public JWKS; values are not reported.');
      }
    }
  } else {
    add('dynamic-client-jwks', 'skipped', 'EPIC_DYNAMIC_CLIENT_PUBLIC_JWKS_FILE is not configured; KID/JWKS alignment was not prechecked.');
  }

  if (config.dynamicClientMetadataFile) {
    const metadata = readJsonObject(config.dynamicClientMetadataFile);
    if (!metadata) {
      add('dynamic-client-metadata', 'failed', 'Configured local dynamic-client metadata file could not be read as JSON; path and values are not reported.');
    } else {
      add('dynamic-client-metadata-client-id', metadata.issuerSubject === config.dynamicClientId ? 'ok' : 'failed', metadata.issuerSubject === config.dynamicClientId
        ? 'Configured dynamic client id matches local metadata issuer/subject.'
        : 'Configured dynamic client id does not match local metadata issuer/subject; values are not reported.');
      add('dynamic-client-metadata-software-id', metadata.softwareId === config.clientId ? 'ok' : 'failed', metadata.softwareId === config.clientId
        ? 'Configured Epic app client id matches local metadata software id.'
        : 'Configured Epic app client id does not match local metadata software id; values are not reported.');
      add('dynamic-client-metadata-fhir-base', normalizedUrlString(metadata.fhirBaseUrl) === normalizedUrlString(config.fhirBaseUrl) ? 'ok' : 'failed', normalizedUrlString(metadata.fhirBaseUrl) === normalizedUrlString(config.fhirBaseUrl)
        ? 'Configured FHIR base URL matches local dynamic-client metadata.'
        : 'Configured FHIR base URL does not match local dynamic-client metadata; values are not reported.');
      add('dynamic-client-metadata-redirect', normalizedUrlString(metadata.redirectUri) === normalizedUrlString(config.redirectUri) ? 'ok' : 'failed', normalizedUrlString(metadata.redirectUri) === normalizedUrlString(config.redirectUri)
        ? 'Configured redirect URI matches local dynamic-client metadata.'
        : 'Configured redirect URI does not match local dynamic-client metadata; values are not reported.');
    }
  } else {
    add('dynamic-client-metadata', 'skipped', 'EPIC_DYNAMIC_CLIENT_METADATA_FILE is not configured; dynamic-client metadata alignment was not prechecked.');
  }

  if (config.dynamicClientRegistrationRequestFile) {
    const registration = readJsonObject(config.dynamicClientRegistrationRequestFile);
    if (!registration) {
      add('dynamic-client-registration-request', 'failed', 'Configured local dynamic-client registration request file could not be read as JSON; path and values are not reported.');
    } else {
      const grantTypes = Array.isArray(registration.grant_types) ? registration.grant_types : [];
      add('dynamic-client-registration-software-id', registration.software_id === config.clientId ? 'ok' : 'failed', registration.software_id === config.clientId
        ? 'Configured Epic app client id matches the local registration request software_id.'
        : 'Configured Epic app client id does not match the local registration request software_id; values are not reported.');
      add('dynamic-client-registration-grant-type', grantTypes.includes('urn:ietf:params:oauth:grant-type:jwt-bearer') ? 'ok' : 'failed', grantTypes.includes('urn:ietf:params:oauth:grant-type:jwt-bearer')
        ? 'Local registration request includes the JWT bearer grant type.'
        : 'Local registration request does not include the JWT bearer grant type.');
      add('dynamic-client-registration-jwks', isRecord(registration.jwks) && Array.isArray(registration.jwks.keys) && registration.jwks.keys.length > 0 ? 'ok' : 'failed',
        isRecord(registration.jwks) && Array.isArray(registration.jwks.keys) && registration.jwks.keys.length > 0
          ? 'Local registration request includes a public JWKS.'
          : 'Local registration request does not include a usable public JWKS.');
    }
  } else {
    add('dynamic-client-registration-request', 'skipped', 'EPIC_DYNAMIC_CLIENT_REGISTRATION_REQUEST_FILE is not configured; DCR request alignment was not prechecked.');
  }

  return checks;
}

function readJsonObject(path: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizedUrlString(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    return new URL(value).href.replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}

function hasConfiguredReadScope(scopes: string[], resourceType: string): boolean {
  return scopes.some((scope) => {
    if (scope === 'patient/*.rs' || scope === 'patient/*.*' || scope === 'patient/*.read') return true;
    return scope === `patient/${resourceType}.rs`
      || scope === `patient/${resourceType}.read`
      || scope === `patient/${resourceType}.*`;
  });
}

function capabilityResourceTypes(capability: FhirCapabilityStatement | undefined): Set<string> | undefined {
  if (!capability) return undefined;
  const types = new Set<string>();
  for (const rest of capability.rest ?? []) {
    for (const resource of rest.resource ?? []) {
      if (typeof resource.type === 'string' && resource.type.trim()) types.add(resource.type);
    }
  }
  return types;
}

function resourceSupportDetail(
  resourceType: string,
  configuredScopePresent: boolean,
  capability: EpicResourceSupport['capability'],
): string {
  const scopeDetail = configuredScopePresent
    ? 'a matching patient read scope is configured'
    : 'no matching patient read scope is configured';
  if (capability === 'supported') return `${resourceType} is listed by the CapabilityStatement and ${scopeDetail}.`;
  if (capability === 'unsupported') return `${resourceType} was not listed by the CapabilityStatement; ${scopeDetail}.`;
  if (capability === 'unknown') return `${resourceType} support could not be determined from live metadata; ${scopeDetail}.`;
  return `${resourceType} support has not been checked live; ${scopeDetail}.`;
}

function selectedDomainSet(body: Record<string, unknown>): Set<EpicMvpDomain> | undefined {
  const domains = body.domains;
  if (!Array.isArray(domains) || domains.length === 0) return undefined;
  return new Set(domains.filter((domain): domain is EpicMvpDomain => typeof domain === 'string') as EpicMvpDomain[]);
}

function mockPatientResourceFetch(): { resources: ReturnType<typeof mockAnnualWellnessResources>; sourceDiagnostics: EpicSourceDiagnostic[] } {
  const resources = mockAnnualWellnessResources();
  const sourceDiagnostics = EPIC_RESOURCE_FAMILIES
    .filter((family) => ['Patient', 'Condition', 'MedicationRequest', 'AllergyIntolerance', 'Immunization', 'Observation', 'DiagnosticReport', 'Coverage', 'DocumentReference'].includes(family.resourceType))
    .map((family) => {
      const count = resources.filter((resource) => resource.resourceType === family.resourceType).length;
      return {
        resourceType: family.resourceType,
        operation: family.resourceType === 'Patient' ? 'read' as const : 'search' as const,
        status: count > 0 ? 'mapped' as const : 'empty' as const,
        httpStatus: 200,
        fhirResourceType: family.resourceType === 'Patient' ? 'Patient' : 'Bundle',
        entryCount: count,
        mappableCount: count,
        detail: count > 0
          ? `${family.resourceType} returned ${count} mock mappable record${count === 1 ? '' : 's'}.`
          : `${family.resourceType} returned no mock records.`,
      };
    });
  return { resources, sourceDiagnostics };
}

function reconciliationKey(domain: EpicMvpDomain, entity: Record<string, unknown>): string | undefined {
  switch (domain) {
    case 'profiles':
      return [
        nestedString(entity, 'name.family'),
        Array.isArray(nestedValue(entity, 'name.given')) ? (nestedValue(entity, 'name.given') as string[]).join('|') : '',
        stringField(entity, 'birthDate'),
      ].filter(Boolean).join('::') || undefined;
    case 'conditions':
      return codingKey(nestedValue(entity, 'code'));
    case 'medications':
      return codingKey(nestedValue(entity, 'medicationCode'));
    case 'allergies':
      return codingKey(nestedValue(entity, 'substance'));
    case 'immunizations':
      return [codingKey(nestedValue(entity, 'vaccineCode')), stringField(entity, 'occurrenceDate')].filter(Boolean).join('::') || undefined;
    case 'vital-signs':
      return [stringField(entity, 'code'), stringField(entity, 'effectiveDateTime')].filter(Boolean).join('::') || undefined;
    case 'providers':
      return stringField(entity, 'npi') || stringField(entity, 'name');
    case 'lab-results':
      return [codingKey(nestedValue(entity, 'code')), stringField(entity, 'effectiveDateTime')].filter(Boolean).join('::') || undefined;
    case 'insurance-policies':
      return stringField(entity, 'memberId') || [stringField(entity, 'insurerName'), stringField(entity, 'effectiveDate')].filter(Boolean).join('::') || undefined;
    case 'documents':
      return [codingKey(nestedValue(entity, 'documentType')), stringField(entity, 'title'), stringField(entity, 'authoredDate')].filter(Boolean).join('::') || undefined;
    case 'workflow-tasks':
      return [codingKey(nestedValue(entity, 'taskType')), stringField(entity, 'description'), stringField(entity, 'authoredDate')].filter(Boolean).join('::') || undefined;
  }
}

function codingKey(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const coding = value as Record<string, unknown>;
  const system = typeof coding.system === 'string' ? coding.system : '';
  const code = typeof coding.code === 'string' ? coding.code : '';
  return system || code ? `${system}::${code}` : undefined;
}

function comparableSignature(entity: Record<string, unknown>): string {
  const copy = JSON.parse(JSON.stringify(entity)) as Record<string, unknown>;
  for (const field of ['url', 'createdAt', 'updatedAt', 'notes']) delete copy[field];
  return stableStringify(copy);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function nestedString(entity: Record<string, unknown>, path: string): string | undefined {
  const value = nestedValue(entity, path);
  return typeof value === 'string' ? value : undefined;
}

function stringField(entity: Record<string, unknown>, field: string): string | undefined {
  const value = entity[field];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function nestedValue(entity: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, entity);
}
