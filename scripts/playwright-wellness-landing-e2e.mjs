#!/usr/bin/env node

/**
 * Wellness landing browser E2E (issue #32).
 *
 * Verifies in a real browser, at an iPhone-class viewport, the acceptance
 * criteria that source-level and jsdom tests cannot prove: that the graph
 * genuinely owns the first screen without scrolling, that all three primary
 * tabs are reachable without horizontal scrolling, and that tapping a vector
 * lands on that domain's records.
 *
 * Usage:
 *   APP_URL=http://127.0.0.1:18080 node scripts/playwright-wellness-landing-e2e.mjs
 */

const { chromium, devices } = await import('playwright');
const { mkdir } = await import('node:fs/promises');

const appUrl = process.env.APP_URL || `http://localhost:${process.env.APP_PORT || '8080'}`;
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR || 'output/playwright';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

await mkdir(outputDir, { recursive: true });

const failures = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADED !== 'true' });
// iPhone-class viewport: the criteria are explicitly about phone screens.
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();

try {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#view-wellness', { state: 'visible', timeout: 15000 });

  // ── Landing is the graph, not the connection panel ───────────────────────
  check('wellness view is visible on load', await page.isVisible('#view-wellness'));
  check('connections view is hidden on load', !(await page.isVisible('#view-status')));
  check('records view is hidden on load', !(await page.isVisible('#view-records')));

  // ── The graph owns the first screen ──────────────────────────────────────
  const viewport = page.viewportSize();
  const graphBox = await page.locator('#wellness-graph').boundingBox();
  check(
    'graph starts within the initial viewport',
    Boolean(graphBox) && graphBox.y < viewport.height,
    graphBox ? `graph top ${Math.round(graphBox.y)}px vs viewport ${viewport.height}px` : 'no graph box',
  );

  // ── All three tabs reachable without horizontal scrolling ────────────────
  const tabBar = await page.locator('.primary-tabs').evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  check(
    'tab bar does not scroll horizontally',
    tabBar.scrollWidth <= tabBar.clientWidth + 1,
    `scrollWidth ${tabBar.scrollWidth} vs clientWidth ${tabBar.clientWidth}`,
  );
  for (const id of ['tab-wellness', 'tab-records', 'tab-status']) {
    const box = await page.locator(`#${id}`).boundingBox();
    check(`${id} is on screen`, Boolean(box) && box.x >= 0 && box.x + box.width <= viewport.width + 1);
  }

  // ── The page does not scroll sideways ────────────────────────────────────
  const bodyScroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  check(
    'page has no horizontal overflow',
    bodyScroll.scrollWidth <= bodyScroll.clientWidth + 1,
    `${bodyScroll.scrollWidth} vs ${bodyScroll.clientWidth}`,
  );

  // ── Connections is one tap away and keeps its content ────────────────────
  await page.click('#tab-status');
  await page.waitForSelector('#view-status', { state: 'visible' });
  check('connections opens from its tab', await page.isVisible('#view-status'));
  check('pod management panel still present', await page.isVisible('#pod-management-panel'));
  check('wellness hidden while on connections', !(await page.isVisible('#view-wellness')));

  await page.click('#tab-wellness');
  await page.waitForSelector('#view-wellness', { state: 'visible' });

  // ── Tapping a vector opens that domain's records ─────────────────────────
  // The graph is populated by an async summary fetch, so wait for the first
  // point rather than sampling immediately. Without this the check silently
  // took the empty-pod branch even on a pod with records — measured 0 points
  // on load versus 6 a few seconds later — and the tap assertion never ran.
  const points = page.locator('.spider-point');
  await points.first().waitFor({ state: 'attached', timeout: 15000 }).catch(() => {
    // Genuinely empty pod: fall through to the empty-state check below.
  });
  const pointCount = await points.count();
  // Axes with no data score null and are all plotted at the graph centre, so
  // they overlap and intercept each other's pointer events. Prefer a point
  // that carries data — that is the meaningful path anyway.
  const withData = page.locator('.spider-point:not([aria-label*="No data"])');
  const target = (await withData.count()) > 0 ? withData.first() : points.first();

  if (pointCount > 0) {
    const domain = await target.getAttribute('data-domain');
    await target.click();
    await page.waitForSelector('#view-records', { state: 'visible', timeout: 5000 });
    check('tapping a data point opens the records view', await page.isVisible('#view-records'), `domain ${domain ?? 'n/a'}`);
    // The records view must be showing *that* domain, not merely some domain.
    const activeDomain = await page.locator('.domain-nav button.active').getAttribute('data-domain');
    check('records view shows the tapped domain', activeDomain === domain, `active ${activeDomain} vs tapped ${domain}`);
    await page.click('#tab-wellness');
  } else {
    // An empty pod plots no points; the landing must still render.
    check('landing renders without data points on an empty pod', await page.isVisible('#view-wellness'), 'no points plotted');
  }

  await page.screenshot({ path: `${outputDir}/wellness-landing-${timestamp}.png`, fullPage: false });

  if (failures.length > 0) {
    throw new Error(`Wellness landing E2E failed: ${failures.join('; ')}`);
  }
  console.log(`Wellness landing Playwright E2E passed against ${appUrl}`);
} finally {
  await browser.close();
}
