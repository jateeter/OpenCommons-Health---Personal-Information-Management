import { DocumentRepository } from '../../../src/repositories/documentRepository';
import type { PodClient } from '../../../src/pod/podClient';

describe('DocumentRepository', () => {
  const client = {
    ensureContainer: jest.fn(async () => 'http://pod/health-pim/clinicaldocuments/'),
    createEmptyDataset: jest.fn(() => ({ internal_resourceInfo: null, graphs: { default: {} } })),
    saveDataset: jest.fn(async (_url: string, dataset: unknown) => dataset),
  } as unknown as PodClient;

  beforeEach(() => jest.clearAllMocks());

  it('creates valid clinical document metadata', async () => {
    const repository = new DocumentRepository(client);
    const document = await repository.create({
      documentType: { system: 'http://loinc.org', code: '34133-9', display: 'Summary of episode note' },
      status: 'current',
      title: 'Annual Medicare Wellness Visit Summary',
      authoredDate: '2026-01-15T12:00:00Z',
      sourceSystem: 'epic',
    });

    expect(document.url).toContain('clinicaldocument-');
    expect(client.saveDataset).toHaveBeenCalled();
  });

  it('rejects missing metadata and non-http source URLs', async () => {
    const repository = new DocumentRepository(client);
    await expect(repository.create({
      documentType: { system: '', code: '' },
      status: 'current',
      title: '',
      sourceDocumentUrl: 'file:///private/document.pdf',
    })).rejects.toMatchObject({
      name: 'ValidationError',
      issues: expect.arrayContaining([
        expect.objectContaining({ field: 'documentType' }),
        expect.objectContaining({ field: 'title' }),
        expect.objectContaining({ field: 'sourceDocumentUrl' }),
      ]),
    });
  });
});
