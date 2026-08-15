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

  it('places non-graph domains in the top-right hamburger menu with record counts', () => {
    expect(appSource).toContain("const WELLNESS_BROWSE_DOMAINS = ['profiles', 'providers', 'insurance-policies', 'documents', 'workflow-tasks']");
    expect(appSource).toContain('function renderUtilityMenu');
    expect(appSource).toContain('utility-domain-item');
    expect(appSource).toContain('utility-domain-count');
    expect(indexSource).toContain('id="utility-menu" class="utility-menu"');
    expect(indexSource).toContain('id="utility-menu-toggle"');
    expect(indexSource).toContain('id="utility-domain-menu"');
    expect(indexSource.indexOf('id="connection"')).toBeLessThan(indexSource.indexOf('id="utility-menu"'));
    expect(indexSource).not.toContain('id="browse-nav"');
    expect(styleSource).toContain('.utility-menu-panel');
    expect(styleSource).toMatch(/\.masthead-actions \{[^}]*justify-content: flex-end/s);
    expect(styleSource).toMatch(/\.masthead-actions \{[^}]*margin-left: auto/s);
    expect(styleSource).not.toContain('.browse-nav');
  });

  it('keeps secondary domains and legal links discoverable in the hamburger', () => {
    expect(indexSource).toContain('aria-expanded="false"');
    expect(indexSource).toContain('aria-label="Menu: secondary domains, terms, and data disclosure"');
    expect(indexSource).toContain('href="/terms.html"');
    expect(indexSource).toContain('href="/data-disclosure.html"');
    expect(indexSource).toContain('Terms</a>');
    expect(indexSource).toContain('Data disclosure</a>');
    expect(styleSource).toContain('.utility-menu.open .utility-menu-panel');
    expect(styleSource).toMatch(/\.utility-menu-panel \{[^}]*right: 0/s);
  });

  it('visually marks spider graph nodes as clickable points of departure', () => {
    expect(appSource).toContain("class: 'spider-point-halo'");
    expect(appSource).toContain("'aria-hidden': 'true'");
    expect(styleSource).toContain('.spider-point-halo');
    expect(styleSource).toMatch(/\.spider-point \{[^}]*cursor: pointer/s);
    expect(styleSource).toMatch(/\.spider-point \{[^}]*drop-shadow/s);
    expect(styleSource).toContain('.spider-point:hover, .spider-point:focus-visible');
    expect(styleSource).toContain('.spider-label:hover, .spider-label:focus-visible');
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
    expect(indexSource).toContain('<div class="shell full-layout">');
    expect(appSource).toContain("const recordsLayout = view === 'records'");
    expect(appSource).toContain("document.querySelector('.shell')?.classList.toggle('records-layout', recordsLayout)");
    expect(appSource).toContain("document.querySelector('.shell')?.classList.toggle('full-layout', !recordsLayout)");
    expect(appSource).toContain("$('domain-nav').classList.toggle('hidden', !recordsLayout)");
    expect(styleSource).toContain('.shell.records-layout { grid-template-columns: 230px minmax(0, 1fr); }');
    expect(styleSource).toContain('.shell.full-layout .domain-nav { display: none; }');
    expect(styleSource).toContain('main { grid-column: 1 / -1;');
    expect(styleSource).toContain('.shell.records-layout main { grid-column: auto; }');
  });

  it('refreshes the graph dynamically after record changes', () => {
    expect(appSource).toContain('async function refreshWellness');
    expect(appSource).toContain('await refreshWellness(ready)');
    expect(appSource).toContain('await refreshWellness();');
  });

  it('navigates from a data point or hamburger domain item into that domain', () => {
    expect(appSource).toContain("marker.addEventListener('click', () => selectDomain(axis.domain))");
    expect(appSource).toContain("label.addEventListener('click', () => selectDomain(axis.domain))");
    expect(appSource).toContain('void selectDomain(entry.domain)');
    expect(appSource).toContain('setUtilityMenuOpen(false)');
  });

  it('adds a semantic spider graph to every domain landing view', () => {
    expect(indexSource).toContain('id="domain-graph-panel"');
    expect(indexSource).toContain('id="domain-graph"');
    expect(indexSource).toContain('id="domain-node-summary"');
    expect(appSource).toContain('const DOMAIN_SEMANTIC_ELEMENTS = {');
    for (const domain of [
      'profiles',
      'conditions',
      'medications',
      'allergies',
      'immunizations',
      'vital-signs',
      'providers',
      'lab-results',
      'insurance-policies',
      'documents',
      'workflow-tasks',
    ]) {
      expect(appSource).toMatch(new RegExp(`['"]?${domain}['"]?: \\[`));
    }
    expect(appSource).toContain('function renderDomainGraph');
    expect(appSource).toContain('function createDomainSpiderGraph');
    expect(styleSource).toContain('.domain-graph-panel');
    expect(styleSource).toContain('.domain-spider');
  });

  it('shows node summary tables with a prominent Add action that opens the existing modal', () => {
    expect(appSource).toContain('function renderDomainNodeSummary');
    expect(appSource).toContain('summaryRow');
    expect(appSource).toContain("button.className = 'primary'");
    expect(appSource).toContain("button.textContent = `Add ${config.label.toLowerCase()}`");
    expect(appSource).toContain('openForm(null, structuredClone(element.prefill || {}))');
    expect(appSource).toContain('const fieldValues = record || prefill || {};');
    expect(styleSource).toContain('.domain-node-summary table');
    expect(styleSource).toContain('.domain-node-summary .primary');
  });

  it('uses hover and keyboard focus to reveal semantic node summaries', () => {
    expect(appSource).toContain("marker.addEventListener('mouseenter', showSummary)");
    expect(appSource).toContain("marker.addEventListener('focus', showSummary)");
    expect(appSource).toContain("label.addEventListener('mouseenter', showSummary)");
    expect(appSource).toContain("label.addEventListener('focus', showSummary)");
    expect(appSource).toContain("'data-semantic-node': element.id");
    expect(appSource).toContain("'aria-label': `${element.label}: ${count} current record");
  });

  it('keeps the domain data window separated from spider graph labels', () => {
    expect(styleSource).toContain('--domain-summary-min-gap: clamp(48px, 5vw, 72px)');
    expect(styleSource).toMatch(/\.domain-graph-layout \{[^}]*grid-template-columns: minmax\(390px, 1fr\) minmax\(280px, 340px\)/s);
    expect(styleSource).toMatch(/\.domain-graph-layout \{[^}]*column-gap: var\(--domain-summary-min-gap\)/s);
    expect(styleSource).toContain('@media (max-width: 1100px)');
    expect(styleSource).toMatch(/@media \(max-width: 1100px\) \{[^}]*\.domain-graph-layout \{[^}]*grid-template-columns: 1fr/s);
    expect(styleSource).toMatch(/\.domain-node-summary \{[^}]*width: min\(100%, 520px\)/s);
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
    expect(styleSource).toMatch(/\.spider \{[^}]*width: min\(100%, clamp\(300px, 42vw, 430px\)\)/);
  });

  it('uses overflow-safe responsive primitives for data views and edit forms', () => {
    expect(styleSource).toContain('--content-gutter: clamp(28px, 5vw, 72px)');
    expect(styleSource).toContain('.view { min-width: 0; }');
    expect(styleSource).toContain('.record { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto;');
    expect(styleSource).toContain('.record-copy h3, .record-copy p, .record-copy small { overflow-wrap: anywhere; }');
    expect(styleSource).toContain('grid-template-columns: minmax(130px, 170px) minmax(0, 1fr) auto;');
    expect(styleSource).toContain('max-height: min(720px, calc(100dvh - 32px));');
    expect(styleSource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
  });

  it('exposes accessible labels for the graph and its data points', () => {
    expect(appSource).toContain("svg.setAttribute('role', 'img')");
    expect(appSource).toContain("svg.setAttribute('aria-label'");
    expect(appSource).toContain("role: 'button'");
    expect(appSource).toContain("tabindex: '0'");
    expect(appSource).toContain("'aria-label': `${axis.label}: ${STATUS_LABELS[axis.status]}");
  });
});
