#!/bin/sh
set -eu

: "${OPENCOMMONS_ACCOUNT_EMAIL:?OPENCOMMONS_ACCOUNT_EMAIL is required}"
: "${OPENCOMMONS_ACCOUNT_PASSWORD:?OPENCOMMONS_ACCOUNT_PASSWORD is required}"
: "${OPENCOMMONS_POD_NAME:?OPENCOMMONS_POD_NAME is required}"

seed_file="/tmp/opencommons-css-seed.json"

node -e '
  const fs = require("node:fs");
  const seed = [{
    email: process.env.OPENCOMMONS_ACCOUNT_EMAIL,
    password: process.env.OPENCOMMONS_ACCOUNT_PASSWORD,
    pods: [{ name: process.env.OPENCOMMONS_POD_NAME }],
  }];
  fs.writeFileSync(process.argv[1], JSON.stringify(seed), { mode: 0o600 });
' "${seed_file}"

exec node bin/server.js "$@" --seedConfig "${seed_file}"
