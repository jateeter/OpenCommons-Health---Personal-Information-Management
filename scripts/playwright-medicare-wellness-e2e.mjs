#!/usr/bin/env node

const { chromium } = await import('playwright');
const { mkdir } = await import('node:fs/promises');

const appUrl = process.env.APP_URL || `http://localhost:${process.env.APP_PORT || '8080'}`;
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR || 'output/playwright';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADED !== 'true' });
const page = await browser.newPage();

function textPattern(label) {
  return new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

async function saveRecord(domainLabel, values, expectedText) {
  await page.getByRole('button', { name: textPattern(domainLabel) }).click();
  await page.getByRole('button', { name: 'Add record' }).click();
  for (const [label, value] of Object.entries(values)) {
    const control = page.getByLabel(label, { exact: true });
    if (Array.isArray(value)) {
      await control.selectOption(value);
    } else {
      await control.fill(String(value));
    }
  }
  await page.getByRole('button', { name: 'Save to pod' }).click();
  await page.getByText(expectedText, { exact: false }).waitFor({ timeout: 10000 });
}

function assertNoDirectIdentifiers(value) {
  const text = JSON.stringify(value).toLowerCase();
  const blocked = [
    'wellness-owner',
    'opencommons medicare advantage',
    'medicare-2026',
    'dr. ada care',
    'annual wellness pii',
  ];
  for (const term of blocked) {
    if (text.includes(term)) {
      throw new Error(`Anonymized release leaked direct identifier term: ${term}`);
    }
  }
}

try {
  await mkdir(outputDir, { recursive: true });
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.getByText('Pod connected', { exact: false }).waitFor({ timeout: 15000 });

  await saveRecord('Profiles', {
    'Family name': 'Wellness-Owner',
    'Given names': 'Annual',
    'Birth date': '1958-04-12',
    'Biological sex': ['female'],
  }, 'Wellness-Owner');

  await saveRecord('Insurance', {
    'Coverage type': ['medical'],
    'Insurer': 'OpenCommons Medicare Advantage',
    'Plan name': 'Annual Wellness PII Plan',
    'Member ID': 'MEDICARE-2026-PII',
    'Effective date': '2026-01-01',
    'Policy holder': 'Annual Wellness-Owner',
  }, 'Annual Wellness PII Plan');

  await saveRecord('Providers', {
    'Name': 'Dr. Ada Care',
    'Role': ['primary-care'],
    'Specialty': 'Geriatric primary care',
    'NPI': '1234567890',
    'Organization': 'OpenCommons Wellness Clinic',
  }, 'Dr. Ada Care');

  await saveRecord('Conditions', {
    'SNOMED CT system': 'http://snomed.info/id/',
    'SNOMED CT code': '38341003',
    'SNOMED CT name': 'Hypertensive disorder',
    'Status': ['active'],
    'Severity': ['mild'],
    'Onset date': '2026-05-01',
    'Notes': 'Annual wellness PII note reviewed with Dr. Ada Care',
  }, 'Hypertensive disorder');

  await saveRecord('Medications', {
    'RxNorm system': 'http://www.nlm.nih.gov/research/umls/rxnorm',
    'RxNorm code': '617314',
    'RxNorm name': 'Atorvastatin 20 MG Oral Tablet',
    'Status': ['active'],
    'Dosage instructions': '20 mg by mouth daily',
    'Start date': '2026-05-01',
    'Prescriber': 'Dr. Ada Care',
  }, 'Atorvastatin 20 MG Oral Tablet');

  await saveRecord('Allergies', {
    'Substance system': 'http://snomed.info/id/',
    'Substance code': '91936005',
    'Substance name': 'Allergy to peanuts',
    'Category': ['food'],
    'Status': ['active'],
    'Notes': 'Annual wellness allergy review',
  }, 'Allergy to peanuts');

  await saveRecord('Immunizations', {
    'CVX system': 'http://hl7.org/fhir/sid/cvx',
    'CVX code': '158',
    'CVX name': 'Influenza, injectable, quadrivalent',
    'Status': ['completed'],
    'Date': '2026-10-01',
    'Dose number': '1',
    'Performer': 'OpenCommons Wellness Clinic',
  }, 'Influenza, injectable, quadrivalent');

  await saveRecord('Vital signs', {
    'Measurement': ['bmi'],
    'Value': '27.4',
    'Unit': 'kg/m2',
    'Measured at': '2026-05-01T14:30',
    'Notes': 'Annual wellness BMI',
  }, 'bmi');

  await saveRecord('Lab results', {
    'LOINC system': 'http://loinc.org',
    'LOINC code': '4548-4',
    'LOINC name': 'Hemoglobin A1c/Hemoglobin.total in Blood',
    'Result': '5.8',
    'Unit': '%',
    'Interpretation': ['normal'],
    'Observed at': '2026-05-01T14:30',
    'Performer': 'OpenCommons Wellness Lab',
  }, 'Hemoglobin A1c/Hemoglobin.total in Blood');

  const releaseResponse = await page.request.get(`${appUrl}/api/anonymized/resources/conditions`, {
    headers: {
      'x-opencommons-owner-approved': 'true',
      'x-opencommons-release-purpose': 'annual-medicare-wellness-e2e',
    },
  });
  if (!releaseResponse.ok()) {
    throw new Error(`Anonymized release failed with HTTP ${releaseResponse.status()}`);
  }
  const releasePayload = await releaseResponse.json();
  assertNoDirectIdentifiers(releasePayload);

  await page.screenshot({ path: `${outputDir}/medicare-wellness-${timestamp}.png`, fullPage: true });
  console.log(`Medicare Wellness Playwright E2E passed against ${appUrl}`);
} finally {
  await browser.close();
}
