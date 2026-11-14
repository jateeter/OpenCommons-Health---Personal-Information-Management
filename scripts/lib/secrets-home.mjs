// PIM's secrets home: the RealityEngine suite's one secrets home
// (owner, 2026-11-14; RealityEngine_CI scripts/lib/secrets-home.sh).
//
//   $RE_SECRETS_DIR/OpenCommons-Health---Personal-Information-Management/
//   $RE_INSTANCE_STATE_DIR/secrets/OpenCommons-Health---Personal-Information-Management/
//   ~/.reality-engine/secrets/OpenCommons-Health---Personal-Information-Management/  (default)
//
// One place per machine, outside every repository (so nothing in it can be
// committed), shared by every checkout. It replaces <checkout>/.secrets/: the
// Epic dynamic-client key material (epic-dynamic-client/), which compose mounts
// into the PIM container at /run/opencommons-secrets, unchanged. Directory 0700,
// files 0600. migrateFromCheckout copies the old .secrets/ here once, verifies
// every file and never deletes the original. Nothing here prints secret values.
import { chmodSync, copyFileSync, constants, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const REPO = 'OpenCommons-Health---Personal-Information-Management';

export function secretsHome(env = process.env) {
  const base = env.RE_SECRETS_DIR || join(env.RE_INSTANCE_STATE_DIR || join(homedir(), '.reality-engine'), 'secrets');
  return join(base, REPO);
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
}

// Copy <src> (a directory) into <dst>, file by file, never overwriting; each
// copy verified byte for byte. Returns the relative paths copied.
export function copyTreeVerified(src, dst, rel = '') {
  const copied = [];
  ensureDir(dst);
  for (const name of readdirSync(src)) {
    const from = join(src, name); const to = join(dst, name); const r = rel ? `${rel}/${name}` : name;
    const st = statSync(from);
    if (st.isDirectory()) { copied.push(...copyTreeVerified(from, to, r)); continue; }
    if (!st.isFile() || existsSync(to)) continue;
    copyFileSync(from, to, constants.COPYFILE_EXCL);
    chmodSync(to, 0o600);
    if (!readFileSync(from).equals(readFileSync(to))) {
      rmSync(to);
      throw new Error(`copying ${r} into the secrets home did not verify; nothing was moved`);
    }
    copied.push(r);
  }
  return copied;
}

export function migrateFromCheckout(repoRoot, home = secretsHome()) {
  ensureDir(home);
  const legacy = join(repoRoot, '.secrets');
  return existsSync(legacy) ? copyTreeVerified(legacy, home) : [];
}
