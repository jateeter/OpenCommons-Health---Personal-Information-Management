/**
 * Unit tests for PodClient.
 *
 * All @inrupt/solid-client functions are mocked so no network calls are made.
 */
import { PodClient, type PodClientConfig } from '../../../src/pod/podClient';
import type { SolidAuthService } from '../../../src/auth/solidAuth';
import type { SolidDataset } from '@inrupt/solid-client';

// ─── Mock @inrupt/solid-client ────────────────────────────────────────────────

const mockCreateContainerAt = jest.fn();
const mockGetSolidDataset = jest.fn();
const mockSaveSolidDatasetAt = jest.fn();
const mockDeleteFile = jest.fn();
const mockGetContainedResourceUrlAll = jest.fn();
const mockCreateSolidDataset = jest.fn();

jest.mock('@inrupt/solid-client', () => ({
  createContainerAt: (...args: unknown[]) => mockCreateContainerAt(...args),
  getSolidDataset: (...args: unknown[]) => mockGetSolidDataset(...args),
  saveSolidDatasetAt: (...args: unknown[]) => mockSaveSolidDatasetAt(...args),
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
  getContainedResourceUrlAll: (...args: unknown[]) =>
    mockGetContainedResourceUrlAll(...args),
  createSolidDataset: (...args: unknown[]) => mockCreateSolidDataset(...args),
  // re-export other symbols used by the module under test
  addStringNoLocale: jest.fn(),
  addUrl: jest.fn(),
  buildThing: jest.fn(),
  createThing: jest.fn(),
  getStringNoLocale: jest.fn(),
  getThing: jest.fn(),
  getUrl: jest.fn(),
  removeThing: jest.fn(),
  setThing: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockFetch = jest.fn() as typeof fetch;

const mockAuth = {
  authenticatedFetch: mockFetch,
} as unknown as SolidAuthService;

const defaultConfig: PodClientConfig = {
  podBaseUrl: 'http://localhost:3000/alice/',
  podPath: '/health-pim/',
};

function makeClient(config: PodClientConfig = defaultConfig): PodClient {
  return new PodClient(config, mockAuth);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('PodClient', () => {
  describe('containerUrlFor()', () => {
    it('returns the absolute container URL for a type name', () => {
      const client = makeClient();
      expect(client.containerUrlFor('MedicalCondition')).toBe(
        'http://localhost:3000/alice/health-pim/medicalconditions/',
      );
    });
  });

  describe('ensureContainer()', () => {
    it('calls createContainerAt with the correct URL and fetch', async () => {
      mockCreateContainerAt.mockResolvedValue(undefined);
      const client = makeClient();
      const url = await client.ensureContainer('MedicalCondition');

      expect(url).toBe(
        'http://localhost:3000/alice/health-pim/medicalconditions/',
      );
      expect(mockCreateContainerAt).toHaveBeenCalledWith(
        'http://localhost:3000/alice/health-pim/medicalconditions/',
        { fetch: mockFetch },
      );
    });

    it('ignores 409 Conflict errors (container already exists)', async () => {
      mockCreateContainerAt.mockRejectedValue(new Error('409 Conflict'));
      const client = makeClient();
      await expect(client.ensureContainer('MedicalCondition')).resolves.toBeDefined();
    });
  });

  describe('getDataset()', () => {
    it('delegates to getSolidDataset with authenticated fetch', async () => {
      const fakeDataset = {} as SolidDataset;
      mockGetSolidDataset.mockResolvedValue(fakeDataset);

      const client = makeClient();
      const result = await client.getDataset('http://localhost:3000/alice/res');

      expect(mockGetSolidDataset).toHaveBeenCalledWith(
        'http://localhost:3000/alice/res',
        { fetch: mockFetch },
      );
      expect(result).toBe(fakeDataset);
    });
  });

  describe('saveDataset()', () => {
    it('delegates to saveSolidDatasetAt with authenticated fetch', async () => {
      const fakeDataset = {} as SolidDataset;
      mockSaveSolidDatasetAt.mockResolvedValue(fakeDataset);

      const client = makeClient();
      const result = await client.saveDataset('http://localhost:3000/alice/res', fakeDataset);

      expect(mockSaveSolidDatasetAt).toHaveBeenCalledWith(
        'http://localhost:3000/alice/res',
        fakeDataset,
        { fetch: mockFetch },
      );
      expect(result).toBe(fakeDataset);
    });
  });

  describe('createEmptyDataset()', () => {
    it('calls createSolidDataset and returns the result', () => {
      const fakeDataset = {} as SolidDataset;
      mockCreateSolidDataset.mockReturnValue(fakeDataset);

      const client = makeClient();
      expect(client.createEmptyDataset()).toBe(fakeDataset);
    });
  });

  describe('deleteResource()', () => {
    it('delegates to deleteFile with authenticated fetch', async () => {
      mockDeleteFile.mockResolvedValue(undefined);
      const client = makeClient();
      await client.deleteResource('http://localhost:3000/alice/res');

      expect(mockDeleteFile).toHaveBeenCalledWith(
        'http://localhost:3000/alice/res',
        { fetch: mockFetch },
      );
    });
  });

  describe('listResources()', () => {
    it('fetches the container dataset and returns contained URLs', async () => {
      const fakeDataset = {} as SolidDataset;
      const expectedUrls = [
        'http://localhost:3000/alice/health-pim/medicalconditions/mc-1',
        'http://localhost:3000/alice/health-pim/medicalconditions/mc-2',
      ];
      mockGetSolidDataset.mockResolvedValue(fakeDataset);
      mockGetContainedResourceUrlAll.mockReturnValue(expectedUrls);

      const client = makeClient();
      const urls = await client.listResources(
        'http://localhost:3000/alice/health-pim/medicalconditions/',
      );

      expect(urls).toEqual(expectedUrls);
      expect(mockGetSolidDataset).toHaveBeenCalledWith(
        'http://localhost:3000/alice/health-pim/medicalconditions/',
        { fetch: mockFetch },
      );
    });
  });
});
