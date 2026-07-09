import type { IncomingMessage, ServerResponse } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import type { HealthPIM } from './index';
import { AuthError, ConflictError, NotFoundError, ValidationError } from './errors';
import { DOMAIN_NAMES, OPENAPI_DOCUMENT } from './openapi';

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
}

export type ContextProvider = () => Promise<ApplicationContext>;

export function contextFromPim(
  pim: HealthPIM,
  podServerUrl: string,
  podBaseUrl: string,
): ApplicationContext {
  return {
    podServerUrl,
    podBaseUrl,
    authenticated: pim.isAuthenticated,
    checkPodAccess: () => pim.checkPodAccess(),
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
      if (requestUrl.pathname === '/api/docs') {
        return servePublicAsset('/api-docs.html', publicDirectory, res);
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
    }
    sendJson(res, context.authenticated ? 200 : 503, {
      ok: context.authenticated,
      service: 'opencommons-health-pim',
      podServerUrl: context.podServerUrl,
      podBaseUrl: context.podBaseUrl,
      podAccess: context.authenticated,
      domains: DOMAIN_NAMES,
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
    return sendJson(res, 201, { data: await repository.create(await readJsonBody(req) as never) });
  }

  if (req.method === 'PUT') {
    const entity = await readJsonBody(req) as { url?: unknown };
    if (typeof entity.url !== 'string') {
      throw new ValidationError('A resource URL is required for updates.', [{ field: 'url', reason: 'url is required' }]);
    }
    assertPodResourceUrl(entity.url, context.podBaseUrl);
    return sendJson(res, 200, { data: await repository.update(entity as never) });
  }

  if (req.method === 'DELETE') {
    const resourceUrl = requestUrl.searchParams.get('url');
    if (!resourceUrl) throw new ValidationError('A resource URL is required.', [{ field: 'url', reason: 'url query parameter is required' }]);
    assertPodResourceUrl(resourceUrl, context.podBaseUrl);
    await repository.delete(resourceUrl);
    res.writeHead(204);
    res.end();
    return;
  }

  res.setHeader('allow', 'GET, POST, PUT, DELETE');
  sendJson(res, 405, { error: 'Method not allowed' });
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

function servePublicAsset(requestPath: string, publicDirectory: string, res: ServerResponse): void {
  const asset = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const allowed = new Set(['index.html', 'app.js', 'styles.css', 'api-docs.html']);
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
    'cache-control': asset === 'index.html' ? 'no-store' : 'public, max-age=3600',
  });
  createReadStream(filePath).pipe(res);
}

function sendError(res: ServerResponse, error: unknown): void {
  if (error instanceof ValidationError) return sendJson(res, 400, { error: error.message, issues: error.issues });
  if (error instanceof AuthError) return sendJson(res, 401, { error: error.message });
  if (error instanceof NotFoundError) return sendJson(res, 404, { error: error.message });
  if (error instanceof ConflictError) return sendJson(res, 409, { error: error.message });
  const message = error instanceof Error ? error.message : 'Internal server error';
  sendJson(res, 502, { error: message });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
