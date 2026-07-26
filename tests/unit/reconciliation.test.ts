import { summarizeReconciliation } from '../../src/reconciliation';

describe('reconciliation summary model', () => {
  it('summarizes owner review state across actions, statuses, and domains', () => {
    const summary = summarizeReconciliation([
      {
        domain: 'conditions',
        action: 'create',
        display: 'Hypertension',
        reconciliation: { status: 'new', detail: 'No local record found.' },
      },
      {
        domain: 'conditions',
        action: 'update',
        display: 'Diabetes',
        targetUrl: 'http://pod/conditions/diabetes',
        reconciliation: { status: 'changed', detail: 'Local record differs.' },
      },
      {
        domain: 'medications',
        action: 'conflict',
        display: 'Metformin',
        reconciliation: { status: 'ambiguous', detail: 'Multiple local matches.' },
      },
      {
        domain: 'workflow-tasks',
        action: 'unchanged',
        display: 'Review preventive plan',
        reconciliation: { status: 'matched', detail: 'Same normalized values.' },
      },
    ]);

    expect(summary).toMatchObject({
      total: 4,
      safeToApply: 2,
      blocked: 1,
      unchanged: 1,
      reviewRequired: true,
      byAction: {
        create: 1,
        update: 1,
        unchanged: 1,
        conflict: 1,
      },
      byStatus: {
        new: 1,
        changed: 1,
        ambiguous: 1,
        matched: 1,
      },
    });
    expect(summary.byDomain).toEqual(expect.arrayContaining([
      expect.objectContaining({ domain: 'conditions', total: 2, create: 1, update: 1, reviewRequired: true }),
      expect.objectContaining({ domain: 'medications', total: 1, conflict: 1, reviewRequired: true }),
      expect.objectContaining({ domain: 'workflow-tasks', total: 1, unchanged: 1, reviewRequired: false }),
    ]));
    expect(summary.advisories).toEqual(expect.arrayContaining([
      'Resolve conflict candidates manually before applying those records to the owner Pod.',
      'Review update candidates because matching local Pod records will be changed.',
      'Unchanged candidates are visible for provenance review and are skipped during apply.',
    ]));
  });

  it('returns a clear empty-state advisory', () => {
    expect(summarizeReconciliation([])).toMatchObject({
      total: 0,
      safeToApply: 0,
      blocked: 0,
      reviewRequired: false,
      advisories: ['No reconciliation candidates are available for owner review.'],
    });
  });
});
