import { createSolidDataset, type SolidDataset } from '@inrupt/solid-client';
import type { PodClient } from '../../../src/pod/podClient';
import { PillarObservationRepository } from '../../../src/repositories/pillarObservationRepository';
import { VitalSignsRepository } from '../../../src/repositories/vitalSignsRepository';
import { ValidationError } from '../../../src/errors';

function podClient() {
  const saved = new Map<string, SolidDataset>();
  const client = {
    ensureContainer: jest.fn(async () => 'http://pod/health-pim/vitalsigns/'),
    ensureContainerPath: jest.fn(async (path: string) => `http://pod/health-pim/${path}/`),
    containerUrlForPath: jest.fn((path: string) => `http://pod/health-pim/${path}/`),
    createEmptyDataset: jest.fn(() => createSolidDataset()),
    saveDataset: jest.fn(async (url: string, dataset: SolidDataset) => {
      saved.set(url, dataset);
      return dataset;
    }),
    getDataset: jest.fn(async (url: string) => saved.get(url) ?? createSolidDataset()),
    listResources: jest.fn(async () => [...saved.keys()]),
  };
  return { client: client as unknown as PodClient, raw: client };
}

describe('PillarObservationRepository', () => {
  it('writes to its own pillar container, passes ShEx, and round-trips', async () => {
    const { client, raw } = podClient();
    const repo = new PillarObservationRepository(client, 'sleep');
    const created = await repo.create({
      pillar: 'sleep',
      metric: 'HKCategoryTypeIdentifierSleepAnalysis',
      appleCategory: 'Sleep',
      valueCategory: 'asleepREM',
      effectiveStart: '2026-09-24T23:00:00.000Z',
      effectiveEnd: '2026-09-25T00:30:00.000Z',
      source: { system: 'healthkit', identifier: 'sl-1', device: 'Apple Watch' },
    });
    expect(raw.ensureContainerPath).toHaveBeenCalledWith('healthkit/sleep');
    expect(created.url).toContain('http://pod/health-pim/healthkit/sleep/');
    const back = await repo.findByUrl(created.url as string);
    expect(back).toMatchObject({
      pillar: 'sleep',
      metric: 'HKCategoryTypeIdentifierSleepAnalysis',
      valueCategory: 'asleepREM',
      source: { system: 'healthkit', identifier: 'sl-1' },
    });
  });

  it('keeps numeric components through RDF', async () => {
    const { client } = podClient();
    const repo = new PillarObservationRepository(client, 'activity');
    const created = await repo.create({
      pillar: 'activity',
      metric: 'HKWorkoutTypeIdentifier',
      appleCategory: 'Activity',
      components: { durationMin: 42, energyKcal: 310 },
      effectiveStart: '2026-09-25T06:00:00.000Z',
      source: { system: 'healthkit', identifier: 'w-1' },
    });
    expect((await repo.findByUrl(created.url as string))?.components).toEqual({ durationMin: 42, energyKcal: 310 });
  });

  it('refuses a record for another pillar, and an unsafe pillar name', () => {
    const { client } = podClient();
    const repo = new PillarObservationRepository(client, 'sleep');
    return Promise.all([
      expect(repo.create({ pillar: 'activity', metric: 'X', appleCategory: 'Activity', effectiveStart: '2026-01-01T00:00:00Z', source: { system: 'healthkit' } } as never))
        .rejects.toThrow(ValidationError),
      expect(() => new PillarObservationRepository(client, '../escape')).toThrow(ValidationError),
    ]);
  });
});

describe('VitalSignsRepository provenance', () => {
  it('round-trips the HealthKit source and still satisfies the vital-signs ShEx', async () => {
    const { client } = podClient();
    const repo = new VitalSignsRepository(client);
    const created = await repo.create({
      code: 'heart-rate',
      value: 62,
      unit: '/min',
      effectiveDateTime: '2026-09-25T08:00:00.000Z',
      source: { system: 'healthkit', identifier: 's-1', device: 'Apple Watch' },
    });
    expect((await repo.findByUrl(created.url as string))?.source).toEqual({ system: 'healthkit', identifier: 's-1', device: 'Apple Watch' });
  });

  it('omits source for records without one', async () => {
    const { client } = podClient();
    const repo = new VitalSignsRepository(client);
    const created = await repo.create({ code: 'body-weight', value: 70, unit: 'kg', effectiveDateTime: '2026-09-25T08:00:00.000Z' });
    expect((await repo.findByUrl(created.url as string))?.source).toBeUndefined();
  });
});
