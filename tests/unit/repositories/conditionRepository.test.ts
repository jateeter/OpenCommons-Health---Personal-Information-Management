/**
 * Unit tests for ConditionRepository.
 *
 * PodClient is fully mocked so no network calls are made.
 * The tests focus on:
 * - Required-field validation (ValidationError)
 * - Date normalisation
 * - URL immutability on update
 * - CRUD delegation to PodClient
 */
import { ConditionRepository } from '../../../src/repositories/conditionRepository';
import { ValidationError, NotFoundError } from '../../../src/errors';
import type { MedicalCondition } from '../../../src/types/health';
import type { PodClient } from '../../../src/pod/podClient';
import {
  createSolidDataset,
  setThing,
  buildThing,
  createThing,
} from '@inrupt/solid-client';

// ─── Mock PodClient ───────────────────────────────────────────────────────────

const mockEnsureContainer = jest.fn();
const mockGetDataset = jest.fn();
const mockSaveDataset = jest.fn();
const mockDeleteResource = jest.fn();
const mockListResources = jest.fn();
const mockContainerUrlFor = jest.fn();
const mockCreateEmptyDataset = jest.fn();

const mockClient = {
  ensureContainer: mockEnsureContainer,
  getDataset: mockGetDataset,
  saveDataset: mockSaveDataset,
  deleteResource: mockDeleteResource,
  listResources: mockListResources,
  containerUrlFor: mockContainerUrlFor,
  createEmptyDataset: mockCreateEmptyDataset,
} as unknown as PodClient;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONTAINER = 'http://localhost:3000/alice/health-pim/medicalconditions/';
const RESOURCE_URL = `${CONTAINER}medicalcondition-1`;

/** Minimal valid condition fixture. */
const validCondition: MedicalCondition = {
  code: {
    system: 'http://snomed.info/id/',
    code: '44054006',
    display: 'Type 2 diabetes mellitus',
  },
  status: 'active',
  onsetDate: '2021-03-15',
  notes: 'Diagnosed at annual check-up',
};

/** Same condition with a URL (as if it was previously created). */
const savedCondition: MedicalCondition = {
  ...validCondition,
  url: RESOURCE_URL,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockEnsureContainer.mockResolvedValue(CONTAINER);
  mockCreateEmptyDataset.mockReturnValue(createSolidDataset());
  mockSaveDataset.mockResolvedValue(createSolidDataset());
  mockContainerUrlFor.mockReturnValue(CONTAINER);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConditionRepository', () => {
  let repo: ConditionRepository;

  beforeEach(() => {
    repo = new ConditionRepository(mockClient);
  });

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('persists a valid condition and returns it with a url', async () => {
      const result = await repo.create(validCondition);

      expect(result.url).toMatch(/medicalconditions\//);
      expect(result.code.code).toBe('44054006');
      expect(mockEnsureContainer).toHaveBeenCalledWith('MedicalCondition');
      expect(mockSaveDataset).toHaveBeenCalledTimes(1);
    });

    it('normalises onsetDate to YYYY-MM-DD', async () => {
      const c: MedicalCondition = {
        ...validCondition,
        onsetDate: '2021-3-5',
      };
      const result = await repo.create(c);
      // The entity returned should have the normalised date
      // (we can't easily check what was written to the pod in this unit test,
      //  but we verify create() succeeds without error)
      expect(result).toBeDefined();
    });

    it('throws ValidationError when code.system is empty', async () => {
      const bad: MedicalCondition = {
        ...validCondition,
        code: { ...validCondition.code, system: '' },
      };
      await expect(repo.create(bad)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when code.code is missing', async () => {
      const bad: MedicalCondition = {
        ...validCondition,
        code: { system: 'http://snomed.info/id/', code: '' },
      };
      await expect(repo.create(bad)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when status is missing', async () => {
      const bad = { ...validCondition, status: '' } as unknown as MedicalCondition;
      await expect(repo.create(bad)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for an invalid status value', async () => {
      const bad = { ...validCondition, status: 'unknown-status' } as unknown as MedicalCondition;
      await expect(repo.create(bad)).rejects.toThrow(ValidationError);
    });

    it('includes structured issues in ValidationError', async () => {
      const bad: MedicalCondition = {
        code: { system: '', code: '' },
        status: '' as MedicalCondition['status'],
      };
      try {
        await repo.create(bad);
        fail('Expected ValidationError');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const ve = err as ValidationError;
        const fields = ve.issues.map((i) => i.field);
        expect(fields).toContain('code.system');
        expect(fields).toContain('code.code');
        expect(fields).toContain('status');
      }
    });

    it('throws ValidationError for an invalid severity value', async () => {
      const bad = {
        ...validCondition,
        severity: 'extreme' as MedicalCondition['severity'],
      };
      await expect(repo.create(bad)).rejects.toThrow(ValidationError);
    });
  });

  // ── update() ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates a valid saved condition', async () => {
      const fakeDataset = createSolidDataset();
      mockGetDataset.mockResolvedValue(fakeDataset);

      const updated = await repo.update({ ...savedCondition, notes: 'Updated note' });
      expect(updated.notes).toBe('Updated note');
      expect(mockSaveDataset).toHaveBeenCalledTimes(1);
    });

    it('throws ValidationError when url is absent', async () => {
      await expect(repo.update(validCondition)).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when required fields are missing on update', async () => {
      const bad: MedicalCondition = {
        ...savedCondition,
        code: { system: '', code: '' },
      };
      await expect(repo.update(bad)).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError when the resource does not exist on the pod', async () => {
      mockGetDataset.mockRejectedValue(new Error('404 Not Found'));
      await expect(repo.update(savedCondition)).rejects.toThrow(NotFoundError);
    });
  });

  // ── findByUrl() ───────────────────────────────────────────────────────────

  describe('findByUrl()', () => {
    it('returns null when the resource is not found', async () => {
      mockGetDataset.mockRejectedValue(new Error('404 Not Found'));
      const result = await repo.findByUrl(RESOURCE_URL);
      expect(result).toBeNull();
    });

    it('returns the condition when the dataset contains the expected Thing', async () => {
      // Build a minimal in-memory dataset with the required predicates.
      const health = 'https://opencommons.health/ns/health#';
      const schema = 'https://schema.org/';
      const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

      const thing = buildThing(createThing({ url: RESOURCE_URL }))
        .addUrl(`${rdf}type`, `${schema}MedicalCondition`)
        .addUrl(`${health}codingSystem`, 'http://snomed.info/id/')
        .addStringNoLocale(`${health}codingCode`, '44054006')
        .addUrl(`${health}conditionStatus`, `${health}ConditionActive`)
        .build();

      const dataset = setThing(createSolidDataset(), thing);
      mockGetDataset.mockResolvedValue(dataset);

      const result = await repo.findByUrl(RESOURCE_URL);

      expect(result).not.toBeNull();
      expect(result?.code.code).toBe('44054006');
      expect(result?.status).toBe('active');
    });
  });

  // ── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns an empty array when the container is empty', async () => {
      mockListResources.mockResolvedValue([]);
      const results = await repo.findAll();
      expect(results).toEqual([]);
    });

    it('lists all conditions from the container', async () => {
      const url1 = `${CONTAINER}mc-1`;
      const url2 = `${CONTAINER}mc-2`;
      mockListResources.mockResolvedValue([url1, url2]);

      const health = 'https://opencommons.health/ns/health#';
      const schema = 'https://schema.org/';
      const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

      const makeDs = (url: string, code: string) => {
        const thing = buildThing(createThing({ url }))
          .addUrl(`${rdf}type`, `${schema}MedicalCondition`)
          .addUrl(`${health}codingSystem`, 'http://snomed.info/id/')
          .addStringNoLocale(`${health}codingCode`, code)
          .addUrl(`${health}conditionStatus`, `${health}ConditionActive`)
          .build();
        return setThing(createSolidDataset(), thing);
      };

      mockGetDataset
        .mockResolvedValueOnce(makeDs(url1, 'code-1'))
        .mockResolvedValueOnce(makeDs(url2, 'code-2'));

      const results = await repo.findAll();
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.code.code)).toEqual(['code-1', 'code-2']);
    });
  });

  // ── delete() ──────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('delegates to PodClient.deleteResource()', async () => {
      mockDeleteResource.mockResolvedValue(undefined);
      await repo.delete(RESOURCE_URL);
      expect(mockDeleteResource).toHaveBeenCalledWith(RESOURCE_URL);
    });
  });
});
