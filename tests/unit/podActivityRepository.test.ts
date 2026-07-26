import type { SolidDataset } from '@inrupt/solid-client';
import { PodActivityRepository } from '../../src/podActivityRepository';

describe('PodActivityRepository', () => {
  it('persists and reads a bounded safe Pod activity trail', async () => {
    let saved: SolidDataset | undefined;
    const pod = {
      containerUrlForPath: jest.fn(() => 'http://pod/alice/health-pim/audit/'),
      ensureContainerPath: jest.fn(async () => 'http://pod/alice/health-pim/audit/'),
      getDataset: jest.fn(async () => {
        if (!saved) throw Object.assign(new Error('not found'), { response: { status: 404 } });
        return saved;
      }),
      saveDataset: jest.fn(async (_url: string, dataset: SolidDataset) => {
        saved = dataset;
        return dataset;
      }),
    };
    const repository = new PodActivityRepository(pod as never, 2);

    await repository.append({
      id: 'event-1',
      at: '2026-07-26T10:00:00.000Z',
      kind: 'record-created',
      status: 'ok',
      summary: 'conditions record created in the owner Pod',
      domain: 'conditions',
      resourcePath: '/alice/health-pim/medicalconditions/1',
      source: 'api',
    });
    await repository.append({
      id: 'event-2',
      at: '2026-07-26T10:01:00.000Z',
      kind: 'healthkit-status-verified',
      status: 'ok',
      summary: 'HealthKit observations mirror container verified',
      source: 'api',
    });
    await repository.append({
      id: 'event-3',
      at: '2026-07-26T10:02:00.000Z',
      kind: 'pod-access-verified',
      status: 'ok',
      summary: 'Authenticated Pod access verified',
      source: 'api',
    });

    await expect(repository.list(10)).resolves.toEqual([
      expect.objectContaining({ id: 'event-3' }),
      expect.objectContaining({ id: 'event-2' }),
    ]);
    await expect(repository.status()).resolves.toMatchObject({
      enabled: true,
      status: 'active',
      resourcePath: 'health-pim/audit/activity.ttl',
      eventCount: 2,
    });
    expect(pod.ensureContainerPath).toHaveBeenCalledWith('audit');
    expect(pod.saveDataset).toHaveBeenCalledWith(
      'http://pod/alice/health-pim/audit/activity.ttl',
      expect.anything(),
    );
  });
});
