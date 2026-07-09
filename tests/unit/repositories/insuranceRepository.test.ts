import { InsuranceRepository } from '../../../src/repositories/insuranceRepository';
import type { PodClient } from '../../../src/pod/podClient';

describe('InsuranceRepository', () => {
  const client = {
    ensureContainer: jest.fn(async () => 'http://pod/health-pim/insurancepolicys/'),
    createEmptyDataset: jest.fn(() => ({ internal_resourceInfo: null, graphs: { default: {} } })),
    saveDataset: jest.fn(async (_url: string, dataset: unknown) => dataset),
  } as unknown as PodClient;

  beforeEach(() => jest.clearAllMocks());

  it('creates a valid insurance policy', async () => {
    const repository = new InsuranceRepository(client);
    const policy = await repository.create({
      type: 'medical',
      insurerName: 'Open Health Plan',
      memberId: 'MEM-42',
      effectiveDate: '2026-01-01',
    });
    expect(policy.url).toContain('insurancepolicy-');
    expect(client.saveDataset).toHaveBeenCalled();
  });

  it('rejects missing policy identifiers and invalid dates', async () => {
    const repository = new InsuranceRepository(client);
    await expect(repository.create({
      type: 'medical',
      insurerName: '',
      memberId: '',
      effectiveDate: 'January 1',
    })).rejects.toMatchObject({
      name: 'ValidationError',
      issues: expect.arrayContaining([
        expect.objectContaining({ field: 'insurerName' }),
        expect.objectContaining({ field: 'memberId' }),
        expect.objectContaining({ field: 'effectiveDate' }),
      ]),
    });
  });
});
