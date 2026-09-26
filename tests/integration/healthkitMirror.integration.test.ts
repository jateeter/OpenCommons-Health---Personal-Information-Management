/**
 * The HealthKit → PIM → POD mirror against a live Solid CSS
 * (localHealthkitBridge docs/MIRROR_CONTRACT.md).
 *
 * Exercises what unit tests cannot: real containers created on first use, the
 * registry persisted in the POD, real ShEx validation of every write, and
 * reconciliation against records read back from the POD.
 *
 * Skipped unless the integration environment is present (see
 * conditions.repository.integration.test.ts). Run: npm run test:integration:docker
 */
import fs from 'node:fs';

import { SolidAuthService } from '../../src/auth/solidAuth';
import { PodClient } from '../../src/pod/podClient';
import { VitalSignsRepository } from '../../src/repositories/vitalSignsRepository';
import { PillarObservationRepository } from '../../src/repositories/pillarObservationRepository';
import { HealthKitMirrorService, MetricRegistryPodRepository } from '../../src/integrations/healthkit';
import type { DomainRepository } from '../../src/httpApp';

const BASE_URL = process.env['INTEGRATION_TEST_BASE_URL'];
const POD_URL = process.env['INTEGRATION_POD_BASE_URL'];
const credentialsFile = process.env['INTEGRATION_CLIENT_CREDENTIALS_FILE'];
const credentials = credentialsFile && fs.existsSync(credentialsFile)
  ? JSON.parse(fs.readFileSync(credentialsFile, 'utf8')) as { clientId?: string; clientSecret?: string }
  : undefined;
const CLIENT_ID = process.env['INTEGRATION_CLIENT_ID'] || credentials?.clientId;
const CLIENT_SECRET = process.env['INTEGRATION_CLIENT_SECRET'] || credentials?.clientSecret;
const describeIntegration = !BASE_URL || !POD_URL || !CLIENT_ID || !CLIENT_SECRET ? describe.skip : describe;

const HR = { metric: 'HKQuantityTypeIdentifierHeartRate', kind: 'quantity', unit: '/min', loinc: '8867-4', appleCategory: 'Heart' };
const BP = { metric: 'HKCorrelationTypeIdentifierBloodPressure', kind: 'correlation', unit: 'mmHg', loinc: '85354-9', appleCategory: 'Vitals' };
const STEPS = { metric: 'HKQuantityTypeIdentifierStepCount', kind: 'quantity', unit: 'count', appleCategory: 'Activity' };
const SLEEP = { metric: 'HKCategoryTypeIdentifierSleepAnalysis', kind: 'category', appleCategory: 'Sleep' };

describeIntegration('HealthKit mirror against a live Solid POD', () => {
  let auth: SolidAuthService;
  let pod: PodClient;
  let vitals: VitalSignsRepository;
  const newService = () => new HealthKitMirrorService(
    new MetricRegistryPodRepository(pod),
    { 'vital-signs': vitals as unknown as DomainRepository },
    (pillar) => new PillarObservationRepository(pod, pillar) as unknown as DomainRepository,
    { bridgeId: 'integration-bridge', peScopeUrls: [] },
  );
  // Unique per run, so a re-run against a persistent CSS volume starts clean.
  const stamp = Date.now();
  const at = (minutes: number) => new Date(Date.UTC(2026, 8, 25, 8, 0, 0) + stamp % 100000 * 60000 + minutes * 60000).toISOString();

  beforeAll(async () => {
    auth = new SolidAuthService({ oidcIssuer: BASE_URL!, clientId: CLIENT_ID!, clientSecret: CLIENT_SECRET! });
    await auth.loginWithClientCredentials();
    pod = new PodClient({ podBaseUrl: POD_URL!, podPath: `/health-pim-hk-${stamp}/` }, auth);
    vitals = new VitalSignsRepository(pod);
  });

  afterAll(async () => {
    if (auth) await auth.logout();
  });

  it('declares, approves, mirrors, and persists the approved set in the POD', async () => {
    const service = newService();
    await service.declare([HR, BP, STEPS, SLEEP]);
    const change = await service.change('add', [HR.metric, BP.metric, STEPS.metric]);
    expect(change.generation).toBe(1);

    // A second service reads the registry back from the POD, not memory.
    const reread = await newService().registry();
    expect(reread.generation).toBe(1);
    expect(reread.metrics[HR.metric].state).toBe('active');
    expect(reread.metrics[SLEEP.metric].state).toBe('proposed');
  });

  it('writes vital signs and pillar observations, ShEx-validated, only where used', async () => {
    const service = newService();
    const result = await service.apply({
      generation: 1,
      samples: [
        { uuid: `hr-${stamp}`, metric: HR.metric, startDate: at(0), value: 62, unit: '/min', sourceName: 'Apple Watch' },
        { uuid: `bp-${stamp}`, metric: BP.metric, startDate: at(1), values: { systolic: 118, diastolic: 76 } },
        { uuid: `st-${stamp}`, metric: STEPS.metric, startDate: at(2), endDate: at(60), value: 8421 },
        { uuid: `sl-${stamp}`, metric: SLEEP.metric, startDate: at(3), categoryValue: 'asleepREM' },
      ],
    });
    expect(result.summary).toMatchObject({ create: 3, excluded: 1 });
    expect(result.samples.find((s) => s.metric === SLEEP.metric)).toMatchObject({ action: 'excluded', reason: 'pending-approval' });

    const vitalRecords = await vitals.findAll();
    expect(vitalRecords.map((v) => v.code).sort()).toEqual(['blood-pressure', 'heart-rate']);
    expect(vitalRecords.find((v) => v.code === 'heart-rate')?.source).toMatchObject({ system: 'healthkit', identifier: `hr-${stamp}` });

    const activity = await new PillarObservationRepository(pod, 'activity').findAll();
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({ metric: STEPS.metric, value: 8421, pillar: 'activity' });
    // Sleep is not approved, so its pillar container was never created.
    await expect(pod.listResources(pod.containerUrlForPath('healthkit/sleep'))).rejects.toBeDefined();
  });

  it('is idempotent against records read back from the POD', async () => {
    const result = await newService().apply({
      samples: [{ uuid: `hr-${stamp}`, metric: HR.metric, startDate: at(0), value: 62, unit: '/min' }],
    });
    expect(result.samples[0]).toMatchObject({ action: 'unchanged' });
    expect(result.applied).toBe(0);
  });

  it('never overwrites a differing POD record', async () => {
    const result = await newService().apply({
      samples: [{ uuid: `hr-other-${stamp}`, metric: HR.metric, startDate: at(0), value: 99, unit: '/min' }],
    });
    expect(result.samples[0]).toMatchObject({ action: 'conflict', reason: 'pod-differs' });
    const heartRates = (await vitals.findAll()).filter((v) => v.code === 'heart-rate');
    expect(heartRates).toHaveLength(1);
    expect(heartRates[0].value).toBe(62);
  });

  it('honors a removed metric, leaving its POD records in place', async () => {
    const service = newService();
    await service.change('remove', [STEPS.metric]);
    const preview = await service.preview({ samples: [{ uuid: `st2-${stamp}`, metric: STEPS.metric, startDate: at(90), value: 10 }] });
    expect(preview.samples[0]).toMatchObject({ action: 'excluded', reason: 'not-in-scope' });
    expect(await new PillarObservationRepository(pod, 'activity').findAll()).toHaveLength(1);
    expect(await service.mirroredCounts()).toMatchObject({ 'vital-signs': 2, activity: 1 });
  });
});
