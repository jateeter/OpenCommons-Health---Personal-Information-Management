#!/usr/bin/env node

/**
 * Record modal close/cancel browser E2E.
 *
 * Verifies clean close behaviour and the dirty-form discard guard for the data
 * entry modal controls.
 *
 * Usage:
 *   APP_URL=http://127.0.0.1:18080 npm run test:e2e:modal-close
 */

const { chromium } = await import('playwright');

const appUrl = process.env.APP_URL || `http://localhost:${process.env.APP_PORT || '8080'}`;

const failures = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(`${label}${detail ? ` (${detail})` : ''}`);
};

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADED !== 'true' });
const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });

try {
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('#view-wellness:not(.hidden)', { timeout: 15000 });
  await page.click('#tab-records');
  await page.waitForSelector('#view-records:not(.hidden)', { timeout: 10000 });

  await page.click('#add-button');
  await page.waitForSelector('#record-dialog[open]', { timeout: 10000 });
  await page.click('#record-cancel');
  await page.waitForSelector('#record-dialog', { state: 'attached' });
  check('clean Cancel closes immediately', !(await page.locator('#record-dialog').evaluate((dialog) => dialog.open)));

  await page.click('#add-button');
  await page.waitForSelector('#record-dialog[open]', { timeout: 10000 });
  await page.locator('[id="field-code.code"]').fill('44054006');
  page.once('dialog', async (dialog) => {
    check('dirty close shows discard prompt', dialog.message() === 'Discard unsaved changes to this health record?', dialog.message());
    await dialog.dismiss();
  });
  await page.click('#record-close');
  check('dismissing discard prompt keeps modal open', await page.locator('#record-dialog').evaluate((dialog) => dialog.open));

  page.once('dialog', async (dialog) => {
    check('dirty close can be accepted', dialog.message() === 'Discard unsaved changes to this health record?', dialog.message());
    await dialog.accept();
  });
  await page.click('#record-close');
  await page.waitForFunction(() => !document.querySelector('#record-dialog')?.open, undefined, { timeout: 5000 });
  check('accepting discard prompt closes modal', !(await page.locator('#record-dialog').evaluate((dialog) => dialog.open)));

  await page.click('#add-button');
  await page.waitForSelector('#record-dialog[open]', { timeout: 10000 });
  await page.locator('[id="field-code.display"]').fill('Type 2 diabetes mellitus');
  page.once('dialog', async (dialog) => {
    check('dirty Cancel shows discard prompt', dialog.message() === 'Discard unsaved changes to this health record?', dialog.message());
    await dialog.accept();
  });
  await page.click('#record-cancel');
  await page.waitForFunction(() => !document.querySelector('#record-dialog')?.open, undefined, { timeout: 5000 });
  check('accepting dirty Cancel closes modal', !(await page.locator('#record-dialog').evaluate((dialog) => dialog.open)));

  if (failures.length > 0) throw new Error(`Record modal close E2E failed: ${failures.join('; ')}`);
  console.log(`Record modal close E2E passed against ${appUrl}`);
} finally {
  await browser.close();
}
