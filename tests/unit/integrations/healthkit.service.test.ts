import type { DomainRepository } from '../../../src/httpApp';
import { ConflictError, ValidationError } from '../../../src/errors';
import { HealthKitMirrorService, InMemoryMetricRegistryStore } from '../../../src/integrations/healthkit';

type Rec = Record<string, unknown>;

function fakeRepository(initial: Rec[] = []): DomainRepository & { records: Rec[] } {
  const records = [...initial];
  let n = 0;
  return {
    records,
    findAll: jest.fn(async () => records),
    findByUrl: jest.fn(async (url: string) => records.find((r) => r.url === url) ?? null),
    create: jest.fn(async (entity: never) => {
      const created = { ...(entity as Rec), url: `http://pod/created/${++n}` };
      records.push(created);
      return created;
    }),
    update: jest.fn(async (entity: never) => entity),
    delete: jest.fn(async () => undefined),
  };
}

const HR = { metric: 'HKQuantityTypeIdentifierHeartRate', kind: 'quantity', unit: '/min', loinc: '8867-4', appleCategory: 'Heart' };
const BP = { metric: 'HKCorrelationTypeIdentifierBloodPressure', kind: 'correlation', unit: 'mmHg', loinc: '85354-9', appleCategory: 'Vitals' };
const STEPS = { metric: 'HKQuantityTypeIdentifierStepCount', kind: 'quantity', unit: 'count', appleCategory: 'Activity' };
const SLEEP = { metric: 'HKCategoryTypeIdentifierSleepAnalysis', kind: 'category', appleCategory: 'Sleep' };

describe('HealthKitMirrorService (MIRROR_CONTRACT)', () => {
  let vitals: ReturnType<typeof fakeRepository>;
  let pillars: Map<string, ReturnType<typeof fakeRepository>>;
  let fetchMock: jest.Mock;
  let service: HealthKitMirrorService;

  beforeEach(() => {
    vitals = fakeRepository();
    pillars = new Map();
    fetchMock = jest.fn(async () => ({ ok: true, status: 200 }));
    service = new HealthKitMirrorService(
      new InMemoryMetricRegistryStore(),
      { 'vital-signs': vitals },
      (pillar) => {
        const repo = fakeRepository();
        pillars.set(pillar, repo);
        return repo;
      },
      { bridgeId: 'bridge-1', peScopeUrls: ['http://pe-1:5300'], peToken: 'pe-token' },
      fetchMock as unknown as typeof fetch,
    );
  });

  const hr = (uuid: string, value: number, at = '2026-09-25T08:00:00Z') => ({ uuid, metric: HR.metric, startDate: at, value, unit: '/min', sourceName: 'Apple Watch' });

  it('declares metrics as proposed: nothing mirrors until the owner adds them', async () => {
    const declared = await service.declare([HR, STEPS]);
    expect(declared.applied.map((a) => a.state)).toEqual(['proposed', 'proposed']);
    expect(declared.generation).toBe(0);

    const preview = await service.preview({ samples: [hr('s-1', 62)] });
    expect(preview.samples[0]).toMatchObject({ action: 'excluded', reason: 'pending-approval', pillar: 'vital-signs' });
    expect(vitals.create).not.toHaveBeenCalled();
  });

  it('owner add bumps the generation and pushes the same scope change to each PE', async () => {
    await service.declare([HR]);
    const change = await service.change('add', [HR.metric]);
    expect(change).toMatchObject({ action: 'add', generation: 1, applied: [{ metric: HR.metric, state: 'active', previous: 'proposed' }] });
    expect(fetchMock).toHaveBeenCalledWith('http://pe-1:5300/api/integrations/healthkit/scope', expect.objectContaining({ method: 'POST' }));
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toEqual({ bridgeId: 'bridge-1', action: 'add', types: [HR.metric], source: 'pim', reason: 'owner changed the approved metric set' });
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer pe-token');
  });

  it('refuses to approve a metric the bridge has not declared', async () => {
    await expect(service.change('add', ['HKQuantityTypeIdentifierStepCount'])).rejects.toThrow(ValidationError);
  });

  it('writes an approved sample once, and a re-send is unchanged (idempotent through the key)', async () => {
    await service.declare([HR]);
    await service.change('add', [HR.metric]);

    const first = await service.apply({ generation: 1, samples: [hr('s-1', 62)] });
    expect(first.applied).toBe(1);
    expect(first.samples[0]).toMatchObject({ action: 'create', mirrorState: 'mirrored', url: 'http://pod/created/1' });
    expect(vitals.records[0]).toMatchObject({ code: 'heart-rate', value: 62, source: { system: 'healthkit', identifier: 's-1', device: 'Apple Watch' } });

    const again = await service.apply({ generation: 1, samples: [hr('s-1', 62)] });
    expect(again.applied).toBe(0);
    expect(again.samples[0]).toMatchObject({ action: 'unchanged', mirrorState: 'mirrored' });
    expect(vitals.create).toHaveBeenCalledTimes(1);
  });

  it('reconciles with the Epic copy of the same measurement instead of duplicating it', async () => {
    vitals.records.push({
      url: 'http://pod/vitals/epic-1',
      code: 'heart-rate',
      loincCode: { system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' },
      value: 62,
      unit: 'beats/minute',
      effectiveDateTime: '2026-09-25T08:00:00.000Z',
      notes: 'Imported from Epic Observation/abc',
    });
    await service.declare([HR]);
    await service.change('add', [HR.metric]);
    const result = await service.apply({ samples: [hr('s-1', 62, '2026-09-25T08:00:00Z')] });
    expect(result.samples[0]).toMatchObject({ action: 'unchanged', url: 'http://pod/vitals/epic-1' });
    expect(vitals.create).not.toHaveBeenCalled();
  });

  it('never overwrites a differing POD record: the POD wins, the sample is a conflict', async () => {
    vitals.records.push({ url: 'http://pod/vitals/1', code: 'heart-rate', value: 70, unit: '/min', effectiveDateTime: '2026-09-25T08:00:00Z' });
    await service.declare([HR]);
    await service.change('add', [HR.metric]);
    const result = await service.apply({ samples: [hr('s-1', 62)] });
    expect(result.samples[0]).toMatchObject({ action: 'conflict', reason: 'pod-differs', mirrorState: 'conflict' });
    expect(vitals.update).not.toHaveBeenCalled();
    expect(vitals.create).not.toHaveBeenCalled();
    expect(vitals.records[0].value).toBe(70);
  });

  it('maps blood pressure to vital-signs with its components', async () => {
    await service.declare([BP]);
    await service.change('add', [BP.metric]);
    await service.apply({ samples: [{ uuid: 'bp-1', metric: BP.metric, startDate: '2026-09-25T07:00:00Z', values: { systolic: 118, diastolic: 76 } }] });
    expect(vitals.records[0]).toMatchObject({ code: 'blood-pressure', value: { systolic: 118, diastolic: 76 }, unit: 'mmHg' });
  });

  it('stores non-vital metrics in their pillar, creating the container only on first use', async () => {
    await service.declare([STEPS, SLEEP]);
    await service.change('add', [STEPS.metric]);
    expect(pillars.size).toBe(0);
    await service.apply({
      samples: [
        { uuid: 'st-1', metric: STEPS.metric, startDate: '2026-09-25T00:00:00Z', endDate: '2026-09-25T23:59:59Z', value: 8421 },
        { uuid: 'sl-1', metric: SLEEP.metric, startDate: '2026-09-24T23:00:00Z', categoryValue: 'asleepREM' },
      ],
    });
    expect([...pillars.keys()]).toEqual(['activity']);
    expect(pillars.get('activity')?.records[0]).toMatchObject({ pillar: 'activity', metric: STEPS.metric, value: 8421, appleCategory: 'Activity' });
  });

  it('honors lock and remove: excluded from the mirror, existing POD records kept', async () => {
    await service.declare([HR]);
    await service.change('add', [HR.metric]);
    await service.apply({ samples: [hr('s-1', 62)] });

    await service.change('lock', [HR.metric]);
    let preview = await service.preview({ samples: [hr('s-2', 64, '2026-09-25T09:00:00Z')] });
    expect(preview.samples[0]).toMatchObject({ action: 'excluded', reason: 'locked' });

    await service.change('remove', [HR.metric]);
    preview = await service.preview({ samples: [hr('s-2', 64, '2026-09-25T09:00:00Z')] });
    expect(preview.samples[0]).toMatchObject({ action: 'excluded', reason: 'not-in-scope' });
    expect(vitals.records).toHaveLength(1);
    expect(vitals.delete).not.toHaveBeenCalled();
  });

  it('refuses a batch built against a stale approved set', async () => {
    await service.declare([HR]);
    await service.change('add', [HR.metric]);
    await expect(service.apply({ generation: 0, samples: [hr('s-1', 62)] })).rejects.toThrow(ConflictError);
  });

  it('reports an undeclared metric, and declares descriptors that arrive with a batch as proposed', async () => {
    let preview = await service.preview({ samples: [{ uuid: 'x', metric: STEPS.metric, startDate: '2026-09-25T00:00:00Z', value: 1 }] });
    expect(preview.samples[0]).toMatchObject({ action: 'excluded', reason: 'undeclared' });

    preview = await service.preview({ descriptors: [STEPS], samples: [{ uuid: 'x', metric: STEPS.metric, startDate: '2026-09-25T00:00:00Z', value: 1 }] });
    expect(preview.declared).toEqual([STEPS.metric]);
    expect(preview.samples[0]).toMatchObject({ action: 'excluded', reason: 'pending-approval', pillar: 'activity' });
  });

  it('does not create two records for two identical samples in one batch', async () => {
    await service.declare([HR]);
    await service.change('add', [HR.metric]);
    const result = await service.apply({ samples: [hr('s-1', 62), hr('s-1-dup', 62)] });
    expect(result.summary).toMatchObject({ create: 1, unchanged: 1 });
    expect(vitals.create).toHaveBeenCalledTimes(1);
  });

  it('keeps preview and apply PHI-safe: no values in the outcomes', async () => {
    await service.declare([HR]);
    await service.change('add', [HR.metric]);
    const preview = await service.preview({ samples: [hr('s-1', 62)] });
    expect(JSON.stringify(preview)).not.toContain('62');
  });

  it('counts mirrored records per pillar', async () => {
    await service.declare([HR, STEPS]);
    await service.change('add', [HR.metric, STEPS.metric]);
    await service.apply({ samples: [hr('s-1', 62), { uuid: 'st-1', metric: STEPS.metric, startDate: '2026-09-25T00:00:00Z', value: 10 }] });
    expect(await service.mirroredCounts()).toEqual({ 'vital-signs': 1, activity: 1 });
  });
});
