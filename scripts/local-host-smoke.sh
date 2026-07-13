#!/usr/bin/env sh
# Start and verify the host-local localhost deployment.
#
# This workflow keeps the active MVP scoped to a personal localhost notebook:
# - CSS runs in Docker with port-scoped credentials and pod data.
# - PIM runs on the host from the built Node artifact.
# - The normal deployment verifier proves the UI, APIs, pod access, and
#   optional Epic mock flow.
#
# Environment overrides:
#   APP_PORT             Host PIM port       (default: 18080)
#   CSS_PORT             Local CSS port      (default: 13000)
#   WAIT_TIMEOUT         Service wait budget (default: 180)
#   EPIC_ENABLED         Optional Epic flow   (default: false)
#   EPIC_MODE            Epic mode           (default: mock)
#   HOST_LOCAL_ENV_FILE  Generated env file  (default: .solid/host-local-smoke-<app>-<css>.env)

set -e

APP_PORT="${APP_PORT:-18080}"
CSS_PORT="${CSS_PORT:-13000}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-180}"
HOST_LOCAL_ENV_FILE="${HOST_LOCAL_ENV_FILE:-.solid/host-local-smoke-${APP_PORT}-${CSS_PORT}.env}"
HOST_CREDENTIALS_DIR="${HOST_CREDENTIALS_DIR:-./.solid/host-smoke-${CSS_PORT}}"
PIM_LOG="${PIM_LOG:-.solid/host-local-smoke-${APP_PORT}-${CSS_PORT}.log}"
EPIC_ENABLED="${EPIC_ENABLED:-false}"
EPIC_MODE="${EPIC_MODE:-mock}"
if [ "${EPIC_ENABLED}" = "true" ] && [ -z "${EPIC_GRANT_ENCRYPTION_KEY:-}" ]; then
  EPIC_GRANT_ENCRYPTION_KEY="host-local-smoke-epic-grant-key"
fi

export APP_PORT CSS_PORT WAIT_TIMEOUT HOST_LOCAL_ENV_FILE HOST_CREDENTIALS_DIR EPIC_ENABLED EPIC_MODE EPIC_GRANT_ENCRYPTION_KEY

PIM_PID=""
cleanup() {
  if [ -n "${PIM_PID}" ] && kill -0 "${PIM_PID}" >/dev/null 2>&1; then
    echo "Stopping host-local PIM process ${PIM_PID}..."
    kill "${PIM_PID}" >/dev/null 2>&1 || true
    wait "${PIM_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Running host-local localhost smoke workflow..."
echo "  PIM port: ${APP_PORT}"
echo "  CSS port: ${CSS_PORT}"
echo "  Env file: ${HOST_LOCAL_ENV_FILE}"
echo "  PIM log : ${PIM_LOG}"

./scripts/local-host-solid-up.sh
npm run build

set -a
. "${HOST_LOCAL_ENV_FILE}"
set +a

echo "Starting host-local PIM in the background..."
npm start > "${PIM_LOG}" 2>&1 &
PIM_PID="$!"
echo "  PIM pid: ${PIM_PID}"

WAIT_TIMEOUT="${WAIT_TIMEOUT}" ./scripts/verify-deployment.sh \
  "http://localhost:${APP_PORT}" \
  "http://localhost:${CSS_PORT}"

echo ""
echo "Host-local deployment smoke passed."
echo "  PIM UI      http://localhost:${APP_PORT}/"
echo "  API docs    http://localhost:${APP_PORT}/api/docs"
echo "  OpenAPI     http://localhost:${APP_PORT}/openapi.json"
echo "  Local CSS   http://localhost:${CSS_PORT}/"
echo "  PIM log     ${PIM_LOG}"
