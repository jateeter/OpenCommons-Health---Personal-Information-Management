import {
  computeWellnessSummary,
  WELLNESS_AXIS_DOMAINS,
  WELLNESS_BROWSE_DOMAINS,
  type WellnessSourceRecords,
} from '../../src/wellness';

const NOW = new Date('2026-07-29T12:00:00Z');

const emptySources = (): WellnessSourceRecords => ({
  'vital-signs': [],
  'lab-results': [],
  medications: [],
  conditions: [],
  allergies: [],
  immunizations: [],
});

const daysAgo = (days: number): string => new Date(NOW.valueOf() - days * 24 * 60 * 60 * 1000).toISOString();

const axis = (summary: ReturnType<typeof computeWellnessSummary>, domain: string) => {
  const found = summary.axes.find((candidate) => candidate.domain === domain);
  if (!found) throw new Error(`Missing wellness axis ${domain}`);
  return found;
};

describe('wellness landing summary', () => {
  it('plots exactly the wellness-meaningful domains as axes, in display order', () => {
    const summary = computeWellnessSummary(emptySources(), {}, NOW);
    expect(summary.axes.map((entry) => entry.domain)).toEqual([...WELLNESS_AXIS_DOMAINS]);
    expect(summary.axes).toHaveLength(6);
  });

  it('keeps non-graph domains out of the axes and in the browse list with counts', () => {
    const summary = computeWellnessSummary(emptySources(), {
      profiles: 1,
      providers: 3,
      'insurance-policies': 0,
      documents: 12,
      'workflow-tasks': null,
    }, NOW);

    expect(summary.browse.map((entry) => entry.domain)).toEqual([...WELLNESS_BROWSE_DOMAINS]);
    expect(summary.browse).toEqual([
      { domain: 'profiles', count: 1 },
      { domain: 'providers', count: 3 },
      { domain: 'insurance-policies', count: 0 },
      { domain: 'documents', count: 12 },
      { domain: 'workflow-tasks', count: null },
    ]);
    const axisDomains = summary.axes.map((entry) => String(entry.domain));
    for (const browseDomain of WELLNESS_BROWSE_DOMAINS) {
      expect(axisDomains).not.toContain(String(browseDomain));
    }
  });

  it('marks domains with no records as empty rather than scoring them zero', () => {
    const summary = computeWellnessSummary(emptySources(), {}, NOW);
    for (const entry of summary.axes) {
      expect(entry.status).toBe('empty');
      expect(entry.score).toBeNull();
      expect(entry.recordCount).toBe(0);
    }
  });

  it('scores in-range vital signs green and out-of-range vitals red', () => {
    const healthy = emptySources();
    healthy['vital-signs'] = [
      { code: 'heart-rate', value: 68, unit: 'beats/min', effectiveDateTime: daysAgo(3) },
      { code: 'oxygen-saturation', value: 98, unit: '%', effectiveDateTime: daysAgo(3) },
      { code: 'blood-pressure', value: { systolic: 116, diastolic: 74 }, unit: 'mmHg', effectiveDateTime: daysAgo(3) },
    ];
    const healthyAxis = axis(computeWellnessSummary(healthy, {}, NOW), 'vital-signs');
    expect(healthyAxis.status).toBe('green');
    expect(healthyAxis.score).toBe(100);

    const unwell = emptySources();
    unwell['vital-signs'] = [
      { code: 'heart-rate', value: 145, unit: 'beats/min', effectiveDateTime: daysAgo(2) },
      { code: 'oxygen-saturation', value: 88, unit: '%', effectiveDateTime: daysAgo(2) },
    ];
    const unwellAxis = axis(computeWellnessSummary(unwell, {}, NOW), 'vital-signs');
    expect(unwellAxis.status).toBe('red');
    expect(unwellAxis.score).toBeLessThan(30);
    expect(unwellAxis.summary).toContain('outside its screening range');
  });

  it('treats a marginally high vital as borderline yellow, not red', () => {
    const sources = emptySources();
    sources['vital-signs'] = [
      { code: 'heart-rate', value: 106, unit: 'beats/min', effectiveDateTime: daysAgo(1) },
    ];
    const entry = axis(computeWellnessSummary(sources, {}, NOW), 'vital-signs');
    expect(entry.status).toBe('yellow');
    expect(entry.summary).toContain('borderline');
  });

  it('only considers the newest observation per vital sign code', () => {
    const sources = emptySources();
    sources['vital-signs'] = [
      { code: 'heart-rate', value: 190, unit: 'beats/min', effectiveDateTime: daysAgo(400) },
      { code: 'heart-rate', value: 70, unit: 'beats/min', effectiveDateTime: daysAgo(2) },
    ];
    const entry = axis(computeWellnessSummary(sources, {}, NOW), 'vital-signs');
    expect(entry.status).toBe('green');
    expect(entry.recordCount).toBe(2);
    expect(entry.latestAt).toBe(daysAgo(2));
  });

  it('downgrades stale but in-range vitals to yellow', () => {
    const sources = emptySources();
    sources['vital-signs'] = [
      { code: 'heart-rate', value: 70, unit: 'beats/min', effectiveDateTime: daysAgo(500) },
    ];
    const entry = axis(computeWellnessSummary(sources, {}, NOW), 'vital-signs');
    expect(entry.status).toBe('yellow');
    expect(entry.summary).toContain('over a year old');
  });

  it('flags critical lab interpretations red and abnormal ones yellow', () => {
    const loinc = (code: string) => ({ system: 'http://loinc.org', code });
    const critical = emptySources();
    critical['lab-results'] = [
      { code: loinc('2345-7'), value: 420, interpretation: 'critical-high', effectiveDateTime: daysAgo(10) },
      { code: loinc('718-7'), value: 14, interpretation: 'normal', effectiveDateTime: daysAgo(10) },
    ];
    const criticalAxis = axis(computeWellnessSummary(critical, {}, NOW), 'lab-results');
    expect(criticalAxis.status).toBe('red');
    expect(criticalAxis.summary).toContain('critical');

    const abnormal = emptySources();
    abnormal['lab-results'] = [
      { code: loinc('2093-3'), value: 240, interpretation: 'high', effectiveDateTime: daysAgo(20) },
    ];
    expect(axis(computeWellnessSummary(abnormal, {}, NOW), 'lab-results').status).toBe('yellow');
  });

  it('marks labs yellow when every result is older than two years', () => {
    const sources = emptySources();
    sources['lab-results'] = [
      { code: { system: 'http://loinc.org', code: '4548-4' }, value: 5.4, interpretation: 'normal', effectiveDateTime: daysAgo(900) },
    ];
    const entry = axis(computeWellnessSummary(sources, {}, NOW), 'lab-results');
    expect(entry.status).toBe('yellow');
    expect(entry.summary).toContain('more than two years old');
  });

  it('raises a polypharmacy signal as active medication count grows', () => {
    const rx = (code: string) => ({ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code });
    const few = emptySources();
    few.medications = [
      { medicationCode: rx('860975'), status: 'active' },
      { medicationCode: rx('617314'), status: 'stopped' },
    ];
    expect(axis(computeWellnessSummary(few, {}, NOW), 'medications').status).toBe('green');

    const many = emptySources();
    many.medications = Array.from({ length: 6 }, (_, index) => ({ medicationCode: rx(`code-${index}`), status: 'active' as const }));
    const manyAxis = axis(computeWellnessSummary(many, {}, NOW), 'medications');
    expect(manyAxis.status).toBe('yellow');
    expect(manyAxis.summary).toContain('polypharmacy');

    const excessive = emptySources();
    excessive.medications = Array.from({ length: 11 }, (_, index) => ({ medicationCode: rx(`code-${index}`), status: 'active' as const }));
    expect(axis(computeWellnessSummary(excessive, {}, NOW), 'medications').status).toBe('red');
  });

  it('scores conditions by active count and severity', () => {
    const snomed = (code: string) => ({ system: 'http://snomed.info/sct', code });
    const resolved = emptySources();
    resolved.conditions = [{ code: snomed('44054006'), status: 'resolved' }];
    expect(axis(computeWellnessSummary(resolved, {}, NOW), 'conditions').status).toBe('green');

    const active = emptySources();
    active.conditions = [{ code: snomed('44054006'), status: 'active', severity: 'moderate' }];
    expect(axis(computeWellnessSummary(active, {}, NOW), 'conditions').status).toBe('yellow');

    const severe = emptySources();
    severe.conditions = [{ code: snomed('84114007'), status: 'active', severity: 'severe' }];
    const severeAxis = axis(computeWellnessSummary(severe, {}, NOW), 'conditions');
    expect(severeAxis.status).toBe('red');
    expect(severeAxis.summary).toContain('severe');
  });

  it('escalates allergies with a severe documented reaction', () => {
    const substance = { system: 'http://snomed.info/sct', code: '294954005' };
    const mild = emptySources();
    mild.allergies = [{ substance, category: 'medication', status: 'active' }];
    expect(axis(computeWellnessSummary(mild, {}, NOW), 'allergies').status).toBe('green');

    const severe = emptySources();
    severe.allergies = [{
      substance,
      category: 'medication',
      status: 'active',
      reactions: [{ manifestation: ['anaphylaxis'], severity: 'severe' }],
    }];
    expect(axis(computeWellnessSummary(severe, {}, NOW), 'allergies').status).toBe('red');
  });

  it('grades immunization currency by the newest completed dose', () => {
    const vaccineCode = { system: 'http://hl7.org/fhir/sid/cvx', code: '158' };
    const current = emptySources();
    current.immunizations = [{ vaccineCode, status: 'completed', occurrenceDate: daysAgo(30) }];
    expect(axis(computeWellnessSummary(current, {}, NOW), 'immunizations').status).toBe('green');

    const aging = emptySources();
    aging.immunizations = [{ vaccineCode, status: 'completed', occurrenceDate: daysAgo(600) }];
    expect(axis(computeWellnessSummary(aging, {}, NOW), 'immunizations').status).toBe('yellow');

    const overdue = emptySources();
    overdue.immunizations = [{ vaccineCode, status: 'completed', occurrenceDate: daysAgo(1500) }];
    const overdueAxis = axis(computeWellnessSummary(overdue, {}, NOW), 'immunizations');
    expect(overdueAxis.status).toBe('red');
    expect(overdueAxis.summary).toContain('more than three years old');
  });

  it('keeps every score inside the 0-100 plotting range and omits raw values from summaries', () => {
    const sources = emptySources();
    sources.conditions = Array.from({ length: 20 }, () => ({
      code: { system: 'http://snomed.info/sct', code: '44054006' },
      status: 'active' as const,
      severity: 'severe' as const,
    }));
    sources['vital-signs'] = [{ code: 'heart-rate', value: 240, unit: 'beats/min', effectiveDateTime: daysAgo(1) }];
    const summary = computeWellnessSummary(sources, {}, NOW);
    for (const entry of summary.axes) {
      if (entry.score === null) continue;
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(100);
      expect(entry.summary).not.toContain('240');
    }
    expect(summary.generatedAt).toBe(NOW.toISOString());
  });
});
