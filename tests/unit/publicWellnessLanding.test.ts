import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('wellness spider-graph landing page', () => {
  const appSource = readFileSync(join(process.cwd(), 'public', 'app.js'), 'utf8');
  const styleSource = readFileSync(join(process.cwd(), 'public', 'styles.css'), 'utf8');
  const indexSource = readFileSync(join(process.cwd(), 'public', 'index.html'), 'utf8');

  it('makes the wellness view the landing view', () => {
    expect(indexSource).toContain('id="view-wellness"');
    expect(indexSource).toContain('id="wellness-graph"');
    // The landing view is the only one not pre-hidden.
    expect(indexSource).toMatch(/id="view-wellness" class="view"/);
    expect(indexSource).toMatch(/id="view-records" class="view hidden"/);
    expect(indexSource).toMatch(/id="view-status" class="view hidden"/);
    expect(appSource).toContain("showView('wellness')");
    expect(appSource).toContain('function showView');
  });

  it('plots one colour-coded vector per wellness-meaningful domain', () => {
    expect(appSource).toContain("const WELLNESS_AXIS_DOMAINS = ['vital-signs', 'lab-results', 'medications', 'conditions', 'allergies', 'immunizations']");
    expect(appSource).toContain('function createSpiderGraph');
    for (const domain of ['vital-signs', 'lab-results', 'medications', 'conditions', 'allergies', 'immunizations']) {
      expect(appSource).toMatch(new RegExp(`'?${domain}'?: '#`));
    }
    expect(appSource).toContain("fetch('/api/wellness/summary')");
    expect(styleSource).toContain('.spider-ring');
    expect(styleSource).toContain('.spider-area');
    expect(styleSource).toContain('.spider-point');
  });

  it('renders red, yellow, and green indicators for the plotted data points', () => {
    expect(appSource).toContain("const STATUS_COLORS = { green: '#2b9a73', yellow: '#d9a441', red: '#cf5240', empty: '#a9b6b1' }");
    expect(appSource).toContain('STATUS_COLORS[axis.status]');
    expect(appSource).toContain('STATUS_LABELS[axis.status]');
    expect(indexSource).toContain('dot-green');
    expect(indexSource).toContain('dot-yellow');
    expect(indexSource).toContain('dot-red');
  });

  it('places non-graph domains in a browse navigation area with record counts', () => {
    expect(appSource).toContain("const WELLNESS_BROWSE_DOMAINS = ['profiles', 'providers', 'insurance-policies', 'documents', 'workflow-tasks']");
    expect(appSource).toContain('function renderBrowseNav');
    expect(appSource).toContain('browse-tile');
    expect(appSource).toContain('browse-count');
    expect(indexSource).toContain('id="browse-nav"');
    expect(indexSource).toContain('aria-label="Browse other health records"');
    expect(styleSource).toContain('.browse-nav');
  });

  it('keeps the pod connection status page reachable from the landing view', () => {
    expect(indexSource).toContain('id="view-status"');
    expect(indexSource).toContain('title="Open pod connection status"');
    expect(appSource).toContain("$('connection').addEventListener('click', () => showView('status'))");
    // Status content that previously occupied the landing page must still exist.
    expect(indexSource).toContain('id="pod-management-panel"');
    expect(indexSource).toContain('id="pod-activity-list"');
    expect(indexSource).toContain('id="healthkit-status"');
    expect(indexSource).toContain('id="epic-panel"');
  });

  it('exposes connections as a primary tab beside wellness and records', () => {
    // A tablist, not a trailing entry in the record-category list: on a phone
    // the category list scrolls horizontally, so a trailing item is hidden.
    expect(indexSource).toContain('role="tablist"');
    for (const view of ['wellness', 'records', 'status']) {
      expect(indexSource).toContain(`id="tab-${view}"`);
      expect(indexSource).toContain(`aria-controls="view-${view}"`);
    }
    expect(indexSource).toMatch(/id="tab-status"[^>]*>.*Connections/);
    // Wellness is the selected tab on load; the others are not.
    expect(indexSource).toMatch(/id="tab-wellness"[^>]*aria-selected="true"/);
    expect(indexSource).toMatch(/id="tab-records"[^>]*aria-selected="false"/);
    expect(indexSource).toMatch(/id="tab-status"[^>]*aria-selected="false"/);
    expect(appSource).toContain("const PRIMARY_TABS = ['wellness', 'records', 'status']");
    expect(appSource).toContain("tab.setAttribute('aria-selected', String(selected))");
    expect(styleSource).toContain('.primary-tabs');
    expect(styleSource).toContain('.primary-tab.active');
  });

  it('keeps all three tabs reachable without horizontal scrolling on phones', () => {
    // Tabs share the row evenly under the mobile breakpoint rather than
    // inheriting the category list's overflow-x behaviour.
    expect(styleSource).toMatch(/\.primary-tab \{[^}]*flex: 1 1 0/s);
  });

  it('treats the domain sidebar as a selector for the records tab only', () => {
    expect(appSource).toContain("$('domain-nav').classList.toggle('hidden', view !== 'records')");
  });

  it('refreshes the graph dynamically after record changes', () => {
    expect(appSource).toContain('async function refreshWellness');
    expect(appSource).toContain('await refreshWellness(ready)');
    expect(appSource).toContain('await refreshWellness();');
  });

  it('navigates from a data point or browse tile into that domain', () => {
    expect(appSource).toContain("marker.addEventListener('click', () => selectDomain(axis.domain))");
    expect(appSource).toContain("label.addEventListener('click', () => selectDomain(axis.domain))");
    expect(appSource).toContain("tile.addEventListener('click', () => selectDomain(entry.domain))");
  });

  it('keeps landing text minimal and degrades without replacing the layout', () => {
    const landing = indexSource.slice(
      indexSource.indexOf('id="view-wellness"'),
      indexSource.indexOf('id="view-records"'),
    );
    // Axis labels are rendered from data, so the landing markup itself carries
    // only the title, the legend, and the loading line.
    expect(landing).toContain('<h1>Wellness</h1>');
    expect(landing).not.toContain('<p id="page-description"');
    expect(landing.match(/<p/g) ?? []).toHaveLength(1);
    expect(appSource).toContain('Your wellness overview appears once the pod connection is ready.');
  });

  it('sizes the graph for iPhone-class viewports', () => {
    expect(styleSource).toContain('@media (max-width: 480px)');
    expect(styleSource).toMatch(/\.spider \{[^}]*width: min\(100%, 400px\)/);
  });

  it('exposes accessible labels for the graph and its data points', () => {
    expect(appSource).toContain("svg.setAttribute('role', 'img')");
    expect(appSource).toContain("svg.setAttribute('aria-label'");
    expect(appSource).toContain("role: 'button'");
    expect(appSource).toContain("tabindex: '0'");
    expect(appSource).toContain("'aria-label': `${axis.label}: ${STATUS_LABELS[axis.status]}");
  });
});
