import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const read = (path) => readFileSync(resolve(root, path), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const envExample = read('.env.example');
const localhostScope = read('docs/LOCALHOST_MVP_SCOPE.md');
const deploymentIssues = read('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md');
const operational = read('docs/OPERATIONAL_STACK_DEPLOYMENT.md');
const epicRoadmap = read('docs/EPIC_INTEGRATION_ROADMAP.md');
const executiveOverview = read('docs/EXECUTIVE_OVERVIEW.md');
const visualReview = read('docs/PRE_MVP_VISUAL_REVIEW_STARTUP.md');
const deploymentVerifier = read('scripts/verify-deployment.sh');
const epicDiagnosticsCheck = read('scripts/epic-diagnostics-check.mjs');
const ciWorkflow = read('.github/workflows/ci.yml');

const failures = [];

function requireText(name, text, expected) {
  if (!text.includes(expected)) {
    failures.push(`${name} must include: ${expected}`);
  }
}

function requireRegex(name, text, pattern, description) {
  if (!pattern.test(text)) {
    failures.push(`${name} must include ${description}`);
  }
}

function requireScript(name) {
  if (!packageJson.scripts?.[name]) {
    failures.push(`package.json must define npm script ${name}`);
  }
}

for (const script of [
  'local:preflight',
  'local:container',
  'local:host-solid',
  'local:host-start',
  'local:host-smoke',
  'local:release-gate',
  'verify:deployment',
  'epic:diagnostics',
  'test:e2e:playwright',
  'validate:openapi',
  'validate:localhost-mvp',
]) {
  requireScript(script);
}

requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'The OpenCommons Health PIM MVP is restricted to localhost deployment');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'Native iPad, iPhone, and other mobile-app deployment work is explicitly on hold');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'Container-local');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'Host-local');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'APP_PORT');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'CSS_PORT');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'npm run validate:localhost-mvp');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'npm run local:release-gate');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'npm run epic:diagnostics');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, '/api/integrations/epic/diagnostics');
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, 'LOCALHOST_MVP_DEPLOYMENT_ISSUES.md');

requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-01');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'local:host-smoke');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-02');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Implemented in `docs/PRE_MVP_VISUAL_REVIEW_STARTUP.md`');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-03');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Playwright Medicare');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-05');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, '/api/planned/epic/documents');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, '/api/planned/epic/workflow');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-06');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'npm run local:preflight');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'SKIP_LOCAL_PREFLIGHT=1');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-07');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'scripts/verify-deployment.sh');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-08');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, '/api/anonymized/resources/conditions');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-09');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'npm run local:release-gate');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-10');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'npm run epic:diagnostics');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Issue LHMVP-11');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, '.github/workflows/ci.yml');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Future hosted/public deployment notes');
requireText('docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md', deploymentIssues, 'Native iPad/iPhone work remains on hold.');

requireText('docs/PRE_MVP_VISUAL_REVIEW_STARTUP.md', visualReview, 'EPIC_ENABLED');
requireText('docs/PRE_MVP_VISUAL_REVIEW_STARTUP.md', visualReview, 'npm run local:preflight');
requireText('docs/PRE_MVP_VISUAL_REVIEW_STARTUP.md', visualReview, '/api/integrations/epic/diagnostics');
requireText('docs/PRE_MVP_VISUAL_REVIEW_STARTUP.md', visualReview, 'localhostMvp');
requireText('docs/PRE_MVP_VISUAL_REVIEW_STARTUP.md', visualReview, 'deselect at least one section');

requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'The active MVP scope is localhost-only.');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'Native iPad/iPhone packaging');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'npm run validate:localhost-mvp');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'npm run local:release-gate');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'npm run epic:diagnostics');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'npm run local:preflight');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, '/api/integrations/epic/diagnostics');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, '/api/planned/epic/documents');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'piiRelease: false');

requireText('docs/EPIC_INTEGRATION_ROADMAP.md', epicRoadmap, 'The active MVP scope is restricted to localhost notebook deployment.');
requireText('docs/EPIC_INTEGRATION_ROADMAP.md', epicRoadmap, 'Current non-iPad implementation sequence');
requireText('docs/EPIC_INTEGRATION_ROADMAP.md', epicRoadmap, '/api/planned/epic/workflow');
requireText('docs/EPIC_INTEGRATION_ROADMAP.md', epicRoadmap, 'Native iPad/mobile issues should remain parked');

requireText('scripts/verify-deployment.sh', deploymentVerifier, '/api/planned/epic/documents');
requireText('scripts/verify-deployment.sh', deploymentVerifier, '/api/planned/epic/workflow');
requireText('scripts/verify-deployment.sh', deploymentVerifier, '"writeEnabled":false');
requireText('scripts/verify-deployment.sh', deploymentVerifier, '"piiRelease":false');
requireText('scripts/verify-deployment.sh', deploymentVerifier, '/api/anonymized/resources/conditions');
requireText('scripts/verify-deployment.sh', deploymentVerifier, 'x-opencommons-owner-approved: true');
requireText('scripts/verify-deployment.sh', deploymentVerifier, 'x-opencommons-release-purpose: deployment-smoke');
requireText('scripts/verify-deployment.sh', deploymentVerifier, 'missing_approval_status');

requireText('scripts/epic-diagnostics-check.mjs', epicDiagnosticsCheck, '/api/integrations/epic/diagnostics');
requireText('scripts/epic-diagnostics-check.mjs', epicDiagnosticsCheck, 'EPIC_DIAGNOSTICS_LIVE');
requireText('scripts/epic-diagnostics-check.mjs', epicDiagnosticsCheck, 'EPIC_DIAGNOSTICS_EXPECT');
requireText('scripts/epic-diagnostics-check.mjs', epicDiagnosticsCheck, 'EPIC_CLIENT_SECRET');

requireText('.github/workflows/ci.yml', ciWorkflow, 'npm run local:release-gate');
requireText('.github/workflows/ci.yml', ciWorkflow, 'Verify deployable application artifact');

requireText('docs/EXECUTIVE_OVERVIEW.md', executiveOverview, 'The current MVP is restricted to localhost deployment');
requireText('docs/EXECUTIVE_OVERVIEW.md', executiveOverview, 'native/iPad work parked');

requireRegex('.env.example', envExample, /^APP_PORT=8080$/m, 'APP_PORT default');
requireRegex('.env.example', envExample, /^CSS_PORT=3000$/m, 'CSS_PORT default');
requireRegex('.env.example', envExample, /^EPIC_ENABLED=false$/m, 'Epic disabled by default');
requireRegex('.env.example', envExample, /^EPIC_MODE=mock$/m, 'Epic mock mode default');

if (failures.length > 0) {
  console.error('Localhost MVP validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Localhost MVP contract is scoped to configurable localhost container and host-local deployments.');
