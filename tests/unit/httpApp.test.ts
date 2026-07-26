import http, { type Server } from 'node:http';
import { createRequestHandler, type ApplicationContext, type DomainRepository } from '../../src/httpApp';
import { ValidationError } from '../../src/errors';
import { containsDirectIdentifier, OWNER_APPROVAL_HEADER, RELEASE_PURPOSE_HEADER } from '../../src/privacy';
import { InMemoryPodActivityLog, type PodActivityEvent } from '../../src/podActivity';

describe('OpenCommons Health HTTP application', () => {
  let server: Server;
  let baseUrl: string;
  let records: Array<Record<string, unknown>>;
  let persistedActivity: PodActivityEvent[];
  let context: ApplicationContext;

  beforeEach(async () => {
    records = [{
      url: 'http://pod/conditions/1',
      code: { system: 'http://snomed.info/id/', code: '162864005', display: 'Smoke condition' },
      status: 'active',
      onsetDate: '2026-01-15',
      notes: 'Jane Doe private note',
      recordedBy: 'Dr Named Provider',
      createdAt: '2026-01-15T12:00:00Z',
    }];
    persistedActivity = [];
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
      activityLog: new InMemoryPodActivityLog(),
      activityRepository: {
        append: jest.fn(async (event: PodActivityEvent) => {
          persistedActivity = [event, ...persistedActivity.filter((candidate) => candidate.id !== event.id)];
        }),
        list: jest.fn(async (limit = 25) => persistedActivity.slice(0, limit)),
        status: jest.fn(async () => ({
          enabled: true,
          status: 'active',
          containerPath: 'health-pim/audit/',
          resourcePath: 'health-pim/audit/activity.ttl',
          eventCount: persistedActivity.length,
        })),
      } as never,
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

  it('serves Epic localhost MVP diagnostics when the connector is configured', async () => {
    const diagnostics = jest.fn(async () => ({
      enabled: true,
      mode: 'mock',
      readiness: 'ready',
      checkedAt: '2026-07-13T12:00:00.000Z',
      live: false,
      localhostMvp: true,
      checks: [{ name: 'epic-enabled', status: 'ok', detail: 'Epic integration is enabled.' }],
    }));
    context.epic = {
      diagnostics,
    } as never;

    const response = await fetch(`${baseUrl}/api/integrations/epic/diagnostics`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        readiness: 'ready',
        localhostMvp: true,
      },
    });
    expect(diagnostics).toHaveBeenCalledWith({ live: false });
  });

  it('allows explicit live Epic diagnostics through a query flag', async () => {
    const diagnostics = jest.fn(async ({ live }: { live?: boolean }) => ({
      enabled: true,
      mode: 'sandbox',
      readiness: 'ready',
      checkedAt: '2026-07-13T12:00:00.000Z',
      live,
      localhostMvp: true,
      checks: [{ name: 'smart-discovery', status: 'ok', detail: 'SMART discovery succeeded.' }],
    }));
    context.epic = {
      diagnostics,
    } as never;

    const response = await fetch(`${baseUrl}/api/integrations/epic/diagnostics?live=true`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        live: true,
        readiness: 'ready',
      },
    });
    expect(diagnostics).toHaveBeenCalledWith({ live: true });
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
      'documents',
      'workflow-tasks',
    ]) {
      const operations = body.paths[`/api/resources/${domain}`];
      expect(operations).toBeDefined();
      expect(operations.get.operationId).toBeDefined();
      expect(operations.post.operationId).toBeDefined();
      expect(operations.put.operationId).toBeDefined();
      expect(operations.delete.operationId).toBeDefined();
    }
    expect(body.paths['/api/planned/epic/documents'].get.operationId).toBe('getPlannedEpicDocumentSurface');
    expect(body.paths['/api/planned/epic/workflow'].get.operationId).toBe('getPlannedEpicWorkflowSurface');
    expect(body.paths['/api/pod/activity'].get.operationId).toBe('getOwnerPodActivity');
    expect(body.paths['/api/pod/healthkit/status'].get.operationId).toBe('getHealthKitMirrorStatus');
  });

  it('serves owner-visible pod activity without raw PHI or secret-like values', async () => {
    context.activityLog?.record({
      kind: 'record-created',
      status: 'ok',
      domain: 'conditions',
      resourcePath: '/alice/health-pim/medicalconditions/1',
      summary: 'conditions record created in the owner Pod with token secret password details',
      source: 'api',
    });

    const response = await fetch(`${baseUrl}/api/pod/activity?limit=5`);

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      data: {
        summary: {
          podAccess: boolean;
          domainCount: number;
          domainCounts: Record<string, number | null>;
          containers: Array<{ id: string; status: string }>;
          auditPersistence: { status: string; resourcePath: string; eventCount: number };
        };
        events: Array<{ kind: string; summary: string; resourcePath?: string }>;
      };
    };
    expect(payload.data.summary.podAccess).toBe(true);
    expect(payload.data.summary.domainCount).toBe(11);
    expect(payload.data.summary.domainCounts.conditions).toBe(1);
    expect(payload.data.summary.containers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'healthkit-observations', status: 'active' }),
      expect.objectContaining({ id: 'audit', status: 'active' }),
    ]));
    expect(payload.data.summary.auditPersistence).toMatchObject({
      status: 'active',
      resourcePath: 'health-pim/audit/activity.ttl',
    });
    expect(payload.data.events.map((event) => event.kind)).toContain('record-created');
    expect(JSON.stringify(payload)).not.toMatch(/Jane Doe|Dr Named Provider|token secret password/i);
    expect(JSON.stringify(payload)).toContain('[redacted]');
  });

  it('serves owner-visible HealthKit mirror status without resource URLs or PHI', async () => {
    const ensureContainerPath = jest.fn(async () => 'http://pod/health-pim/healthkit/observations/');
    const listResources = jest.fn(async () => [
      'http://pod/health-pim/healthkit/observations/heart-rate-1.ttl',
      'http://pod/health-pim/healthkit/observations/blood-pressure-1.ttl',
    ]);
    context.pod = { ensureContainerPath, listResources } as never;

    const response = await fetch(`${baseUrl}/api/pod/healthkit/status`);

    expect(response.status).toBe(200);
    const payload = await response.json() as { data: { status: string; observationCount: number; containerPath: string; privacyBoundary: string } };
    expect(payload.data).toMatchObject({
      status: 'ready',
      observationCount: 2,
      containerPath: 'health-pim/healthkit/observations/',
    });
    expect(payload.data.privacyBoundary).toContain('metadata only');
    expect(JSON.stringify(payload)).not.toContain('heart-rate-1.ttl');
    expect(JSON.stringify(payload)).not.toContain('blood-pressure-1.ttl');
    expect(context.activityLog?.list().some((event) => event.kind === 'healthkit-status-verified')).toBe(true);
  });

  it('serves localhost-only read-only Epic document and workflow planning surfaces', async () => {
    const documents = await fetch(`${baseUrl}/api/planned/epic/documents`);
    expect(documents.status).toBe(200);
    await expect(documents.json()).resolves.toMatchObject({
      data: {
        id: 'epic-documents-readonly',
        status: 'planned',
        localhostMvp: true,
        writeEnabled: false,
        piiRelease: false,
        resources: expect.arrayContaining([
          expect.objectContaining({
            fhirResource: 'DocumentReference',
            releasePolicy: expect.stringContaining('Exclude source document URLs'),
          }),
          expect.objectContaining({
            fhirResource: 'Binary',
            releasePolicy: expect.stringContaining('Never release raw binary documents'),
          }),
        ]),
      },
    });

    const workflow = await fetch(`${baseUrl}/api/planned/epic/workflow`);
    expect(workflow.status).toBe(200);
    await expect(workflow.json()).resolves.toMatchObject({
      data: {
        id: 'epic-workflow-readonly',
        status: 'planned',
        localhostMvp: true,
        writeEnabled: false,
        piiRelease: false,
        resources: expect.arrayContaining([
          expect.objectContaining({ fhirResource: 'Communication' }),
          expect.objectContaining({ fhirResource: 'Task' }),
          expect.objectContaining({ fhirResource: 'QuestionnaireResponse' }),
        ]),
      },
    });
  });

  it('serves FHIR capability and PHI privacy schema metadata', async () => {
    const metadata = await fetch(`${baseUrl}/fhir/metadata`);
    expect(metadata.status).toBe(200);
    await expect(metadata.json()).resolves.toMatchObject({
      resourceType: 'CapabilityStatement',
      fhirVersion: '5.0.0',
    });

    const schema = await fetch(`${baseUrl}/api/privacy/schema`);
    expect(schema.status).toBe(200);
    await expect(schema.json()).resolves.toMatchObject({
      identifiable: {
        title: 'OpenCommons Personal Health Information Pod Record',
      },
      anonymizedRelease: {
        title: 'OpenCommons Anonymized Health Information Release',
      },
    });
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
    expect(context.activityLog?.list().some((event) => event.kind === 'record-created' && event.domain === 'conditions')).toBe(true);
    expect(persistedActivity.some((event) => event.kind === 'record-created' && event.domain === 'conditions')).toBe(true);
  });

  it('deletes a record using its absolute pod URL', async () => {
    const response = await fetch(
      `${baseUrl}/api/resources/conditions?url=${encodeURIComponent('http://pod/conditions/1')}`,
      { method: 'DELETE' },
    );
    expect(response.status).toBe(204);
    expect(records).toHaveLength(0);
    expect(context.activityLog?.list().some((event) => event.kind === 'record-deleted' && event.domain === 'conditions')).toBe(true);
  });

  it('rejects domain access when the Solid session is not authenticated', async () => {
    context.authenticated = false;
    const response = await fetch(`${baseUrl}/api/resources/conditions`);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'The PIM is not authenticated with the configured Solid server.',
    });
  });

  it('rejects anonymized release when the Solid session is not authenticated', async () => {
    context.authenticated = false;
    const response = await fetch(`${baseUrl}/api/anonymized/resources/conditions`, {
      headers: {
        [OWNER_APPROVAL_HEADER]: 'true',
        [RELEASE_PURPOSE_HEADER]: 'research-quality-check',
      },
    });
    expect(response.status).toBe(401);
  });

  it('requires explicit owner approval for anonymized release', async () => {
    const response = await fetch(`${baseUrl}/api/anonymized/resources/conditions`);
    expect(response.status).toBe(403);
    expect(context.activityLog?.list().some((event) => event.kind === 'anonymized-release-denied')).toBe(true);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining(OWNER_APPROVAL_HEADER),
    });
  });

  it('returns only anonymized data from owner-approved release endpoints', async () => {
    const response = await fetch(`${baseUrl}/api/anonymized/resources/conditions`, {
      headers: {
        [OWNER_APPROVAL_HEADER]: 'true',
        [RELEASE_PURPOSE_HEADER]: 'patient-approved-quality-study',
      },
    });
    expect(response.status).toBe(200);
    const body = await response.json() as { data: unknown[]; release: Record<string, unknown> };
    expect(body.release).toMatchObject({
      anonymized: true,
      ownerApproved: true,
      purpose: 'patient-approved-quality-study',
    });
    expect(body.data).toEqual([{
      domain: 'conditions',
      fhirResourceType: 'Condition',
      anonymized: true,
      data: {
        code: { system: 'http://snomed.info/id/', code: '162864005', display: 'Smoke condition' },
        status: 'active',
        onsetYear: 2026,
      },
    }]);
    expect(containsDirectIdentifier(body.data)).toBe(false);
    expect(context.activityLog?.list().some((event) => event.kind === 'anonymized-release-approved')).toBe(true);
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
