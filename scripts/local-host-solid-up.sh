#!/usr/bin/env sh
# Start local Solid infrastructure for host-run PIM development/deployment.

set -e

APP_PORT="${APP_PORT:-8080}"
CSS_PORT="${CSS_PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
CSS_POD_NAME="${CSS_POD_NAME:-alice}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-120}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-opencommons-health-pim-host-${CSS_PORT}}"
HOST_CREDENTIALS_DIR="${HOST_CREDENTIALS_DIR:-./.solid/host-${CSS_PORT}}"
ENV_FILE="${HOST_LOCAL_ENV_FILE:-.solid/host-local-${APP_PORT}-${CSS_PORT}.env}"
case "${HOST_CREDENTIALS_DIR}" in
  /*) CREDS_DIR_ABS="${HOST_CREDENTIALS_DIR}" ;;
  *) CREDS_DIR_ABS="$(pwd)/${HOST_CREDENTIALS_DIR#./}" ;;
esac
CREDS_FILE="${CREDS_DIR_ABS}/client-credentials.json"
export APP_PORT CSS_PORT HOST CSS_POD_NAME COMPOSE_PROJECT_NAME HOST_CREDENTIALS_DIR

echo "Starting host-local Solid infrastructure..."
echo "  PIM host/port to advertise: ${HOST}:${APP_PORT}"
echo "  CSS port: ${CSS_PORT}"
echo "  Compose project: ${COMPOSE_PROJECT_NAME}"
echo "  Credentials dir: ${HOST_CREDENTIALS_DIR}"

docker compose -f docker-compose.host-local.yml up --build -d css bootstrap

mkdir -p "$(dirname "${ENV_FILE}")" "${HOST_CREDENTIALS_DIR}"
{
  echo "PORT=${APP_PORT}"
  echo "APP_PORT=${APP_PORT}"
  echo "HOST=${HOST}"
  echo "SOLID_POD_SERVER_URL=http://localhost:${CSS_PORT}"
  echo "SOLID_OIDC_ISSUER=http://localhost:${CSS_PORT}"
  echo "SOLID_POD_BASE_URL=http://localhost:${CSS_PORT}/${CSS_POD_NAME}/"
  echo "SOLID_POD_PATH=${SOLID_POD_PATH:-/health-pim/}"
  echo "SOLID_REDIRECT_URL=http://localhost:${APP_PORT}/callback"
  echo "SOLID_CLIENT_CREDENTIALS_FILE=${CREDS_FILE}"
  echo "EPIC_ENABLED=${EPIC_ENABLED:-false}"
  echo "EPIC_MODE=${EPIC_MODE:-mock}"
  echo "EPIC_FHIR_BASE_URL=${EPIC_FHIR_BASE_URL:-}"
  echo "EPIC_CLIENT_ID=${EPIC_CLIENT_ID:-}"
  echo "EPIC_REDIRECT_URI=${EPIC_REDIRECT_URI:-http://localhost:${APP_PORT}/api/integrations/epic/connect/callback}"
  echo "EPIC_SCOPES=${EPIC_SCOPES:-}"
  echo "EPIC_GRANT_ENCRYPTION_KEY=${EPIC_GRANT_ENCRYPTION_KEY:-}"
  echo "EPIC_SYNC_ON_STARTUP=${EPIC_SYNC_ON_STARTUP:-false}"
} > "${ENV_FILE}"

echo "Waiting for generated Solid client credentials..."
elapsed=0
until [ -s "${CREDS_FILE}" ]; do
  if [ "${elapsed}" -ge "${WAIT_TIMEOUT}" ]; then
    echo "ERROR: ${CREDS_FILE} was not generated within ${WAIT_TIMEOUT}s."
    docker compose -f docker-compose.host-local.yml logs bootstrap
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

echo ""
echo "Host-local Solid infrastructure is ready."
echo "  Local CSS     http://localhost:${CSS_PORT}/"
echo "  Env file      ${ENV_FILE}"
echo "  Credentials   ${CREDS_FILE}"
echo ""
echo "Start the host app with:"
echo "  ./scripts/local-host-start.sh"
