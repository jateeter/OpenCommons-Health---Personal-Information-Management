/**
 * Integration tests for ConditionRepository against a live Solid CSS endpoint.
 *
 * These tests are skipped unless the following environment variables are set:
 *   INTEGRATION_TEST_BASE_URL   – CSS pod server URL (e.g. http://localhost:3000)
 *   INTEGRATION_POD_BASE_URL    – Pod base URL        (e.g. http://localhost:3000/alice/)
 *   INTEGRATION_CLIENT_ID       – CSS client credentials ID
 *   INTEGRATION_CLIENT_SECRET   – CSS client credentials secret
 *
 * Run containerised:
 *   npm run test:integration:docker
 *
 * Run against an already-running CSS:
 *   INTEGRATION_TEST_BASE_URL=http://localhost:3000 \
 *   INTEGRATION_POD_BASE_URL=http://localhost:3000/alice/ \
 *   INTEGRATION_CLIENT_ID=... \
 *   INTEGRATION_CLIENT_SECRET=... \
 *   npm run test:integration
 */
import { SolidAuthService } from '../../src/auth/solidAuth';
import { PodClient } from '../../src/pod/podClient';
import { ConditionRepository } from '../../src/repositories/conditionRepository';
import { ValidationError, NotFoundError } from '../../src/errors';
import type { MedicalCondition } from '../../src/types/health';

// ─── Guard ────────────────────────────────────────────────────────────────────

const BASE_URL = process.env['INTEGRATION_TEST_BASE_URL'];
const POD_URL = process.env['INTEGRATION_POD_BASE_URL'];
const CLIENT_ID = process.env['INTEGRATION_CLIENT_ID'];
const CLIENT_SECRET = process.env['INTEGRATION_CLIENT_SECRET'];

const SKIP = !BASE_URL || !POD_URL || !CLIENT_ID || !CLIENT_SECRET;

// Use `describe.skip` when env vars are absent so the test runner still picks
// up the file without failing.
const describeIntegration = SKIP ? describe.skip : describe;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseCondition: Omit<MedicalCondition, 'url'> = {
  code: {
    system: 'http://snomed.info/id/',
    code: '44054006',
    display: 'Type 2 diabetes mellitus',
  },
  status: 'active',
  onsetDate: '2021-03-15',
  notes: 'Integration test condition',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describeIntegration('ConditionRepository integration tests', () => {
  let repo: ConditionRepository;
  const createdUrls: string[] = [];

  beforeAll(async () => {
    const auth = new SolidAuthService({
      oidcIssuer: BASE_URL!,
      clientId: CLIENT_ID!,
      clientSecret: CLIENT_SECRET!,
    });
    await auth.loginWithClientCredentials();

    const client = new PodClient(
      { podBaseUrl: POD_URL!, podPath: '/health-pim-test/' },
      auth,
    );

    repo = new ConditionRepository(client);
  });

  afterAll(async () => {
    // Clean up any conditions created during the test run.
    for (const url of createdUrls) {
      try {
        await repo.delete(url);
      } catch {
        // best-effort cleanup
      }
    }
  });

  // ── create & findByUrl ────────────────────────────────────────────────────

  it('creates a condition and retrieves it by URL', async () => {
    const created = await repo.create({ ...baseCondition });
    expect(created.url).toBeDefined();
    createdUrls.push(created.url!);

    const found = await repo.findByUrl(created.url!);
    expect(found).not.toBeNull();
    expect(found?.code.code).toBe('44054006');
    expect(found?.status).toBe('active');
    expect(found?.onsetDate).toBe('2021-03-15');
  });

  // ── update ────────────────────────────────────────────────────────────────

  it('updates an existing condition', async () => {
    const created = await repo.create({ ...baseCondition });
    createdUrls.push(created.url!);

    const updated = await repo.update({
      ...created,
      notes: 'Updated in integration test',
      status: 'remission',
    });

    expect(updated.notes).toBe('Updated in integration test');
    expect(updated.status).toBe('remission');

    const found = await repo.findByUrl(created.url!);
    expect(found?.notes).toBe('Updated in integration test');
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  it('lists all conditions in the container', async () => {
    const c1 = await repo.create({ ...baseCondition, notes: 'list-test-1' });
    const c2 = await repo.create({ ...baseCondition, notes: 'list-test-2' });
    createdUrls.push(c1.url!, c2.url!);

    const all = await repo.findAll();
    const urls = all.map((c) => c.url);
    expect(urls).toContain(c1.url);
    expect(urls).toContain(c2.url);
  });

  // ── delete ────────────────────────────────────────────────────────────────

  it('deletes a condition and returns null on subsequent findByUrl', async () => {
    const created = await repo.create({ ...baseCondition });
    await repo.delete(created.url!);

    const found = await repo.findByUrl(created.url!);
    expect(found).toBeNull();
  });

  // ── validation ────────────────────────────────────────────────────────────

  it('rejects create with missing required fields without writing to pod', async () => {
    const bad = {
      code: { system: '', code: '' },
      status: '' as MedicalCondition['status'],
    };
    await expect(repo.create(bad)).rejects.toThrow(ValidationError);
  });

  it('rejects update without url', async () => {
    await expect(repo.update({ ...baseCondition })).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError when updating a non-existent resource', async () => {
    const ghost: MedicalCondition = {
      ...baseCondition,
      url: `${POD_URL}health-pim-test/medicalconditions/does-not-exist`,
    };
    await expect(repo.update(ghost)).rejects.toThrow(NotFoundError);
  });
});
