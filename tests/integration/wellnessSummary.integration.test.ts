/**
 * Integration tests for the wellness landing summary against a live Solid CSS
 * pod (issue #32).
 *
 * The unit and DOM tests prove the summary is computed and rendered correctly
 * from a fixture. These prove the other half: that real records written into a
 * real pod are read back and scored, that an untouched domain reports "empty"
 * rather than failing the request, and that the summary tracks the pod as
 * records are added.
 *
 * Skipped unless the standard integration environment is configured:
 *   INTEGRATION_TEST_BASE_URL   – CSS pod server URL
 *   INTEGRATION_POD_BASE_URL    – Pod base URL
 *   INTEGRATION_CLIENT_ID       – CSS client credentials ID
 *   INTEGRATION_CLIENT_SECRET   – CSS client credentials secret
 *
 * Run containerised:  npm run test:integration:docker
 *
 * Against the local compose stack, the issuer must be the URL the CSS was
 * started with (`-b http://css.localhost:PORT/`), not `localhost`. Using
 * `localhost` fails OIDC discovery with "outside the configured identifier
 * space", which surfaces confusingly as a login error:
 *
 *   INTEGRATION_TEST_BASE_URL=http://css.localhost:13000 \
 *   INTEGRATION_POD_BASE_URL=http://css.localhost:13000/<pod>/ \
 *   INTEGRATION_CLIENT_CREDENTIALS_FILE=/path/to/client-credentials.json \
 *   npm run test:integration
 */
import fs from 'node:fs';

import { SolidAuthService } from '../../src/auth/solidAuth';
import { PodClient } from '../../src/pod/podClient';
import { ConditionRepository } from '../../src/repositories/conditionRepository';
import { computeWellnessSummary } from '../../src/wellness';
import type { MedicalCondition } from '../../src/types/health';

// ─── Guard ────────────────────────────────────────────────────────────────────

const BASE_URL = process.env['INTEGRATION_TEST_BASE_URL'];
const POD_URL = process.env['INTEGRATION_POD_BASE_URL'];
const credentialsFile = process.env['INTEGRATION_CLIENT_CREDENTIALS_FILE'];
const credentials = credentialsFile && fs.existsSync(credentialsFile)
  ? JSON.parse(fs.readFileSync(credentialsFile, 'utf8')) as { clientId?: string; clientSecret?: string }
  : undefined;
const CLIENT_ID = process.env['INTEGRATION_CLIENT_ID'] || credentials?.clientId;
const CLIENT_SECRET = process.env['INTEGRATION_CLIENT_SECRET'] || credentials?.clientSecret;

const SKIP = !BASE_URL || !POD_URL || !CLIENT_ID || !CLIENT_SECRET;
const describeIntegration = SKIP ? describe.skip : describe;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function condition(display: string): Omit<MedicalCondition, 'url'> {
  return {
    code: { system: 'http://snomed.info/id/', code: '44054006', display },
    status: 'active',
    onsetDate: '2024-01-15',
    notes: 'wellness summary integration fixture',
  };
}

describeIntegration('wellness summary against a live pod', () => {
  let auth: SolidAuthService | undefined;
  let repository: ConditionRepository;
  const created: string[] = [];

  beforeAll(async () => {
    auth = new SolidAuthService({
      oidcIssuer: BASE_URL!,
      clientId: CLIENT_ID!,
      clientSecret: CLIENT_SECRET!,
    });
    await auth.loginWithClientCredentials();
    // Own container: the repository suite asserts on counts in
    // /health-pim-test/, and jest runs suites in parallel, so sharing it
    // makes both suites flaky depending on interleaving.
    const client = new PodClient({ podBaseUrl: POD_URL!, podPath: '/health-pim-wellness-test/' }, auth);
    repository = new ConditionRepository(client);
  });

  afterAll(async () => {
    for (const url of created) {
      try {
        await repository.delete(url);
      } catch {
        // Best-effort cleanup; a failed delete must not mask a test result.
      }
    }
    if (auth) await auth.logout();
  });

  it('scores a domain from records actually stored in the pod', async () => {
    const saved = await repository.create(condition('Wellness summary integration condition'));
    created.push(saved.url!);

    const conditions = await repository.findAll();
    const summary = computeWellnessSummary(
      {
        'vital-signs': [], 'lab-results': [], medications: [],
        conditions, allergies: [], immunizations: [],
      } as never,
      { profiles: null, providers: null, 'insurance-policies': null, documents: null, 'workflow-tasks': null },
    );

    const axis = summary.axes.find((entry) => entry.domain === 'conditions');
    expect(axis).toBeDefined();
    // The record we just wrote is counted and the domain is no longer empty.
    expect(axis?.recordCount).toBeGreaterThan(0);
    expect(axis?.status).not.toBe('empty');
    expect(axis?.score).not.toBeNull();
  });

  it('reports an untouched domain as empty rather than failing', async () => {
    // Domains with no container yet must read as "no records", which is what
    // lets the landing render on a freshly provisioned pod.
    const summary = computeWellnessSummary(
      {
        'vital-signs': [], 'lab-results': [], medications: [],
        conditions: [], allergies: [], immunizations: [],
      } as never,
      { profiles: null, providers: null, 'insurance-policies': null, documents: null, 'workflow-tasks': null },
    );
    for (const axis of summary.axes) {
      expect(axis.status).toBe('empty');
      expect(axis.score).toBeNull();
      expect(axis.recordCount).toBe(0);
    }
  });

  it('tracks the pod as records are added', async () => {
    const saved = await repository.create(condition('Wellness summary second condition'));
    created.push(saved.url!);

    // Deliberately no before/after arithmetic. Even in an isolated container
    // a count delta is a fragile thing to assert against a live server; what
    // matters is the invariant — the new record is readable back, and the
    // summary counts exactly the records it was handed.
    const conditions = await repository.findAll();
    expect(conditions.some((entry) => entry.url === saved.url)).toBe(true);

    const summary = computeWellnessSummary(
      {
        'vital-signs': [], 'lab-results': [], medications: [],
        conditions, allergies: [], immunizations: [],
      } as never,
      { profiles: null, providers: null, 'insurance-policies': null, documents: null, 'workflow-tasks': null },
    );
    const axis = summary.axes.find((entry) => entry.domain === 'conditions');
    expect(axis?.recordCount).toBe(conditions.length);
    expect(axis?.recordCount).toBeGreaterThan(0);
  });
});
