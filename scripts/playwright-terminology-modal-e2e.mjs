#!/usr/bin/env node

/**
 * Terminology modal browser E2E.
 *
 * Verifies that add/edit modal dropdowns expose authoritative coding-system
 * links and prefill FHIR Coding fields from owner-selected terms.
 *
 * Usage:
 *   APP_URL=http://127.0.0.1:18080 npm run test:e2e:terminology-modal
 */

const { chromium } = await import('playwright');
const { mkdir } = await import('node:fs/promises');

const appUrl = process.env.APP_URL || `http://localhost:${process.env.APP_PORT || '8080'}`;
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR || 'output/playwright';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

await mkdir(outputDir, { recursive: true });

const failures = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(`${label}${detail ? ` (${detail})` : ''}`);
};

const fieldValue = (page, id) => page.locator(`[id="${id}"]`).inputValue();

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADED !== 'true' });
const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });

try {
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('#view-wellness:not(.hidden)', { timeout: 15000 });

  await page.click('#tab-records');
  await page.waitForSelector('#view-records:not(.hidden)', { timeout: 10000 });

  await page.click('.domain-nav button[data-domain="vital-signs"]');
  await page.click('#add-button');
  await page.waitForSelector('#record-dialog[open]', { timeout: 10000 });
  check(
    'vital sign modal exposes LOINC system link',
    await page.locator('.system-reference a[href="http://loinc.org"]').count() > 0,
  );
  check(
    'vital measurement dropdown includes LOINC code/name',
    await page.locator('#field-code').evaluate((select) => [...select.options].some((option) => option.textContent.includes('8867-4 [LOINC]'))),
  );
  await page.locator('#field-code').selectOption('heart-rate');
  check('vital selection sets LOINC system', await fieldValue(page, 'field-loincCode.system') === 'http://loinc.org');
  check('vital selection sets LOINC code', await fieldValue(page, 'field-loincCode.code') === '8867-4');
  check('vital selection sets LOINC display', await fieldValue(page, 'field-loincCode.display') === 'Heart rate');
  check('vital selection sets suggested unit', await fieldValue(page, 'field-unit') === 'beats/min');
  await page.screenshot({ path: `${outputDir}/terminology-vitals-${timestamp}.png`, fullPage: false });
  await page.keyboard.press('Escape');

  await page.click('.domain-nav button[data-domain="immunizations"]');
  await page.click('#add-button');
  await page.waitForSelector('#record-dialog[open]', { timeout: 10000 });
  check(
    'immunization modal exposes CVX system link',
    await page.locator('.system-reference a[href="http://hl7.org/fhir/sid/cvx"]').count() > 0,
  );
  await page.locator('#field-vaccineCode\\.terminologySearch').fill('Influenza, injectable, quadrivalent — 158 [CVX]');
  await page.locator('#field-vaccineCode\\.terminologySearch').dispatchEvent('input');
  check('CVX selection sets vaccine system', await fieldValue(page, 'field-vaccineCode.system') === 'http://hl7.org/fhir/sid/cvx');
  check('CVX selection sets vaccine code', await fieldValue(page, 'field-vaccineCode.code') === '158');
  check('CVX selection sets vaccine display', await fieldValue(page, 'field-vaccineCode.display') === 'Influenza, injectable, quadrivalent');
  await page.screenshot({ path: `${outputDir}/terminology-immunization-${timestamp}.png`, fullPage: false });

  if (failures.length > 0) throw new Error(`Terminology modal E2E failed: ${failures.join('; ')}`);
  console.log(`Terminology modal E2E passed against ${appUrl}`);
} finally {
  await browser.close();
}
