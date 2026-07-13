import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const read = (path) => readFileSync(resolve(root, path), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const envExample = read('.env.example');
const localhostScope = read('docs/LOCALHOST_MVP_SCOPE.md');
const operational = read('docs/OPERATIONAL_STACK_DEPLOYMENT.md');
const epicRoadmap = read('docs/EPIC_INTEGRATION_ROADMAP.md');
const executiveOverview = read('docs/EXECUTIVE_OVERVIEW.md');

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
  'local:container',
  'local:host-solid',
  'local:host-start',
  'verify:deployment',
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
requireText('docs/LOCALHOST_MVP_SCOPE.md', localhostScope, '/api/integrations/epic/diagnostics');

requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'The active MVP scope is localhost-only.');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'Native iPad/iPhone packaging');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, 'npm run validate:localhost-mvp');
requireText('docs/OPERATIONAL_STACK_DEPLOYMENT.md', operational, '/api/integrations/epic/diagnostics');

requireText('docs/EPIC_INTEGRATION_ROADMAP.md', epicRoadmap, 'The active MVP scope is restricted to localhost notebook deployment.');
requireText('docs/EPIC_INTEGRATION_ROADMAP.md', epicRoadmap, 'Current non-iPad implementation sequence');
requireText('docs/EPIC_INTEGRATION_ROADMAP.md', epicRoadmap, 'Native iPad/mobile issues should remain parked');

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
