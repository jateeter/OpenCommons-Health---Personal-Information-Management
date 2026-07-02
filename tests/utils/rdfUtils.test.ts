import {
  containerPath,
  containerUrl,
  newResourceUrl,
  nowIso,
  NS,
  todayIso,
  turtleLiteral,
  turtlePrefixes,
  turtleString,
  uri,
} from '../../src/utils/rdfUtils';

describe('rdfUtils', () => {
  describe('NS', () => {
    it('contains the expected namespace IRIs', () => {
      expect(NS.schema).toBe('https://schema.org/');
      expect(NS.health).toBe('https://opencommons.health/ns/health#');
      expect(NS.xsd).toBe('http://www.w3.org/2001/XMLSchema#');
    });
  });

  describe('uri()', () => {
    it('concatenates a namespace and local name', () => {
      expect(uri('schema', 'Person')).toBe('https://schema.org/Person');
      expect(uri('health', 'Immunization')).toBe(
        'https://opencommons.health/ns/health#Immunization',
      );
    });
  });

  describe('containerPath()', () => {
    it('returns the lowercased plural path', () => {
      expect(containerPath('MedicalCondition')).toBe('medicalconditions/');
      expect(containerPath('Medication')).toBe('medications/');
    });
  });

  describe('containerUrl()', () => {
    it('builds a well-formed container URL', () => {
      const url = containerUrl(
        'http://localhost:3000/alice',
        '/health-pim/',
        'MedicalCondition',
      );
      expect(url).toBe(
        'http://localhost:3000/alice/health-pim/medicalconditions/',
      );
    });

    it('handles trailing slashes on podBaseUrl', () => {
      const url = containerUrl(
        'http://localhost:3000/alice/',
        'health-pim',
        'Medication',
      );
      expect(url).toBe(
        'http://localhost:3000/alice/health-pim/medications/',
      );
    });
  });

  describe('newResourceUrl()', () => {
    it('appends a slug to the container URL', () => {
      const url = newResourceUrl(
        'http://localhost:3000/alice/health-pim/medications/',
        'medication',
      );
      expect(url).toMatch(
        /^http:\/\/localhost:3000\/alice\/health-pim\/medications\/medication-\d+$/,
      );
    });
  });

  describe('turtleString()', () => {
    it('wraps a plain string in double quotes', () => {
      expect(turtleString('hello')).toBe('"hello"');
    });

    it('escapes internal double quotes', () => {
      expect(turtleString('say "hi"')).toBe('"say \\"hi\\""');
    });
  });

  describe('turtleLiteral()', () => {
    it('produces a typed literal string', () => {
      const lit = turtleLiteral('42', 'http://www.w3.org/2001/XMLSchema#integer');
      expect(lit).toBe(
        '"42"^^<http://www.w3.org/2001/XMLSchema#integer>',
      );
    });
  });

  describe('turtlePrefixes()', () => {
    it('includes all namespace prefixes', () => {
      const prefixes = turtlePrefixes();
      expect(prefixes).toContain('@prefix schema:');
      expect(prefixes).toContain('@prefix health:');
      expect(prefixes).toContain('@prefix xsd:');
    });
  });

  describe('nowIso()', () => {
    it('returns a valid ISO-8601 datetime string', () => {
      const now = nowIso();
      expect(() => new Date(now)).not.toThrow();
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('todayIso()', () => {
    it('returns a YYYY-MM-DD date string', () => {
      const today = todayIso();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
