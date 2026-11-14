// node --test scripts/secrets-home.test.mjs (npm run test:secrets)
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateFromCheckout, REPO, secretsHome } from './lib/secrets-home.mjs';

const tmp = (p) => mkdtempSync(join(tmpdir(), p));
const mode = (f) => statSync(f).mode & 0o777;

test('the home resolves RE_SECRETS_DIR, then RE_INSTANCE_STATE_DIR, then ~/.reality-engine', () => {
  assert.equal(secretsHome({ RE_SECRETS_DIR: '/s' }), `/s/${REPO}`);
  assert.equal(secretsHome({ RE_INSTANCE_STATE_DIR: '/x' }), `/x/secrets/${REPO}`);
  assert.equal(secretsHome({}), join(homedir(), '.reality-engine', 'secrets', REPO));
});

test('.secrets/ is copied once, verified, 0600, and never deleted or overwritten', () => {
  const root = tmp('pim-root-'); const home = join(tmp('pim-home-'), REPO);
  mkdirSync(join(root, '.secrets', 'epic-dynamic-client'), { recursive: true });
  writeFileSync(join(root, '.secrets', 'epic-dynamic-client', 'private-key.pem'), 'KEY-A');
  writeFileSync(join(root, '.secrets', 'epic-dynamic-client', 'jwks.json'), '{}');
  assert.deepEqual(migrateFromCheckout(root, home).sort(), ['epic-dynamic-client/jwks.json', 'epic-dynamic-client/private-key.pem']);
  assert.equal(mode(home), 0o700);
  assert.equal(mode(join(home, 'epic-dynamic-client', 'private-key.pem')), 0o600);
  assert.ok(existsSync(join(root, '.secrets', 'epic-dynamic-client', 'private-key.pem')), 'the original is kept');
  // Another checkout's different key never replaces the home's.
  const other = tmp('pim-other-');
  mkdirSync(join(other, '.secrets', 'epic-dynamic-client'), { recursive: true });
  writeFileSync(join(other, '.secrets', 'epic-dynamic-client', 'private-key.pem'), 'KEY-B');
  assert.deepEqual(migrateFromCheckout(other, home), []);
  assert.equal(readFileSync(join(home, 'epic-dynamic-client', 'private-key.pem'), 'utf8'), 'KEY-A');
});

test('a checkout without .secrets/ migrates nothing', () => {
  assert.deepEqual(migrateFromCheckout(tmp('pim-none-'), join(tmp('pim-home-'), REPO)), []);
});
