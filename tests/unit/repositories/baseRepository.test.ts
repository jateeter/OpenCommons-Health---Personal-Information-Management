import {
  buildThing,
  createSolidDataset,
  createThing,
  getStringNoLocale,
  setThing,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../../../src/pod/podClient';
import { BaseRepository } from '../../../src/repositories/baseRepository';
import { ValidationError } from '../../../src/errors';

interface MinimalEntity {
  url?: string;
  insurerName?: string;
}

class BrokenInsuranceRepository extends BaseRepository<MinimalEntity> {
  constructor(client: PodClient) {
    super(client, 'InsurancePolicy');
  }

  protected toThing(_entity: MinimalEntity, resourceUrl: string): Thing {
    const { health, rdf } = this.NS;
    return buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}InsurancePolicy`)
      .addUrl(`${health}insuranceType`, `${health}InsMedical`)
      .build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): MinimalEntity {
    return {
      url: resourceUrl,
      insurerName: getStringNoLocale(thing, `${this.NS.schema}name`) ?? undefined,
    };
  }
}

describe('BaseRepository ShEx RDF validation', () => {
  const client = {
    ensureContainer: jest.fn(async () => 'http://pod/health-pim/insurancepolicys/'),
    createEmptyDataset: jest.fn(() => createSolidDataset()),
    saveDataset: jest.fn(async (_url: string, dataset: unknown) => dataset),
    getDataset: jest.fn(async (url: string) => setThing(
      createSolidDataset(),
      buildThing(createThing({ url }))
        .addUrl('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'https://opencommons.health/ns/health#InsurancePolicy')
        .build(),
    )),
  } as unknown as PodClient;

  beforeEach(() => jest.clearAllMocks());

  it('blocks writes whose mapped RDF does not satisfy the registered ShEx shape', async () => {
    const repository = new BrokenInsuranceRepository(client);
    await expect(repository.create({ insurerName: 'Missing in RDF' })).rejects.toMatchObject({
      name: 'ValidationError',
      issues: expect.arrayContaining([
        expect.objectContaining({ field: 'https://schema.org/name' }),
        expect.objectContaining({ field: 'https://opencommons.health/ns/health#memberId' }),
      ]),
    });
    expect(client.saveDataset).not.toHaveBeenCalled();
  });

  it('uses ValidationError for ShEx failures', async () => {
    const repository = new BrokenInsuranceRepository(client);
    await expect(repository.create({})).rejects.toThrow(ValidationError);
  });
});
