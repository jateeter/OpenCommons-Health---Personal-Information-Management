import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('browser SNOMED CT manual-entry support', () => {
  const appSource = readFileSync(join(process.cwd(), 'public', 'app.js'), 'utf8');
  const styleSource = readFileSync(join(process.cwd(), 'public', 'styles.css'), 'utf8');

  it('offers SNOMED CT quick-pick dropdowns for condition and allergy entry', () => {
    expect(appSource).toContain("type: 'coding-preset'");
    expect(appSource).toContain('SNOMED CT condition quick pick');
    expect(appSource).toContain('SNOMED CT allergy quick pick');
  });

  it('includes common SNOMED CT code/name pairs for manual medical record entry', () => {
    expect(appSource).toContain("'38341003', display: 'Hypertensive disorder, systemic arterial'");
    expect(appSource).toContain("'44054006', display: 'Type 2 diabetes mellitus'");
    expect(appSource).toContain("'195967001', display: 'Asthma'");
    expect(appSource).toContain("'294954005', display: 'Allergy to penicillin'");
    expect(appSource).toContain("'91936005', display: 'Allergy to peanuts'");
    expect(appSource).toContain("'300913006', display: 'Shellfish allergy'");
  });

  it('keeps NLM-oriented tooltip help visible in the manual-entry UI', () => {
    expect(appSource).toContain('SNOMED CT is designated by NLM as a standard');
    expect(appSource).toContain('Use the numeric SNOMED CT concept identifier.');
    expect(styleSource).toContain('.tooltip');
    expect(styleSource).toContain('cursor: help');
  });
});
