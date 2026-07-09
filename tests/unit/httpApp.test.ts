import http, { type Server } from 'node:http';
import { createRequestHandler, type ApplicationContext, type DomainRepository } from '../../src/httpApp';
import { ValidationError } from '../../src/errors';

describe('OpenCommons Health HTTP application', () => {
  let server: Server;
  let baseUrl: string;
  let records: Array<Record<string, unknown>>;
  let context: ApplicationContext;

  beforeEach(async () => {
    records = [{ url: 'http://pod/conditions/1', status: 'active' }];
    const repository: DomainRepository = {
      findAll: jest.fn(async () => records),
      findByUrl: jest.fn(async (url: string) => records.find((item) => item.url === url) ?? null),
      create: jest.fn(async (entity: never) => {
        const created = { ...(entity as Record<string, unknown>), url: 'http://pod/conditions/2' };
        records.push(created);
        return created;
      }),
      update: jest.fn(async (entity: never) => entity),
      delete: jest.fn(async (url: string) => {
        records = records.filter((item) => item.url !== url);
      }),
    };
    context = {
      authenticated: true,
      podServerUrl: 'http://solid',
      podBaseUrl: 'http://pod/',
      checkPodAccess: jest.fn(async () => undefined),
      repositories: { conditions: repository },
    };
    server = http.createServer((req, res) => {
      void createRequestHandler(async () => context)(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it('reports the authenticated Solid deployment as ready', async () => {
    const response = await fetch(`${baseUrl}/api/status`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      podBaseUrl: 'http://pod/',
      podAccess: true,
    });
  });

  it('serves the OpenAPI contract for all domain APIs', async () => {
    const response = await fetch(`${baseUrl}/openapi.json`);
    expect(response.status).toBe(200);
    const body = await response.json() as { openapi: string; paths: Record<string, Record<string, { operationId?: string }>> };
    expect(body.openapi).toBe('3.1.0');
    for (const domain of [
      'profiles',
      'conditions',
      'medications',
      'allergies',
      'immunizations',
      'vital-signs',
      'providers',
      'lab-results',
      'insurance-policies',
    ]) {
      const operations = body.paths[`/api/resources/${domain}`];
      expect(operations).toBeDefined();
      expect(operations.get.operationId).toBeDefined();
      expect(operations.post.operationId).toBeDefined();
      expect(operations.put.operationId).toBeDefined();
      expect(operations.delete.operationId).toBeDefined();
    }
  });

  it('reports not-ready when the authenticated pod probe fails', async () => {
    context.checkPodAccess = jest.fn(async () => {
      throw new Error('Solid pod read failed');
    });
    const response = await fetch(`${baseUrl}/api/status`);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      podAccess: false,
      error: 'Solid pod read failed',
    });
  });

  it('lists and creates domain records', async () => {
    const listResponse = await fetch(`${baseUrl}/api/resources/conditions`);
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toEqual({ data: records });

    const createResponse = await fetch(`${baseUrl}/api/resources/conditions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    expect(createResponse.status).toBe(201);
    await expect(createResponse.json()).resolves.toEqual({
      data: { status: 'active', url: 'http://pod/conditions/2' },
    });
  });

  it('deletes a record using its absolute pod URL', async () => {
    const response = await fetch(
      `${baseUrl}/api/resources/conditions?url=${encodeURIComponent('http://pod/conditions/1')}`,
      { method: 'DELETE' },
    );
    expect(response.status).toBe(204);
    expect(records).toHaveLength(0);
  });

  it('rejects domain access when the Solid session is not authenticated', async () => {
    context.authenticated = false;
    const response = await fetch(`${baseUrl}/api/resources/conditions`);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'The PIM is not authenticated with the configured Solid server.',
    });
  });

  it('reports not-ready without probing the pod when the session is unauthenticated', async () => {
    context.authenticated = false;
    const probe = jest.fn(async () => undefined);
    context.checkPodAccess = probe;
    const response = await fetch(`${baseUrl}/api/status`);
    expect(response.status).toBe(503);
    expect(probe).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      podAccess: false,
    });
  });

  it('maps repository validation errors to a useful API response', async () => {
    context.repositories.conditions.create = jest.fn(async () => {
      throw new ValidationError('Invalid record.', [{ field: 'status', reason: 'status is required' }]);
    });
    const response = await fetch(`${baseUrl}/api/resources/conditions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid record.',
      issues: [{ field: 'status', reason: 'status is required' }],
    });
  });

  it('rejects unknown domains', async () => {
    const response = await fetch(`${baseUrl}/api/resources/unknown`);
    expect(response.status).toBe(404);
  });

  it('does not allow API operations on resources outside the configured pod', async () => {
    const response = await fetch(
      `${baseUrl}/api/resources/conditions?url=${encodeURIComponent('http://other-pod/private')}`,
      { method: 'DELETE' },
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'The resource URL is outside the configured pod.',
    });
  });
});
