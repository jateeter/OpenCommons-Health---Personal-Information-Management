#!/usr/bin/env sh
# verify-deployment.sh
#
# Smoke-test the deployed stack by probing every service health endpoint.
# Exits non-zero if any probe fails or times out.
#
# Usage:
#   ./scripts/verify-deployment.sh [PIM_URL] [CSS_URL]
#
# Defaults:
#   PIM_URL  http://localhost:8080
#   CSS_URL  http://localhost:3000
#
# Environment overrides:
#   WAIT_TIMEOUT  – total seconds to wait per service (default: 60)
#   WAIT_INTERVAL – seconds between retries              (default: 3)

set -e

PIM_URL="${1:-http://localhost:8080}"
CSS_URL="${2:-http://localhost:3000}"

WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-3}"

# ── helpers ───────────────────────────────────────────────────────────────────

wait_for() {
  label="$1"
  url="$2"
  elapsed=0
  echo "Waiting for ${label} at ${url} (timeout: ${WAIT_TIMEOUT}s)..."
  until wget -q --spider "${url}" 2>/dev/null; do
    if [ "${elapsed}" -ge "${WAIT_TIMEOUT}" ]; then
      echo "ERROR: ${label} did not become available within ${WAIT_TIMEOUT}s."
      exit 1
    fi
    echo "  ${label} not ready (${elapsed}s elapsed). Retrying in ${WAIT_INTERVAL}s..."
    sleep "${WAIT_INTERVAL}"
    elapsed=$((elapsed + WAIT_INTERVAL))
  done
  echo "  ${label} is ready after ${elapsed}s."
}

check_json() {
  label="$1"
  url="$2"
  field="$3"
  expected="$4"
  echo "Checking ${label} response at ${url}..."
  body=$(wget -qO- "${url}" 2>/dev/null) || { echo "ERROR: could not reach ${url}"; exit 1; }
  actual=$(echo "${body}" | grep -o "\"${field}\":\"[^\"]*\"" | head -1 | cut -d'"' -f4)
  if [ "${actual}" != "${expected}" ]; then
    echo "ERROR: Expected ${field}=${expected} but got: ${actual}"
    echo "  Full response: ${body}"
    exit 1
  fi
  echo "  OK – ${field}=${actual}"
}

# ── 1. Wait for CSS ───────────────────────────────────────────────────────────
wait_for "Community Solid Server" "${CSS_URL}/"

# ── 2. Wait for PIM app ───────────────────────────────────────────────────────
wait_for "PIM app root" "${PIM_URL}/"
wait_for "PIM healthz" "${PIM_URL}/healthz"

# ── 3. Validate PIM JSON responses ───────────────────────────────────────────
check_json "PIM root"   "${PIM_URL}/"      "status"  "running"
check_json "PIM healthz" "${PIM_URL}/healthz" "ok" "true"

echo ""
echo "All deployment smoke tests passed."
echo "  PIM  : ${PIM_URL}"
echo "  CSS  : ${CSS_URL}"
