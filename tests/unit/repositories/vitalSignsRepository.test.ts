import {
  createSolidDataset,
  getThing,
  getUrl,
  type SolidDataset,
} from '@inrupt/solid-client';
import type { PodClient } from '../../../src/pod/podClient';
import { VitalSignsRepository } from '../../../src/repositories/vitalSignsRepository';

describe('VitalSignsRepository', () => {
  const savedDatasets = new Map<string, SolidDataset>();
  const client = {
    ensureContainer: jest.fn(async () => 'http://pod/health-pim/vitalsigns/'),
    createEmptyDataset: jest.fn(() => createSolidDataset()),
    saveDataset: jest.fn(async (url: string, dataset: SolidDataset) => {
      savedDatasets.set(url, dataset);
      return dataset;
    }),
    getDataset: jest.fn(async (url: string) => savedDatasets.get(url) ?? createSolidDataset()),
  } as unknown as PodClient;

  beforeEach(() => {
    jest.clearAllMocks();
    savedDatasets.clear();
  });

  it('maps BMI to the ShEx-required VitalBMI IRI and round-trips it as bmi', async () => {
    const repository = new VitalSignsRepository(client);

    const created = await repository.create({
      code: 'bmi',
      loincCode: { system: 'http://loinc.org', code: '39156-5', display: 'Body mass index (BMI)' },
      value: 27.4,
      unit: 'kg/m2',
      effectiveDateTime: '2026-05-01T14:30:00Z',
    });

    const dataset = savedDatasets.get(created.url as string);
    const thing = dataset ? getThing(dataset, created.url as string) : null;
    expect(thing).not.toBeNull();
    expect(getUrl(thing as NonNullable<typeof thing>, 'https://opencommons.health/ns/health#vitalSignCode')).toBe(
      'https://opencommons.health/ns/health#VitalBMI',
    );

    const roundTripped = await repository.findByUrl(created.url as string);
    expect(roundTripped?.code).toBe('bmi');
  });
});
