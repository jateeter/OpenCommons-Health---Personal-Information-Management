#!/usr/bin/env sh
# verify-deployment.sh
#
# Smoke-test the deployed stack by probing service health, API docs, and every
# Solid-backed health domain API.
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
#   PROBE_TIMEOUT – seconds before an individual probe times out (default: 5)

set -e

PIM_URL="${1:-http://localhost:8080}"
CSS_URL="${2:-http://localhost:3000}"

WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-3}"
PROBE_TIMEOUT="${PROBE_TIMEOUT:-5}"

# ── helpers ───────────────────────────────────────────────────────────────────

wait_for() {
  label="$1"
  url="$2"
  elapsed=0
  echo "Waiting for ${label} at ${url} (timeout: ${WAIT_TIMEOUT}s)..."
  until curl -fsS --max-time "${PROBE_TIMEOUT}" "${url}" >/dev/null 2>&1; do
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
  body=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${url}") || { echo "ERROR: could not reach ${url}"; exit 1; }
  if ! echo "${body}" | grep -Eq "\"${field}\":(\"${expected}\"|${expected})([,}])"; then
    echo "ERROR: Expected ${field}=${expected}"
    echo "  Full response: ${body}"
    exit 1
  fi
  echo "  OK – ${field}=${expected}"
}

check_domain_crud() {
  domain="$1"
  payload="$2"
  expected="$3"
  echo "Checking authenticated ${domain} CRUD..."
  created=$(curl -fsS -X POST "${PIM_URL}/api/resources/${domain}" \
    -H "content-type: application/json" \
    --data "${payload}")
  resource_url=$(printf '%s' "${created}" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')
  if [ -z "${resource_url}" ]; then
    echo "ERROR: create response did not contain a resource URL: ${created}"
    exit 1
  fi
  curl -fsS --get "${PIM_URL}/api/resources/${domain}" \
    --data-urlencode "url=${resource_url}" | grep -q "${expected}" || {
    echo "ERROR: created ${domain} resource could not be read back."
    exit 1
  }
  curl -fsS -X DELETE --get "${PIM_URL}/api/resources/${domain}" \
    --data-urlencode "url=${resource_url}"
  echo "  OK – ${domain} create, read, and delete succeeded"
}

# ── 1. Wait for CSS ───────────────────────────────────────────────────────────
wait_for "Community Solid Server" "${CSS_URL}/"

# ── 2. Wait for the PIM process and UI ────────────────────────────────────────
wait_for "PIM app root" "${PIM_URL}/"
wait_for "PIM liveness" "${PIM_URL}/livez"

# ── 3. Validate the executable entrypoint, packaged UI, and API docs ──────────
check_json "PIM liveness" "${PIM_URL}/livez" "ok" "true"
echo "Checking packaged PIM UI at ${PIM_URL}/..."
ui=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${PIM_URL}/") || { echo "ERROR: could not reach ${PIM_URL}/"; exit 1; }
echo "${ui}" | grep -q "OpenCommons Health" || {
  echo "ERROR: PIM root did not serve the packaged application UI."
  exit 1
}
echo "  OK – packaged application UI is available"
echo "Checking OpenAPI/Swagger contract at ${PIM_URL}/openapi.json..."
openapi=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${PIM_URL}/openapi.json") || { echo "ERROR: could not reach ${PIM_URL}/openapi.json"; exit 1; }
echo "${openapi}" | grep -q '"openapi":"3.1.0"' || {
  echo "ERROR: OpenAPI contract did not report version 3.1.0."
  exit 1
}
for domain in profiles conditions medications allergies immunizations vital-signs providers lab-results insurance-policies; do
  echo "${openapi}" | grep -q "\"/api/resources/${domain}\"" || {
    echo "ERROR: OpenAPI contract is missing /api/resources/${domain}."
    exit 1
  }
done
echo "  OK – OpenAPI contract covers all domain API paths"
echo "Checking local API documentation at ${PIM_URL}/api/docs..."
api_docs=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${PIM_URL}/api/docs") || { echo "ERROR: could not reach ${PIM_URL}/api/docs"; exit 1; }
echo "${api_docs}" | grep -q "OpenCommons Health API Docs" || {
  echo "ERROR: API docs page did not serve the packaged documentation UI."
  exit 1
}
echo "  OK – local API documentation is available"

# ── 4. Validate authenticated Solid readiness and domain CRUD ─────────────────
check_json "authenticated PIM readiness" "${PIM_URL}/api/status" "ok" "true"
check_domain_crud \
  "profiles" \
  '{"name":{"family":"Smoke","given":["OpenCommons"]},"birthDate":"1984-05-12","biologicalSex":"unknown"}' \
  '"family":"Smoke"'
check_domain_crud \
  "conditions" \
  '{"code":{"system":"http://snomed.info/id/","code":"162864005","display":"Deployment smoke test"},"status":"active","notes":"Created by verify-deployment.sh"}' \
  '"code":"162864005"'
check_domain_crud \
  "medications" \
  '{"medicationCode":{"system":"http://www.nlm.nih.gov/research/umls/rxnorm","code":"860975","display":"Metformin"},"status":"active","dosage":{"text":"500 mg by mouth daily"}}' \
  '"code":"860975"'
check_domain_crud \
  "allergies" \
  '{"substance":{"system":"http://snomed.info/id/","code":"91936005","display":"Peanut"},"category":"food","status":"active"}' \
  '"code":"91936005"'
check_domain_crud \
  "immunizations" \
  '{"vaccineCode":{"system":"http://hl7.org/fhir/sid/cvx","code":"207","display":"COVID-19 vaccine"},"status":"completed","occurrenceDate":"2026-01-15","doseNumber":1}' \
  '"code":"207"'
check_domain_crud \
  "vital-signs" \
  '{"code":"heart-rate","value":72,"unit":"beats/min","effectiveDateTime":"2026-01-15T12:00:00Z"}' \
  '"code":"heart-rate"'
check_domain_crud \
  "providers" \
  '{"name":"OpenCommons Clinic","role":"primary-care","organization":"OpenCommons Health"}' \
  '"name":"OpenCommons Clinic"'
check_domain_crud \
  "lab-results" \
  '{"code":{"system":"http://loinc.org","code":"4548-4","display":"Hemoglobin A1c"},"value":5.6,"unit":"%","interpretation":"normal","effectiveDateTime":"2026-01-15T12:00:00Z"}' \
  '"code":"4548-4"'
check_domain_crud \
  "insurance-policies" \
  '{"type":"medical","insurerName":"OpenCommons Smoke Plan","memberId":"SMOKE-42","effectiveDate":"2026-01-01"}' \
  '"memberId":"SMOKE-42"'

echo ""
echo "All deployment smoke tests passed."
echo "  PIM  : ${PIM_URL}"
echo "  CSS  : ${CSS_URL}"
