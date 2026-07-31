import type { IncomingMessage, ServerResponse } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import type { HealthPIM } from './index';
import type { PodClient } from './pod/podClient';
import { AuthError, AuthorizationError, ConflictError, NotFoundError, ValidationError } from './errors';
import { DOMAIN_NAMES, OPENAPI_DOCUMENT } from './openapi';
import { anonymizeResource, anonymizeResources, OWNER_APPROVAL_HEADER, RELEASE_PURPOSE_HEADER } from './privacy';
import {
  ANONYMIZED_HEALTH_INFORMATION_SCHEMA,
  OPENCOMMONS_FHIR_CAPABILITY_STATEMENT,
  PERSONAL_HEALTH_INFORMATION_SCHEMA,
} from './standards/fhir';
import type { EpicIntegrationService } from './integrations/epic';
import { EPIC_DOCUMENTS_READONLY_PLAN, EPIC_READONLY_PLANS, EPIC_WORKFLOW_READONLY_PLAN } from './plannedSurfaces';
import {
  activitySummaryForDomainAction,
  createPodActivityResponse,
  InMemoryPodActivityLog,
  mergePodActivityEvents,
  resourcePathFromUrl,
  type PodActivityLog,
  type PodActivityEvent,
} from './podActivity';
import type { PodActivityRepository } from './podActivityRepository';
import { createHealthKitMirrorStatus } from './healthkitStatus';
import {
  computeWellnessSummary,
  WELLNESS_AXIS_DOMAINS,
  WELLNESS_BROWSE_DOMAINS,
  type WellnessSourceRecords,
} from './wellness';

export interface DomainRepository {
  findAll(): Promise<unknown[]>;
  findByUrl(url: string): Promise<unknown | null>;
  create(entity: never): Promise<unknown>;
  update(entity: never): Promise<unknown>;
  delete(url: string): Promise<void>;
}

export interface ApplicationContext {
  repositories: Record<string, DomainRepository>;
  podServerUrl: string;
  podBaseUrl: string;
  authenticated: boolean;
  checkPodAccess(): Promise<void>;
  pod?: PodClient;
  epic?: EpicIntegrationService;
  activityLog?: PodActivityLog;
  activityRepository?: PodActivityRepository;
}

export type ContextProvider = () => Promise<ApplicationContext>;

export function contextFromPim(
  pim: HealthPIM,
  podServerUrl: string,
  podBaseUrl: string,
  epic?: EpicIntegrationService,
  activityLog: PodActivityLog = new InMemoryPodActivityLog(),
  activityRepository?: PodActivityRepository,
): ApplicationContext {
  return {
    podServerUrl,
    podBaseUrl,
    authenticated: pim.isAuthenticated,
    checkPodAccess: () => pim.checkPodAccess(),
    pod: pim.pod,
    epic,
    activityLog,
    activityRepository,
    repositories: {
      profiles: pim.profile,
      conditions: pim.conditions,
      medications: pim.medications,
      allergies: pim.allergies,
      immunizations: pim.immunizations,
      'vital-signs': pim.vitalSigns,
      providers: pim.providers,
      'lab-results': pim.labResults,
      'insurance-policies': pim.insurancePolicies,
      documents: pim.documents,
      'workflow-tasks': pim.workflowTasks,
    } as Record<string, DomainRepository>,
  };
}

export function createRequestHandler(
  provideContext: ContextProvider,
  publicDirectory = path.join(__dirname, 'public'),
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? '/', 'http://localhost');
      if (requestUrl.pathname === '/livez') {
        return sendJson(res, 200, { ok: true });
      }
      if (requestUrl.pathname === '/healthz' || requestUrl.pathname === '/api/status') {
        return await sendStatus(provideContext, res);
      }
      if (requestUrl.pathname === '/openapi.json' || requestUrl.pathname === '/swagger.json') {
        return sendJson(res, 200, OPENAPI_DOCUMENT);
      }
      if (requestUrl.pathname === '/fhir/metadata') {
        return sendJson(res, 200, OPENCOMMONS_FHIR_CAPABILITY_STATEMENT);
      }
      if (requestUrl.pathname === '/api/privacy/schema') {
        return sendJson(res, 200, {
          identifiable: PERSONAL_HEALTH_INFORMATION_SCHEMA,
          anonymizedRelease: ANONYMIZED_HEALTH_INFORMATION_SCHEMA,
        });
      }
      if (requestUrl.pathname === '/api/pod/activity') {
        return await handlePodActivityRequest(res, requestUrl, provideContext);
      }
      if (requestUrl.pathname === '/api/pod/healthkit/status') {
        return await handleHealthKitStatusRequest(res, provideContext);
      }
      if (requestUrl.pathname === '/api/wellness/summary') {
        return await handleWellnessSummaryRequest(req, res, provideContext);
      }
      if (requestUrl.pathname === '/api/planned/epic') {
        return sendJson(res, 200, { data: EPIC_READONLY_PLANS });
      }
      if (requestUrl.pathname === '/api/planned/epic/documents') {
        return sendJson(res, 200, { data: EPIC_DOCUMENTS_READONLY_PLAN });
      }
      if (requestUrl.pathname === '/api/planned/epic/workflow') {
        return sendJson(res, 200, { data: EPIC_WORKFLOW_READONLY_PLAN });
      }
      if (requestUrl.pathname.startsWith('/api/integrations/epic')) {
        return await handleEpicIntegrationRequest(req, res, requestUrl, provideContext);
      }
      if (requestUrl.pathname === '/api/docs') {
        return servePublicAsset('/api-docs.html', publicDirectory, res);
      }
      if (requestUrl.pathname.startsWith('/api/anonymized/resources/')) {
        return await handleAnonymizedDomainRequest(req, res, requestUrl, provideContext);
      }
      if (requestUrl.pathname.startsWith('/api/resources/')) {
        return await handleDomainRequest(req, res, requestUrl, provideContext);
      }
      if (req.method === 'GET') {
        return servePublicAsset(requestUrl.pathname, publicDirectory, res);
      }
      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      sendError(res, error);
    }
  };
}

async function sendStatus(provideContext: ContextProvider, res: ServerResponse): Promise<void> {
  try {
    const context = await provideContext();
    if (context.authenticated) {
      await context.checkPodAccess();
      await recordActivity(context, {
        kind: 'pod-access-verified',
        status: 'ok',
        summary: 'Authenticated Pod access verified',
        source: 'api',
      });
    }
    sendJson(res, context.authenticated ? 200 : 503, {
      ok: context.authenticated,
      service: 'opencommons-health-pim',
      podServerUrl: context.podServerUrl,
      podBaseUrl: context.podBaseUrl,
      podAccess: context.authenticated,
      domains: DOMAIN_NAMES,
      epic: context.epic ? await context.epic.status() : { enabled: false, status: 'disabled' },
    });
  } catch (error) {
    sendJson(res, 503, {
      ok: false,
      service: 'opencommons-health-pim',
      podAccess: false,
      error: error instanceof Error ? error.message : 'Application initialization failed',
    });
  }
}

async function handlePodActivityRequest(
  res: ServerResponse,
  requestUrl: URL,
  provideContext: ContextProvider,
): Promise<void> {
  const context = await provideContext();
  if (!context.authenticated) {
    throw new AuthError('The PIM is not authenticated with the configured Solid server.');
  }
  await context.checkPodAccess();
  await recordActivity(context, {
    kind: 'pod-access-verified',
    status: 'ok',
    summary: 'Authenticated Pod access verified for owner activity review',
    source: 'api',
  });
  const limit = Number(requestUrl.searchParams.get('limit') ?? '25');
  const domainCounts = await collectDomainCounts(context);
  const memoryEvents = context.activityLog?.list(200) ?? [];
  const auditPersistence = context.activityRepository
    ? await context.activityRepository.status()
    : undefined;
  const persistedEvents = context.activityRepository
    ? await context.activityRepository.list(200).catch(() => [])
    : [];
  const events = mergePodActivityEvents(memoryEvents, persistedEvents, Number.isFinite(limit) ? limit : 25);
  sendJson(res, 200, {
    data: createPodActivityResponse({
      activityLog: context.activityLog,
      events,
      authenticated: context.authenticated,
      podAccess: true,
      podServerUrl: context.podServerUrl,
      podBaseUrl: context.podBaseUrl,
      domainCounts,
      auditPersistence,
      limit: Number.isFinite(limit) ? limit : 25,
    }),
  });
}

async function handleHealthKitStatusRequest(
  res: ServerResponse,
  provideContext: ContextProvider,
): Promise<void> {
  const context = await provideContext();
  if (!context.authenticated) {
    throw new AuthError('The PIM is not authenticated with the configured Solid server.');
  }
  await context.checkPodAccess();
  await recordActivity(context, {
    kind: 'healthkit-status-verified',
    status: 'ok',
    summary: 'HealthKit observations mirror container verified',
    source: 'api',
  });
  const events = mergePodActivityEvents(
    context.activityLog?.list(200) ?? [],
    context.activityRepository ? await context.activityRepository.list(200).catch(() => []) : [],
    25,
  );
  sendJson(res, 200, {
    data: await createHealthKitMirrorStatus({
      pod: context.pod,
      activityEvents: events,
    }),
  });
}

async function handleWellnessSummaryRequest(
  req: IncomingMessage,
  res: ServerResponse,
  provideContext: ContextProvider,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  const context = await provideContext();
  if (!context.authenticated) {
    throw new AuthError('The PIM is not authenticated with the configured Solid server.');
  }
  // Axis reads are deliberately not error-swallowed: a failed pod read must not
  // render as an empty domain, which would tell the owner they have no records
  // when the pod is simply unreachable.
  const sourceEntries = await Promise.all(WELLNESS_AXIS_DOMAINS.map(async (domain) => {
    const repository = context.repositories[domain];
    if (!repository) return [domain, []] as const;
    return [domain, await repository.findAll()] as const;
  }));
  const sources = Object.fromEntries(sourceEntries) as unknown as WellnessSourceRecords;
  const browseEntries = await Promise.all(WELLNESS_BROWSE_DOMAINS.map(async (domain) => {
    try {
      const repository = context.repositories[domain];
      if (!repository) return [domain, null] as const;
      return [domain, (await repository.findAll()).length] as const;
    } catch {
      return [domain, null] as const;
    }
  }));
  sendJson(res, 200, { data: computeWellnessSummary(sources, Object.fromEntries(browseEntries)) });
}

async function handleEpicIntegrationRequest(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
  provideContext: ContextProvider,
): Promise<void> {
  const context = await provideContext();
  if (!context.authenticated) {
    throw new AuthError('The PIM is not authenticated with the configured Solid server.');
  }
  const epic = context.epic;
  if (!epic) {
    throw new ValidationError('Epic integration is not configured for this deployment.', [
      { field: 'EPIC_ENABLED', reason: 'set EPIC_ENABLED=true to configure Epic integration APIs' },
    ]);
  }

  if (requestUrl.pathname === '/api/integrations/epic/status' && req.method === 'GET') {
    return sendJson(res, 200, { data: await epic.status() });
  }
  if (requestUrl.pathname === '/api/integrations/epic/diagnostics' && req.method === 'GET') {
    return sendJson(res, 200, { data: await epic.diagnostics({ live: requestUrl.searchParams.get('live') === 'true' }) });
  }
  if (requestUrl.pathname === '/api/integrations/epic/connect/start' && req.method === 'POST') {
    const data = await epic.connectStart();
    await recordActivity(context, { kind: 'epic-connect', status: 'info', summary: 'Epic SMART connection started', source: 'epic' });
    return sendJson(res, 200, { data });
  }
  if (requestUrl.pathname === '/api/integrations/epic/connect/callback' && req.method === 'GET') {
    const data = await epic.connectCallback(requestUrl.searchParams);
    await recordActivity(context, { kind: 'epic-connect', status: 'ok', summary: 'Epic SMART connection callback completed', source: 'epic' });
    return sendJson(res, 200, { data });
  }
  if (requestUrl.pathname === '/api/integrations/epic/disconnect' && req.method === 'POST') {
    const data = await epic.disconnect();
    await recordActivity(context, { kind: 'epic-disconnect', status: 'ok', summary: 'Epic connection disconnected', source: 'epic' });
    return sendJson(res, 200, { data });
  }
  if (requestUrl.pathname === '/api/integrations/epic/sync/preview' && req.method === 'POST') {
    const data = await epic.preview(await readJsonBodyOrEmpty(req));
    await recordActivity(context, { kind: 'epic-preview', status: 'info', summary: 'Epic import preview generated for owner review', source: 'epic' });
    return sendJson(res, 200, { data });
  }
  if (requestUrl.pathname === '/api/integrations/epic/sync/apply' && req.method === 'POST') {
    const data = await epic.apply(await readJsonBodyOrEmpty(req));
    await recordActivity(context, { kind: 'epic-apply', status: 'ok', summary: 'Owner-approved Epic import applied to Pod', source: 'epic' });
    return sendJson(res, 200, { data });
  }
  if (requestUrl.pathname === '/api/integrations/epic/audit' && req.method === 'GET') {
    return sendJson(res, 200, { data: await epic.audit() });
  }

  res.setHeader('allow', allowedEpicMethods(requestUrl.pathname));
  sendJson(res, 404, { error: 'Epic integration endpoint not found' });
}

async function handleDomainRequest(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
  provideContext: ContextProvider,
): Promise<void> {
  const domain = decodeURIComponent(requestUrl.pathname.slice('/api/resources/'.length));
  const context = await provideContext();
  if (!context.authenticated) {
    throw new AuthError('The PIM is not authenticated with the configured Solid server.');
  }
  const repository = context.repositories[domain];
  if (!repository) {
    return sendJson(res, 404, { error: `Unknown domain: ${domain}`, domains: DOMAIN_NAMES });
  }

  if (req.method === 'GET') {
    const resourceUrl = requestUrl.searchParams.get('url');
    if (resourceUrl) {
      assertPodResourceUrl(resourceUrl, context.podBaseUrl);
      const entity = await repository.findByUrl(resourceUrl);
      if (!entity) throw new NotFoundError(resourceUrl);
      return sendJson(res, 200, { data: entity });
    }
    return sendJson(res, 200, { data: await repository.findAll() });
  }

  if (req.method === 'POST') {
    const data = await repository.create(await readJsonBody(req) as never);
    await recordActivity(context, {
      kind: 'record-created',
      status: 'ok',
      domain,
      resourcePath: resourcePathFromUrl((data as { url?: string }).url),
      summary: activitySummaryForDomainAction('record-created', domain),
      source: 'api',
    });
    return sendJson(res, 201, { data });
  }

  if (req.method === 'PUT') {
    const entity = await readJsonBody(req) as { url?: unknown };
    if (typeof entity.url !== 'string') {
      throw new ValidationError('A resource URL is required for updates.', [{ field: 'url', reason: 'url is required' }]);
    }
    assertPodResourceUrl(entity.url, context.podBaseUrl);
    const data = await repository.update(entity as never);
    await recordActivity(context, {
      kind: 'record-updated',
      status: 'ok',
      domain,
      resourcePath: resourcePathFromUrl(entity.url),
      summary: activitySummaryForDomainAction('record-updated', domain),
      source: 'api',
    });
    return sendJson(res, 200, { data });
  }

  if (req.method === 'DELETE') {
    const resourceUrl = requestUrl.searchParams.get('url');
    if (!resourceUrl) throw new ValidationError('A resource URL is required.', [{ field: 'url', reason: 'url query parameter is required' }]);
    assertPodResourceUrl(resourceUrl, context.podBaseUrl);
    await repository.delete(resourceUrl);
    await recordActivity(context, {
      kind: 'record-deleted',
      status: 'ok',
      domain,
      resourcePath: resourcePathFromUrl(resourceUrl),
      summary: activitySummaryForDomainAction('record-deleted', domain),
      source: 'api',
    });
    res.writeHead(204);
    res.end();
    return;
  }

  res.setHeader('allow', 'GET, POST, PUT, DELETE');
  sendJson(res, 405, { error: 'Method not allowed' });
}

async function handleAnonymizedDomainRequest(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
  provideContext: ContextProvider,
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const domain = decodeURIComponent(requestUrl.pathname.slice('/api/anonymized/resources/'.length));
  const context = await provideContext();
  if (!context.authenticated) {
    throw new AuthError('The PIM is not authenticated with the configured Solid server.');
  }
  try {
    assertOwnerApprovedRelease(req);
  } catch (error) {
    await recordActivity(context, {
      kind: 'anonymized-release-denied',
      status: 'attention',
      domain,
      summary: 'Anonymized release denied because owner approval or purpose was missing',
      source: 'api',
    });
    throw error;
  }

  const repository = context.repositories[domain];
  if (!repository) {
    return sendJson(res, 404, { error: `Unknown domain: ${domain}`, domains: DOMAIN_NAMES });
  }

  const resourceUrl = requestUrl.searchParams.get('url');
  if (resourceUrl) {
    assertPodResourceUrl(resourceUrl, context.podBaseUrl);
    const entity = await repository.findByUrl(resourceUrl);
    if (!entity) throw new NotFoundError(resourceUrl);
    await recordActivity(context, {
      kind: 'anonymized-release-approved',
      status: 'ok',
      domain,
      resourcePath: resourcePathFromUrl(resourceUrl),
      purpose: headerValue(req, RELEASE_PURPOSE_HEADER),
      summary: 'Owner-approved anonymized release generated',
      source: 'api',
    });
    return sendJson(res, 200, {
      data: anonymizeResource(domain, entity),
      release: releaseMetadata(req),
    });
  }

  await recordActivity(context, {
    kind: 'anonymized-release-approved',
    status: 'ok',
    domain,
    purpose: headerValue(req, RELEASE_PURPOSE_HEADER),
    summary: 'Owner-approved anonymized release generated',
    source: 'api',
  });
  return sendJson(res, 200, {
    data: anonymizeResources(domain, await repository.findAll()),
    release: releaseMetadata(req),
  });
}

async function collectDomainCounts(context: ApplicationContext): Promise<Record<string, number | null>> {
  const entries = await Promise.all(DOMAIN_NAMES.map(async (domain) => {
    try {
      const repository = context.repositories[domain];
      if (!repository) return [domain, null] as const;
      return [domain, (await repository.findAll()).length] as const;
    } catch {
      return [domain, null] as const;
    }
  }));
  return Object.fromEntries(entries);
}

async function recordActivity(
  context: ApplicationContext,
  event: Omit<PodActivityEvent, 'id' | 'at'> & { at?: string },
): Promise<void> {
  const recorded = context.activityLog?.record(event);
  if (!recorded || !context.activityRepository) return;
  try {
    await context.activityRepository.append(recorded);
  } catch (error) {
    context.activityLog?.record({
      kind: 'pod-audit-persistence-failed',
      status: 'attention',
      summary: error instanceof Error
        ? `Pod audit persistence needs attention: ${error.message}`
        : 'Pod audit persistence needs attention.',
      source: 'api',
    });
  }
}

function assertOwnerApprovedRelease(req: IncomingMessage): void {
  const approved = headerValue(req, OWNER_APPROVAL_HEADER);
  if (approved !== 'true') {
    throw new AuthorizationError(`Anonymized release requires ${OWNER_APPROVAL_HEADER}: true from the authenticated pod owner.`);
  }
  const purpose = headerValue(req, RELEASE_PURPOSE_HEADER);
  if (!purpose) {
    throw new AuthorizationError(`Anonymized release requires a non-empty ${RELEASE_PURPOSE_HEADER} header.`);
  }
}

function releaseMetadata(req: IncomingMessage): Record<string, unknown> {
  return {
    anonymized: true,
    ownerApproved: true,
    purpose: headerValue(req, RELEASE_PURPOSE_HEADER),
  };
}

function headerValue(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim();
}

function assertPodResourceUrl(resourceUrl: string, podBaseUrl: string): void {
  let normalizedResource: URL;
  let normalizedPod: URL;
  try {
    normalizedResource = new URL(resourceUrl);
    normalizedPod = new URL(podBaseUrl);
  } catch {
    throw new ValidationError('The resource URL is invalid.', [{ field: 'url', reason: 'url must be an absolute URL inside the configured pod' }]);
  }
  const podPrefix = normalizedPod.href.endsWith('/') ? normalizedPod.href : `${normalizedPod.href}/`;
  if (!normalizedResource.href.startsWith(podPrefix)) {
    throw new ValidationError('The resource URL is outside the configured pod.', [{ field: 'url', reason: `url must begin with ${podPrefix}` }]);
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new ValidationError('Request body is too large.', []);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ValidationError('Request body must be valid JSON.', []);
  }
}

async function readJsonBodyOrEmpty(req: IncomingMessage): Promise<Record<string, unknown>> {
  const contentLength = req.headers['content-length'];
  if (contentLength === '0' || contentLength === undefined) return {};
  const body = await readJsonBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.', []);
  }
  return body as Record<string, unknown>;
}

function allowedEpicMethods(pathname: string): string {
  if (pathname.endsWith('/status') || pathname.endsWith('/diagnostics') || pathname.endsWith('/connect/callback') || pathname.endsWith('/audit')) return 'GET';
  if (pathname.endsWith('/connect/start') || pathname.endsWith('/disconnect') || pathname.endsWith('/sync/preview') || pathname.endsWith('/sync/apply')) return 'POST';
  return 'GET, POST';
}

function servePublicAsset(requestPath: string, publicDirectory: string, res: ServerResponse): void {
  const asset = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const allowed = new Set(['index.html', 'app.js', 'styles.css', 'api-docs.html', 'terms.html', 'data-disclosure.html', 'opencommons-health-thumbnail.png']);
  if (!allowed.has(asset)) return sendJson(res, 404, { error: 'Not found' });
  const filePath = path.join(publicDirectory, asset);
  if (!existsSync(filePath)) return sendJson(res, 404, { error: 'UI asset not found' });
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
  };
  res.writeHead(200, {
    'content-type': types[path.extname(asset)] ?? 'application/octet-stream',
    'cache-control': asset === 'opencommons-health-thumbnail.png' ? 'public, max-age=3600' : 'no-store',
  });
  createReadStream(filePath).pipe(res);
}

function sendError(res: ServerResponse, error: unknown): void {
  if (error instanceof ValidationError) return sendJson(res, 400, { error: error.message, issues: error.issues });
  if (error instanceof AuthError) return sendJson(res, 401, { error: error.message });
  if (error instanceof AuthorizationError) return sendJson(res, 403, { error: error.message });
  if (error instanceof NotFoundError) return sendJson(res, 404, { error: error.message });
  if (error instanceof ConflictError) return sendJson(res, 409, { error: error.message });
  const message = error instanceof Error ? error.message : 'Internal server error';
  sendJson(res, 502, { error: message });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
