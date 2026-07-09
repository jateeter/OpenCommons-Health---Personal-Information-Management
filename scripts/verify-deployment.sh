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
  until wget -qO- "${url}" >/dev/null 2>&1; do
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
  if ! echo "${body}" | grep -Eq "\"${field}\":(\"${expected}\"|${expected})([,}])"; then
    echo "ERROR: Expected ${field}=${expected}"
    echo "  Full response: ${body}"
    exit 1
  fi
  echo "  OK – ${field}=${expected}"
}

# ── 1. Wait for CSS ───────────────────────────────────────────────────────────
wait_for "Community Solid Server" "${CSS_URL}/"

# ── 2. Wait for the PIM process and UI ────────────────────────────────────────
wait_for "PIM app root" "${PIM_URL}/"
wait_for "PIM liveness" "${PIM_URL}/livez"

# ── 3. Validate the executable entrypoint and packaged UI ─────────────────────
check_json "PIM liveness" "${PIM_URL}/livez" "ok" "true"
echo "Checking packaged PIM UI at ${PIM_URL}/..."
ui=$(wget -qO- "${PIM_URL}/") || { echo "ERROR: could not reach ${PIM_URL}/"; exit 1; }
echo "${ui}" | grep -q "OpenCommons Health" || {
  echo "ERROR: PIM root did not serve the packaged application UI."
  exit 1
}
echo "  OK – packaged application UI is available"

# ── 4. Validate authenticated Solid readiness and domain CRUD ─────────────────
check_json "authenticated PIM readiness" "${PIM_URL}/api/status" "ok" "true"
echo "Checking authenticated conditions CRUD..."
created=$(curl -fsS -X POST "${PIM_URL}/api/resources/conditions" \
  -H "content-type: application/json" \
  --data '{"code":{"system":"http://snomed.info/id/","code":"162864005","display":"Deployment smoke test"},"status":"active","notes":"Created by verify-deployment.sh"}')
resource_url=$(printf '%s' "${created}" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')
if [ -z "${resource_url}" ]; then
  echo "ERROR: create response did not contain a resource URL: ${created}"
  exit 1
fi
curl -fsS --get "${PIM_URL}/api/resources/conditions" \
  --data-urlencode "url=${resource_url}" | grep -q '"code":"162864005"' || {
  echo "ERROR: created condition could not be read back."
  exit 1
}
curl -fsS -X DELETE --get "${PIM_URL}/api/resources/conditions" \
  --data-urlencode "url=${resource_url}"
echo "  OK – create, read, and delete succeeded"

echo ""
echo "All deployment smoke tests passed."
echo "  PIM  : ${PIM_URL}"
echo "  CSS  : ${CSS_URL}"
