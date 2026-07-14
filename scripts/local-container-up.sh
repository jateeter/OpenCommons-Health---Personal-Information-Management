#!/usr/bin/env sh
# Start and verify the complete containerized local deployment.

set -e

APP_PORT="${APP_PORT:-8080}"
CSS_PORT="${CSS_PORT:-3000}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-120}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-opencommons-health-pim-${APP_PORT}-${CSS_PORT}}"
export APP_PORT CSS_PORT COMPOSE_PROJECT_NAME

echo "Starting OpenCommons Health container stack..."
echo "  PIM port: ${APP_PORT}"
echo "  CSS port: ${CSS_PORT}"
echo "  Compose project: ${COMPOSE_PROJECT_NAME}"

if [ "${SKIP_LOCAL_PREFLIGHT:-0}" != "1" ]; then
  node scripts/local-preflight.mjs
fi

docker compose up --build -d

if [ "${VERIFY_DEPLOYMENT:-1}" != "0" ]; then
  WAIT_TIMEOUT="${WAIT_TIMEOUT}" ./scripts/verify-deployment.sh \
    "http://localhost:${APP_PORT}" \
    "http://localhost:${CSS_PORT}"
fi

echo ""
echo "Container deployment is ready."
echo "  PIM UI      http://localhost:${APP_PORT}/"
echo "  API docs    http://localhost:${APP_PORT}/api/docs"
echo "  OpenAPI     http://localhost:${APP_PORT}/openapi.json"
echo "  Local CSS   http://localhost:${CSS_PORT}/"
