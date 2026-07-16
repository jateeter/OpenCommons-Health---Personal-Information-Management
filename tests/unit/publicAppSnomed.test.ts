import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('browser terminology manual-entry support', () => {
  const appSource = readFileSync(join(process.cwd(), 'public', 'app.js'), 'utf8');
  const styleSource = readFileSync(join(process.cwd(), 'public', 'styles.css'), 'utf8');

  it('offers searchable terminology pickers for clinically coded entry', () => {
    expect(appSource).toContain("type: 'terminology-search'");
    expect(appSource).toContain('SNOMED CT condition search');
    expect(appSource).toContain('SNOMED CT allergy/substance search');
    expect(appSource).toContain('RxNorm / RxTerms / MED-RT medication search');
    expect(appSource).toContain('LOINC vital sign search');
    expect(appSource).toContain('LOINC lab result search');
    expect(appSource).toContain('LOINC document type search');
    expect(appSource).toContain('LOINC document category search');
    expect(appSource).toContain('SNOMED CT workflow task search');
    expect(appSource).toContain("input.type = 'search'");
    expect(appSource).toContain("input.setAttribute('list', listId)");
    expect(appSource).toContain('Start typing a name or code');
  });

  it('includes common code/name pairs across required terminology systems', () => {
    expect(appSource).toContain("'38341003', display: 'Hypertensive disorder, systemic arterial'");
    expect(appSource).toContain("'44054006', display: 'Type 2 diabetes mellitus'");
    expect(appSource).toContain("'195967001', display: 'Asthma'");
    expect(appSource).toContain("'294954005', display: 'Allergy to penicillin'");
    expect(appSource).toContain("'91936005', display: 'Allergy to peanuts'");
    expect(appSource).toContain("'300913006', display: 'Shellfish allergy'");
    expect(appSource).toContain("'4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood'");
    expect(appSource).toContain("'8302-2', display: 'Body height'");
    expect(appSource).toContain("'34133-9', display: 'Summary of episode note'");
    expect(appSource).toContain("'18842-5', display: 'Discharge summary'");
    expect(appSource).toContain("'81218-0', display: 'Care plan'");
    expect(appSource).toContain("'386053000', display: 'Evaluation procedure'");
    expect(appSource).toContain("'410223002', display: 'Follow-up encounter'");
    expect(appSource).toContain("'860975', display: 'Metformin hydrochloride 500 MG Oral Tablet'");
    expect(appSource).toContain("'617314', display: 'Atorvastatin 20 MG Oral Tablet'");
    expect(appSource).toContain("source: 'RxTerms'");
    expect(appSource).toContain("source: 'MED-RT'");
  });

  it('keeps standards-oriented tooltip help visible in the manual-entry UI', () => {
    expect(appSource).toContain('SNOMED CT is designated by NLM as a standard');
    expect(appSource).toContain('Required FHIR Coding parameters: terminology system URI and code.');
    expect(appSource).toContain('LOINC provides common identifiers, names, and codes');
    expect(appSource).toContain('RxNorm provides normalized clinical drug names');
    expect(styleSource).toContain('.tooltip');
    expect(styleSource).toContain('cursor: help');
  });

  it('allows decimal clinical measurements in numeric fields', () => {
    expect(appSource).toContain("if (field.type === 'number') input.step = 'any';");
  });

  it('gives documents and workflow tasks first-class domain navigation', () => {
    expect(appSource).toContain("documents: {");
    expect(appSource).toContain("label: 'Document', plural: 'Documents'");
    expect(appSource).toContain("'workflow-tasks': {");
    expect(appSource).toContain("label: 'Workflow task', plural: 'Workflow tasks'");
    expect(appSource).toContain('Owner-held clinical document metadata');
    expect(appSource).toContain('Care tasks, follow-ups, and review steps');
    expect(appSource).toContain('sourceDocumentUrl');
    expect(appSource).toContain('relatedDocumentUrl');
    expect(appSource).toContain("coding('LOINC document', 'documentType')");
    expect(appSource).toContain("coding('LOINC category', 'category'");
    expect(appSource).toContain("coding('SNOMED CT workflow', 'taskType')");
  });

  it('supports owner-mediated Epic import section review before pod writes', () => {
    expect(appSource).toContain('epicSelectedDomains = new Set(epicPreview.changes.map((change) => change.domain))');
    expect(appSource).toContain('Review each section and choose what to apply.');
    expect(appSource).toContain("className = 'epic-review-checklist'");
    expect(appSource).toContain("body: JSON.stringify({ importJobId: epicPreview.importJobId, domains: selectedDomains })");
    expect(appSource).toContain('owner-reviewed section');
    expect(appSource).toContain('formatEpicActionCounts');
    expect(appSource).toContain('epic-action-${change.action}');
    expect(styleSource).toContain('.epic-review-checklist');
    expect(styleSource).toContain('.epic-selection-summary');
    expect(styleSource).toContain('.epic-action-update');
    expect(styleSource).toContain('.epic-action-conflict');
  });
});
