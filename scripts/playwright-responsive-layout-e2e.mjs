#!/usr/bin/env node

/**
 * Responsive layout browser E2E.
 *
 * Verifies the shared layout contract used by the landing page, records/data
 * entry views, connection dashboards, and the edit dialog. This catches the
 * desktop-width regression where a hidden records sidebar left Wellness
 * rendered in the 230px grid column.
 *
 * Usage:
 *   APP_URL=http://127.0.0.1:18080 npm run test:e2e:responsive-layout
 */

const { chromium } = await import('playwright');
const { mkdir } = await import('node:fs/promises');

const appUrl = process.env.APP_URL || `http://localhost:${process.env.APP_PORT || '8080'}`;
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR || 'output/playwright';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const viewports = [390, 480, 768, 1024, 1366];

await mkdir(outputDir, { recursive: true });

const failures = [];
const summaries = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(`${label}${detail ? ` (${detail})` : ''}`);
};

const measurePage = async (page, view) => page.evaluate((activeView) => {
  const roundedRect = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
    };
  };

  return {
    view: activeView,
    shellClass: document.querySelector('.shell')?.className ?? '',
    shell: roundedRect('.shell'),
    main: roundedRect('main'),
    domainNav: roundedRect('#domain-nav'),
    wellnessGraph: roundedRect('#wellness-graph'),
    spider: roundedRect('.spider'),
    recordsPanel: roundedRect('.records-panel'),
    podPanel: roundedRect('#pod-management-panel'),
    dialog: roundedRect('#record-dialog'),
    formFields: roundedRect('#form-fields'),
    bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}, view);

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADED !== 'true' });

try {
  for (const width of viewports) {
    console.log(`\nViewport ${width}px`);
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(appUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('#view-wellness:not(.hidden)', { timeout: 15000 });

    const wellness = await measurePage(page, 'wellness');
    summaries.push({ width, wellness });
    check('wellness uses full layout state', wellness.shellClass.includes('full-layout'), wellness.shellClass);
    check('wellness does not use records layout state', !wellness.shellClass.includes('records-layout'), wellness.shellClass);
    check('wellness main is not collapsed to sidebar width', (wellness.main?.width ?? 0) > Math.min(620, width * 0.7), `main ${wellness.main?.width}px`);
    check('wellness page has no horizontal overflow', wellness.bodyOverflow <= 1, `overflow ${wellness.bodyOverflow}px`);
    if (wellness.spider) {
      check('wellness graph stays within main width', wellness.spider.width <= (wellness.main?.width ?? width), `spider ${wellness.spider.width}px vs main ${wellness.main?.width}px`);
    }
    await page.screenshot({ path: `${outputDir}/responsive-wellness-${width}-${timestamp}.png`, fullPage: false });

    await page.click('#tab-records');
    await page.waitForSelector('#view-records:not(.hidden)', { timeout: 10000 });
    const records = await measurePage(page, 'records');
    summaries.push({ width, records });
    check('records uses records layout state', records.shellClass.includes('records-layout'), records.shellClass);
    check('records sidebar is visible when records are active', (records.domainNav?.width ?? 0) > 0, `nav ${records.domainNav?.width}px`);
    check('records panel stays within main width', (records.recordsPanel?.width ?? 0) <= (records.main?.width ?? 0) + 1, `panel ${records.recordsPanel?.width}px vs main ${records.main?.width}px`);
    check('records page has no horizontal overflow', records.bodyOverflow <= 1, `overflow ${records.bodyOverflow}px`);

    await page.click('#add-button');
    await page.waitForSelector('#record-dialog[open]', { timeout: 10000 });
    const dialog = await measurePage(page, 'dialog');
    summaries.push({ width, dialog });
    check('record dialog stays within viewport', (dialog.dialog?.width ?? 0) <= width - 20, `dialog ${dialog.dialog?.width}px vs viewport ${width}px`);
    check('record form fields stay within dialog', (dialog.formFields?.width ?? 0) <= (dialog.dialog?.width ?? 0), `fields ${dialog.formFields?.width}px vs dialog ${dialog.dialog?.width}px`);
    await page.keyboard.press('Escape');

    await page.click('#tab-status');
    await page.waitForSelector('#view-status:not(.hidden)', { timeout: 10000 });
    const status = await measurePage(page, 'status');
    summaries.push({ width, status });
    check('connections uses full layout state', status.shellClass.includes('full-layout'), status.shellClass);
    check('connections main is not collapsed to sidebar width', (status.main?.width ?? 0) > Math.min(620, width * 0.7), `main ${status.main?.width}px`);
    check('connections panel stays within main width', (status.podPanel?.width ?? 0) <= (status.main?.width ?? 0) + 1, `panel ${status.podPanel?.width}px vs main ${status.main?.width}px`);
    check('connections page has no horizontal overflow', status.bodyOverflow <= 1, `overflow ${status.bodyOverflow}px`);

    await page.close();
  }

  console.log('\nMeasured layout summary:');
  console.log(JSON.stringify(summaries, null, 2));

  if (failures.length > 0) {
    throw new Error(`Responsive layout E2E failed: ${failures.join('; ')}`);
  }

  console.log(`Responsive layout E2E passed against ${appUrl}`);
} finally {
  await browser.close();
}
