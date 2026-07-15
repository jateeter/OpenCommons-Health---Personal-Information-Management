import { WorkflowTaskRepository } from '../../../src/repositories/workflowTaskRepository';
import type { PodClient } from '../../../src/pod/podClient';

describe('WorkflowTaskRepository', () => {
  const client = {
    ensureContainer: jest.fn(async () => 'http://pod/health-pim/workflowtasks/'),
    createEmptyDataset: jest.fn(() => ({ internal_resourceInfo: null, graphs: { default: {} } })),
    saveDataset: jest.fn(async (_url: string, dataset: unknown) => dataset),
  } as unknown as PodClient;

  beforeEach(() => jest.clearAllMocks());

  it('creates valid workflow task metadata', async () => {
    const repository = new WorkflowTaskRepository(client);
    const task = await repository.create({
      taskType: { system: 'http://snomed.info/id/', code: '386053000', display: 'Evaluation procedure' },
      status: 'requested',
      intent: 'plan',
      description: 'Review Annual Medicare Wellness preventive plan',
      authoredDate: '2026-01-15T12:00:00Z',
    });

    expect(task.url).toContain('workflowtask-');
    expect(client.saveDataset).toHaveBeenCalled();
  });

  it('rejects invalid workflow status and missing task metadata', async () => {
    const repository = new WorkflowTaskRepository(client);
    await expect(repository.create({
      taskType: { system: '', code: '' },
      status: 'unknown',
      intent: 'bad',
      description: '',
      dueDate: 'tomorrow',
    } as never)).rejects.toMatchObject({
      name: 'ValidationError',
      issues: expect.arrayContaining([
        expect.objectContaining({ field: 'taskType' }),
        expect.objectContaining({ field: 'status' }),
        expect.objectContaining({ field: 'intent' }),
        expect.objectContaining({ field: 'description' }),
        expect.objectContaining({ field: 'dueDate' }),
      ]),
    });
  });
});
