/**
 * RDF round-trip tests for ConditionRepository.
 *
 * These tests verify that converting a domain {@link MedicalCondition} to an
 * RDF Thing and back produces an equivalent object, with no network calls.
 *
 * Because `toThing` and `fromThing` are protected methods, a thin test subclass
 * exposes them publicly so they can be exercised directly.
 */
import {
  createSolidDataset,
  setThing,
  getThing,
  type Thing,
} from '@inrupt/solid-client';
import { ConditionRepository } from '../../src/repositories/conditionRepository';
import type { MedicalCondition } from '../../src/types/health';
import type { PodClient } from '../../src/pod/podClient';

// ─── Testable subclass ────────────────────────────────────────────────────────

class TestableCR extends ConditionRepository {
  toThingPublic(entity: MedicalCondition, url: string): Thing {
    return this.toThing(entity, url);
  }
  fromThingPublic(thing: Thing, url: string): MedicalCondition {
    return this.fromThing(thing, url);
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const RESOURCE_URL = 'http://localhost:3000/alice/health-pim/medicalconditions/cond-123';

const FULL_CONDITION: MedicalCondition = {
  url: RESOURCE_URL,
  code: {
    system: 'http://snomed.info/id/',
    code: '44054006',
    display: 'Type 2 diabetes mellitus',
  },
  status: 'active',
  severity: 'moderate',
  onsetDate: '2021-03-15',
  abatementDate: '2023-06-01',
  notes: 'Managed with diet and medication',
  recordedBy: 'Dr. Jane Smith',
  createdAt: '2021-03-15T10:00:00.000Z',
  updatedAt: '2023-06-01T08:00:00.000Z',
};

const MINIMAL_CONDITION: MedicalCondition = {
  url: RESOURCE_URL,
  code: {
    system: 'http://snomed.info/id/',
    code: '44054006',
  },
  status: 'resolved',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRepo(): TestableCR {
  return new TestableCR({} as PodClient);
}

/**
 * Perform a full domain → Thing → domain round-trip.
 * Stores the Thing in an in-memory dataset then retrieves it to simulate
 * exactly what happens during a real pod write/read cycle.
 */
function roundTrip(repo: TestableCR, condition: MedicalCondition): MedicalCondition {
  const url = condition.url ?? RESOURCE_URL;
  const thing = repo.toThingPublic(condition, url);

  // Store in a real in-memory SolidDataset, then retrieve.
  const dataset = setThing(createSolidDataset(), thing);
  const retrieved = getThing(dataset, url);
  if (!retrieved) throw new Error('Thing not found after setThing');

  return repo.fromThingPublic(retrieved, url);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Condition RDF round-trip', () => {
  let repo: TestableCR;

  beforeEach(() => {
    repo = makeRepo();
  });

  describe('full condition with all optional fields', () => {
    let result: MedicalCondition;

    beforeEach(() => {
      result = roundTrip(repo, FULL_CONDITION);
    });

    it('preserves url', () => {
      expect(result.url).toBe(RESOURCE_URL);
    });

    it('preserves code.system', () => {
      expect(result.code.system).toBe(FULL_CONDITION.code.system);
    });

    it('preserves code.code', () => {
      expect(result.code.code).toBe(FULL_CONDITION.code.code);
    });

    it('preserves code.display', () => {
      expect(result.code.display).toBe(FULL_CONDITION.code.display);
    });

    it('preserves status', () => {
      expect(result.status).toBe(FULL_CONDITION.status);
    });

    it('preserves severity', () => {
      expect(result.severity).toBe(FULL_CONDITION.severity);
    });

    it('preserves onsetDate', () => {
      expect(result.onsetDate).toBe(FULL_CONDITION.onsetDate);
    });

    it('preserves abatementDate', () => {
      expect(result.abatementDate).toBe(FULL_CONDITION.abatementDate);
    });

    it('preserves notes', () => {
      expect(result.notes).toBe(FULL_CONDITION.notes);
    });

    it('preserves recordedBy', () => {
      expect(result.recordedBy).toBe(FULL_CONDITION.recordedBy);
    });

    it('preserves createdAt', () => {
      expect(result.createdAt).toBe(FULL_CONDITION.createdAt);
    });

    it('preserves updatedAt', () => {
      expect(result.updatedAt).toBe(FULL_CONDITION.updatedAt);
    });
  });

  describe('minimal condition (required fields only)', () => {
    let result: MedicalCondition;

    beforeEach(() => {
      result = roundTrip(repo, MINIMAL_CONDITION);
    });

    it('preserves url', () => {
      expect(result.url).toBe(RESOURCE_URL);
    });

    it('preserves code.system', () => {
      expect(result.code.system).toBe(MINIMAL_CONDITION.code.system);
    });

    it('preserves code.code', () => {
      expect(result.code.code).toBe(MINIMAL_CONDITION.code.code);
    });

    it('preserves status', () => {
      expect(result.status).toBe(MINIMAL_CONDITION.status);
    });

    it('has undefined optional fields', () => {
      expect(result.severity).toBeUndefined();
      expect(result.onsetDate).toBeUndefined();
      expect(result.abatementDate).toBeUndefined();
      expect(result.notes).toBeUndefined();
      expect(result.recordedBy).toBeUndefined();
    });
  });

  describe('all valid ConditionStatus values', () => {
    const statuses: MedicalCondition['status'][] = [
      'active',
      'recurrence',
      'relapse',
      'inactive',
      'remission',
      'resolved',
    ];

    for (const status of statuses) {
      it(`round-trips status "${status}"`, () => {
        const condition: MedicalCondition = {
          ...MINIMAL_CONDITION,
          status,
        };
        const result = roundTrip(repo, condition);
        expect(result.status).toBe(status);
      });
    }
  });

  describe('all valid ConditionSeverity values', () => {
    const severities: MedicalCondition['severity'][] = [
      'mild',
      'moderate',
      'severe',
    ];

    for (const severity of severities) {
      it(`round-trips severity "${severity}"`, () => {
        const condition: MedicalCondition = {
          ...MINIMAL_CONDITION,
          severity,
        };
        const result = roundTrip(repo, condition);
        expect(result.severity).toBe(severity);
      });
    }
  });

  describe('deterministic output', () => {
    it('produces the same Thing on multiple calls with the same input', () => {
      const thing1 = repo.toThingPublic(FULL_CONDITION, RESOURCE_URL);
      const thing2 = repo.toThingPublic(FULL_CONDITION, RESOURCE_URL);
      // Both should parse to the same domain object when read back.
      const ds1 = setThing(createSolidDataset(), thing1);
      const ds2 = setThing(createSolidDataset(), thing2);
      const t1 = getThing(ds1, RESOURCE_URL)!;
      const t2 = getThing(ds2, RESOURCE_URL)!;
      const r1 = repo.fromThingPublic(t1, RESOURCE_URL);
      const r2 = repo.fromThingPublic(t2, RESOURCE_URL);
      expect(r1).toEqual(r2);
    });
  });
});
