/**
 * @jest-environment jsdom
 *
 * Behavioural tests for the wellness landing (issue #32).
 *
 * The other landing tests assert on the *source text* of public/app.js, which
 * cannot tell whether the code actually works. These load the real
 * public/index.html and public/app.js into a DOM and drive them, so the
 * acceptance criteria are verified as behaviour: what is on screen at load,
 * what tapping a vector does, and how the view degrades when the pod is down.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');
const html = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf8');
const appSource = readFileSync(join(PUBLIC_DIR, 'app.js'), 'utf8');

/** A summary payload shaped like /api/wellness/summary. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: '2026-08-01T00:00:00.000Z',
    axes: [
      { domain: 'vital-signs', label: 'Vitals', score: 82, status: 'green', summary: 'In range', recordCount: 4 },
      { domain: 'lab-results', label: 'Labs', score: 61, status: 'yellow', summary: 'Review due', recordCount: 2 },
      { domain: 'medications', label: 'Meds', score: 30, status: 'red', summary: 'Refill overdue', recordCount: 1 },
      { domain: 'conditions', label: 'Conditions', score: null, status: 'empty', summary: 'None stored', recordCount: 0 },
      { domain: 'allergies', label: 'Allergies', score: 90, status: 'green', summary: 'Up to date', recordCount: 1 },
      { domain: 'immunizations', label: 'Immunisations', score: 55, status: 'yellow', summary: 'Due soon', recordCount: 3 },
    ],
    browse: [
      { domain: 'profiles', label: 'Profile', count: 1 },
      { domain: 'providers', label: 'Providers', count: 2 },
      { domain: 'insurance-policies', label: 'Insurance', count: 0 },
      { domain: 'documents', label: 'Documents', count: 5 },
      { domain: 'workflow-tasks', label: 'Tasks', count: 0 },
    ],
    ...overrides,
  };
}

/** Boots the page with a stubbed fetch and returns handles for assertions. */
function boot(options: { wellness?: unknown; wellnessStatus?: number; podReady?: boolean } = {}) {
  document.documentElement.innerHTML = html.replace(/<!DOCTYPE html>/i, '');
  if (window.HTMLDialogElement) {
    window.HTMLDialogElement.prototype.showModal ??= function showModal() { this.setAttribute('open', ''); };
    window.HTMLDialogElement.prototype.close ??= function close() { this.removeAttribute('open'); };
  }

  const calls: string[] = [];
  const fetchStub = jest.fn(async (input: unknown) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('/api/wellness/summary')) {
      const status = options.wellnessStatus ?? 200;
      return {
        ok: status < 400,
        status,
        json: async () => ({ data: options.wellness ?? summary() }),
        text: async (): Promise<string> => '',
      };
    }
    if (url.includes('/api/status')) {
      // The app only reads wellness once the pod reports ready, so this shape
      // matters: `ok` is what flips applicationReady.
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: options.podReady ?? true, pod: {}, epic: { enabled: false, status: 'disabled' } }),
        text: async (): Promise<string> => '',
      };
    }
    // Everything else (activity, healthkit, records) is irrelevant here.
    return { ok: true, status: 200, json: async () => ({ data: [] }), text: async (): Promise<string> => '' };
  });
  (globalThis as unknown as { fetch: unknown }).fetch = fetchStub;

  window.eval(appSource);
  return { calls, fetchStub };
}

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const visible = (id: string) => !$(id).classList.contains('hidden');
/** Boot chains several awaited fetches, so drain more than one turn. */
const flush = async (turns = 8) => {
  for (let i = 0; i < turns; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('wellness landing behaviour', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    document.documentElement.innerHTML = '';
  });

  it('opens on the wellness view with connections and records hidden', () => {
    boot();
    expect(visible('view-wellness')).toBe(true);
    expect(visible('view-records')).toBe(false);
    expect(visible('view-status')).toBe(false);
    expect($('tab-wellness').getAttribute('aria-selected')).toBe('true');
    expect($('tab-status').getAttribute('aria-selected')).toBe('false');
  });

  it('switches to connections when its tab is activated, and back again', () => {
    boot();
    $('tab-status').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(visible('view-status')).toBe(true);
    expect(visible('view-wellness')).toBe(false);
    expect($('tab-status').getAttribute('aria-selected')).toBe('true');
    // Roving tabindex: only the selected tab is in the tab order.
    expect(($('tab-status') as HTMLButtonElement).tabIndex).toBe(0);
    expect(($('tab-wellness') as HTMLButtonElement).tabIndex).toBe(-1);

    $('tab-wellness').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(visible('view-wellness')).toBe(true);
    expect(visible('view-status')).toBe(false);
  });

  it('keeps the masthead connection dot working as a route into connections', () => {
    boot();
    $('connection').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(visible('view-status')).toBe(true);
  });

  it('moves between tabs with the arrow keys', () => {
    boot();
    $('tab-wellness').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(visible('view-records')).toBe(true);
    $('tab-records').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(visible('view-wellness')).toBe(true);
  });

  it('shows the domain sidebar only on the records tab', () => {
    boot();
    expect(document.querySelector('.shell')?.classList.contains('full-layout')).toBe(true);
    expect(document.querySelector('.shell')?.classList.contains('records-layout')).toBe(false);
    expect(visible('domain-nav')).toBe(false);
    $('tab-records').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('.shell')?.classList.contains('records-layout')).toBe(true);
    expect(document.querySelector('.shell')?.classList.contains('full-layout')).toBe(false);
    expect(visible('domain-nav')).toBe(true);
    $('tab-status').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('.shell')?.classList.contains('full-layout')).toBe(true);
    expect(document.querySelector('.shell')?.classList.contains('records-layout')).toBe(false);
    expect(visible('domain-nav')).toBe(false);
  });

  it('prefills LOINC coding fields from the vital sign measurement dropdown', async () => {
    boot();
    await flush();
    $('tab-records').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();
    document.querySelector<HTMLButtonElement>('.domain-nav button[data-domain="vital-signs"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();

    $('add-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const measurement = $('field-code') as HTMLSelectElement;
    expect(Array.from(measurement.options).some((option) => option.textContent?.includes('8867-4 [LOINC]'))).toBe(true);
    expect(document.querySelector<HTMLAnchorElement>('.system-reference a[href="http://loinc.org"]')?.textContent).toContain('LOINC');

    measurement.value = 'heart-rate';
    measurement.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(($('field-loincCode.system') as HTMLInputElement).value).toBe('http://loinc.org');
    expect(($('field-loincCode.code') as HTMLInputElement).value).toBe('8867-4');
    expect(($('field-loincCode.display') as HTMLInputElement).value).toBe('Heart rate');
    expect(($('field-unit') as HTMLInputElement).value).toBe('beats/min');
  });

  it('prefills CVX vaccine coding fields from the immunization terminology dropdown', async () => {
    boot();
    await flush();
    $('tab-records').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();
    document.querySelector<HTMLButtonElement>('.domain-nav button[data-domain="immunizations"]')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();

    $('add-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(document.querySelector<HTMLAnchorElement>('.system-reference a[href="http://hl7.org/fhir/sid/cvx"]')?.textContent).toContain('CVX');

    const search = $('field-vaccineCode.terminologySearch') as HTMLInputElement;
    search.value = 'Influenza, injectable, quadrivalent — 158 [CVX]';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    expect(($('field-vaccineCode.system') as HTMLInputElement).value).toBe('http://hl7.org/fhir/sid/cvx');
    expect(($('field-vaccineCode.code') as HTMLInputElement).value).toBe('158');
    expect(($('field-vaccineCode.display') as HTMLInputElement).value).toBe('Influenza, injectable, quadrivalent');
  });

  it('closes a clean record modal from Cancel without a discard prompt', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm');
    boot();
    await flush();
    $('tab-records').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();

    $('add-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect($('record-dialog').hasAttribute('open')).toBe(true);
    $('record-cancel').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect($('record-dialog').hasAttribute('open')).toBe(false);
  });

  it('warns before discarding dirty record modal changes from the close button', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    boot();
    await flush();
    $('tab-records').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();

    $('add-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    ($('field-code.code') as HTMLInputElement).value = '44054006';
    $('field-code.code').dispatchEvent(new window.Event('input', { bubbles: true }));

    $('record-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved changes to this health record?');
    expect($('record-dialog').hasAttribute('open')).toBe(true);

    $('record-close').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect($('record-dialog').hasAttribute('open')).toBe(false);
  });

  it('routes Escape through the same dirty-modal discard guard', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    boot();
    await flush();
    $('tab-records').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();

    $('add-button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    ($('field-code.display') as HTMLInputElement).value = 'Type 2 diabetes mellitus';
    const cancelEvent = new window.Event('cancel', { bubbles: true, cancelable: true });
    $('record-dialog').dispatchEvent(cancelEvent);

    expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved changes to this health record?');
    expect(cancelEvent.defaultPrevented).toBe(true);
    expect($('record-dialog').hasAttribute('open')).toBe(true);
  });

  it('plots one point per wellness axis, coloured by status', async () => {
    boot();
    await flush();
    const points = document.querySelectorAll('.spider-point');
    expect(points).toHaveLength(6);
    // Red / yellow / green are all represented by the fixture.
    const fills = Array.from(points).map((p) => p.getAttribute('fill'));
    expect(fills).toContain('#2b9a73'); // green
    expect(fills).toContain('#d9a441'); // yellow
    expect(fills).toContain('#cf5240'); // red
    expect(fills).toContain('#a9b6b1'); // empty
  });

  it('separates empty axes so each is individually tappable', async () => {
    // Regression for #40: every null-score axis used to be plotted at the
    // graph centre, where the markers overlapped and only the topmost could
    // receive a click.
    const allEmpty = summary({
      axes: [
        { domain: 'vital-signs', label: 'Vitals', score: null, status: 'empty', summary: 'None', recordCount: 0 },
        { domain: 'lab-results', label: 'Labs', score: null, status: 'empty', summary: 'None', recordCount: 0 },
        { domain: 'medications', label: 'Meds', score: null, status: 'empty', summary: 'None', recordCount: 0 },
        { domain: 'conditions', label: 'Conditions', score: null, status: 'empty', summary: 'None', recordCount: 0 },
        { domain: 'allergies', label: 'Allergies', score: null, status: 'empty', summary: 'None', recordCount: 0 },
        { domain: 'immunizations', label: 'Immunisations', score: null, status: 'empty', summary: 'None', recordCount: 0 },
      ],
    });
    boot({ wellness: allEmpty });
    await flush();

    const points = Array.from(document.querySelectorAll('.spider-point')).map((p) => ({
      domain: p.getAttribute('data-domain'),
      cx: Number(p.getAttribute('cx')),
      cy: Number(p.getAttribute('cy')),
    }));
    expect(points).toHaveLength(6);

    // No two markers share a position, and every pair clears the marker
    // diameter (r=7, so 14px) with a little room.
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const distance = Math.hypot(points[i].cx - points[j].cx, points[i].cy - points[j].cy);
        expect(distance).toBeGreaterThanOrEqual(14);
      }
    }
  });

  it('does not inflate the shaded area for axes with no data', async () => {
    // The markers are pushed off-centre for tappability, but the area must
    // still tell the truth: no data means no area.
    const allEmpty = summary({
      axes: summary().axes.map((axis) => ({ ...axis, score: null, status: 'empty', recordCount: 0 })),
    });
    boot({ wellness: allEmpty });
    await flush();

    const area = document.querySelector('.spider-area') as SVGPolygonElement | null;
    expect(area).toBeTruthy();
    const coords = (area?.getAttribute('points') ?? '').split(' ').filter(Boolean)
      .map((pair) => pair.split(',').map(Number));
    // Every vertex collapses to the centre of the 320x320 viewBox.
    for (const [x, y] of coords) {
      expect(x).toBeCloseTo(160, 5);
      expect(y).toBeCloseTo(160, 5);
    }
  });

  it('offers the axis label as a second, larger tap target', async () => {
    boot();
    await flush();
    const labels = document.querySelectorAll('.spider-label');
    expect(labels.length).toBe(6);
    const label = labels[0] as SVGTextElement;
    expect(label.getAttribute('role')).toBe('button');
    expect(label.getAttribute('tabindex')).toBe('0');
    expect(label.getAttribute('data-domain')).toBeTruthy();
    label.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(visible('view-records')).toBe(true);
  });

  it('opens the domain records view when a data point is activated', async () => {
    boot();
    await flush();
    const point = document.querySelector('.spider-point') as HTMLElement;
    expect(point).toBeTruthy();
    point.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    // Tapping a vector leaves the landing for that domain's records.
    expect(visible('view-records')).toBe(true);
    expect(visible('view-wellness')).toBe(false);
  });

  it('lists the non-graph domains for browsing with their record counts', async () => {
    boot();
    await flush();
    const tiles = document.querySelectorAll('.browse-tile');
    expect(tiles).toHaveLength(5);
    expect($('browse-nav').textContent).toContain('Documents');
    expect($('browse-nav').textContent).toContain('5');
  });

  it('re-reads the summary whenever the wellness tab is shown', async () => {
    const { calls } = boot();
    await flush();
    const before = calls.filter((u) => u.includes('/api/wellness/summary')).length;
    $('tab-records').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    $('tab-wellness').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();
    const after = calls.filter((u) => u.includes('/api/wellness/summary')).length;
    expect(after).toBeGreaterThan(before);
  });

  it('keeps the landing layout when the pod is unreachable', async () => {
    boot({ wellnessStatus: 503 });
    await flush();
    // Degrades in place: still the wellness view, not a status-first page.
    expect(visible('view-wellness')).toBe(true);
    expect(visible('view-status')).toBe(false);
    expect(document.querySelectorAll('.spider-point')).toHaveLength(0);
  });
});
