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
});
