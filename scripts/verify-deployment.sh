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
  elapsed=0
  body=""
  echo "Checking ${label} response at ${url}..."
  until body=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${url}" 2>/dev/null) &&
    echo "${body}" | grep -Eq "\"${field}\":(\"${expected}\"|${expected})([,}])"; do
    if [ "${elapsed}" -ge "${WAIT_TIMEOUT}" ]; then
      echo "ERROR: Expected ${field}=${expected}"
      echo "  Full response: ${body:-<unavailable>}"
      exit 1
    fi
    echo "  ${label} did not report ${field}=${expected} (${elapsed}s elapsed). Retrying in ${WAIT_INTERVAL}s..."
    sleep "${WAIT_INTERVAL}"
    elapsed=$((elapsed + WAIT_INTERVAL))
  done
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

check_anonymized_release_controls() {
  echo "Checking owner-approved anonymized release controls..."
  created=$(curl -fsS -X POST "${PIM_URL}/api/resources/conditions" \
    -H "content-type: application/json" \
    --data '{"code":{"system":"http://snomed.info/id/","code":"162864005","display":"Deployment smoke anonymized release"},"status":"active","onsetDate":"2026-01-15","notes":"Direct PHI note for smoke test","recordedBy":"Named Smoke Provider"}')
  resource_url=$(printf '%s' "${created}" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')
  if [ -z "${resource_url}" ]; then
    echo "ERROR: anonymized release setup did not create a resource URL: ${created}"
    exit 1
  fi

  missing_approval_status=$(curl -sS -o /dev/null -w "%{http_code}" --get \
    "${PIM_URL}/api/anonymized/resources/conditions" \
    --data-urlencode "url=${resource_url}")
  if [ "${missing_approval_status}" != "403" ]; then
    echo "ERROR: anonymized release without owner approval returned HTTP ${missing_approval_status}; expected 403."
    exit 1
  fi

  release=$(curl -fsS --get "${PIM_URL}/api/anonymized/resources/conditions" \
    -H "x-opencommons-owner-approved: true" \
    -H "x-opencommons-release-purpose: deployment-smoke" \
    --data-urlencode "url=${resource_url}")
  echo "${release}" | grep -q '"anonymized":true' || {
    echo "ERROR: anonymized release did not report anonymized=true: ${release}"
    exit 1
  }
  echo "${release}" | grep -q '"ownerApproved":true' || {
    echo "ERROR: anonymized release did not report ownerApproved=true: ${release}"
    exit 1
  }
  echo "${release}" | grep -q '"purpose":"deployment-smoke"' || {
    echo "ERROR: anonymized release did not preserve the release purpose: ${release}"
    exit 1
  }
  echo "${release}" | grep -q '"onsetYear":2026' || {
    echo "ERROR: anonymized release did not transform onsetDate to onsetYear: ${release}"
    exit 1
  }
  if echo "${release}" | grep -Eq '"notes"|"recordedBy"|Direct PHI note|Named Smoke Provider'; then
    echo "ERROR: anonymized release exposed direct identifiers or free text: ${release}"
    exit 1
  fi

  curl -fsS -X DELETE --get "${PIM_URL}/api/resources/conditions" \
    --data-urlencode "url=${resource_url}"
  echo "  OK – anonymized release requires owner approval and removes direct identifiers"
}

check_epic_mock_flow() {
  echo "Checking Epic MVP mock connector flow..."
  status=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${PIM_URL}/api/integrations/epic/status")
  echo "${status}" | grep -q '"enabled":true' || {
    echo "ERROR: Epic status did not report enabled=true: ${status}"
    exit 1
  }
  diagnostics=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${PIM_URL}/api/integrations/epic/diagnostics")
  echo "${diagnostics}" | grep -q '"readiness":"ready"' || {
    echo "ERROR: Epic diagnostics did not report readiness=ready: ${diagnostics}"
    exit 1
  }
  echo "${diagnostics}" | grep -q '"localhostMvp":true' || {
    echo "ERROR: Epic diagnostics did not report localhostMvp=true: ${diagnostics}"
    exit 1
  }
  start=$(curl -fsS -X POST --max-time "${PROBE_TIMEOUT}" "${PIM_URL}/api/integrations/epic/connect/start")
  callback_url=$(printf '%s' "${start}" | sed -n 's/.*"authorizationUrl":"\([^"]*\)".*/\1/p')
  if [ -z "${callback_url}" ]; then
    echo "ERROR: Epic connect/start did not return authorizationUrl: ${start}"
    exit 1
  fi
  case "${callback_url}" in
    http*) callback="${callback_url}" ;;
    *) callback="${PIM_URL}${callback_url}" ;;
  esac
  connected=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${callback}")
  echo "${connected}" | grep -q '"status":"connected"' || {
    echo "ERROR: Epic callback did not connect: ${connected}"
    exit 1
  }
  preview=$(curl -fsS -X POST --max-time "${PROBE_TIMEOUT}" "${PIM_URL}/api/integrations/epic/sync/preview" \
    -H "content-type: application/json" \
    --data '{"workflow":"annual-medicare-wellness"}')
  echo "${preview}" | grep -q '"domain":"conditions"' || {
    echo "ERROR: Epic preview did not include conditions: ${preview}"
    exit 1
  }
  echo "${preview}" | grep -q '"domain":"documents"' || {
    echo "ERROR: Epic preview did not include documents: ${preview}"
    exit 1
  }
  echo "${preview}" | grep -q '"domain":"workflow-tasks"' || {
    echo "ERROR: Epic preview did not include workflow-tasks: ${preview}"
    exit 1
  }
  apply=$(curl -fsS -X POST --max-time "${PROBE_TIMEOUT}" "${PIM_URL}/api/integrations/epic/sync/apply" \
    -H "content-type: application/json" \
    --data '{"domains":["conditions"]}')
  echo "${apply}" | grep -q '"conditions":1' || {
    echo "ERROR: Epic apply did not create a condition: ${apply}"
    exit 1
  }
  audit=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${PIM_URL}/api/integrations/epic/audit")
  echo "${audit}" | grep -q '"action":"sync-apply"' || {
    echo "ERROR: Epic audit did not include sync-apply: ${audit}"
    exit 1
  }
  echo "  OK – Epic mock connect, preview, apply, and audit succeeded"
}

check_epic_planning_surfaces() {
  echo "Checking read-only Epic planning surfaces..."
  for surface in documents workflow; do
    url="${PIM_URL}/api/planned/epic/${surface}"
    body=$(curl -fsS --max-time "${PROBE_TIMEOUT}" "${url}") || {
      echo "ERROR: could not reach ${url}"
      exit 1
    }
    echo "${body}" | grep -q '"localhostMvp":true' || {
      echo "ERROR: ${surface} planning surface did not report localhostMvp=true: ${body}"
      exit 1
    }
    echo "${body}" | grep -q '"writeEnabled":false' || {
      echo "ERROR: ${surface} planning surface did not report writeEnabled=false: ${body}"
      exit 1
    }
    echo "${body}" | grep -q '"piiRelease":false' || {
      echo "ERROR: ${surface} planning surface did not report piiRelease=false: ${body}"
      exit 1
    }
  done
  echo "  OK – Epic document/workflow planning surfaces are read-only and privacy-safe"
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
for domain in profiles conditions medications allergies immunizations vital-signs providers lab-results insurance-policies documents workflow-tasks; do
  echo "${openapi}" | grep -q "\"/api/resources/${domain}\"" || {
    echo "ERROR: OpenAPI contract is missing /api/resources/${domain}."
    exit 1
  }
done
for planned_path in /api/planned/epic /api/planned/epic/documents /api/planned/epic/workflow; do
  echo "${openapi}" | grep -q "\"${planned_path}\"" || {
    echo "ERROR: OpenAPI contract is missing ${planned_path}."
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
check_domain_crud \
  "documents" \
  '{"documentType":{"system":"http://loinc.org","code":"34133-9","display":"Summary of episode note"},"status":"current","title":"Annual Medicare Wellness Visit Summary","authoredDate":"2026-01-15T12:00:00Z","sourceSystem":"deployment-smoke"}' \
  '"code":"34133-9"'
check_domain_crud \
  "workflow-tasks" \
  '{"taskType":{"system":"http://snomed.info/id/","code":"386053000","display":"Evaluation procedure"},"status":"requested","intent":"plan","description":"Review Annual Medicare Wellness preventive plan","authoredDate":"2026-01-15T12:00:00Z"}' \
  '"code":"386053000"'

check_anonymized_release_controls
check_epic_planning_surfaces

if [ "${EPIC_ENABLED:-false}" = "true" ]; then
  check_epic_mock_flow
fi

echo ""
echo "All deployment smoke tests passed."
echo "  PIM  : ${PIM_URL}"
echo "  CSS  : ${CSS_URL}"
