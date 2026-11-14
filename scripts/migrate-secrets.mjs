#!/usr/bin/env node
// Copy this checkout's .secrets/ into the suite's secrets home, once, verified
// (scripts/lib/secrets-home.mjs). Prints file names and counts, never contents.
// The original .secrets/ is left in place for the owner to delete.
import { migrateFromCheckout, secretsHome } from './lib/secrets-home.mjs';

const repoRoot = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const home = secretsHome();
const copied = migrateFromCheckout(repoRoot, home);
console.log(copied.length
  ? `secrets: copied ${copied.length} file(s) from .secrets/ to ${home} (the originals are kept)`
  : `secrets: ${home} is current`);
