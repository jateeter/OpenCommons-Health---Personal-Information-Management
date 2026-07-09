#!/usr/bin/env sh
# Build and start the PIM HTTP server on the host using host-local CSS config.

set -e

APP_PORT="${APP_PORT:-8080}"
CSS_PORT="${CSS_PORT:-3000}"
ENV_FILE="${HOST_LOCAL_ENV_FILE:-.solid/host-local-${APP_PORT}-${CSS_PORT}.env}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} does not exist."
  echo "Run ./scripts/local-host-solid-up.sh first."
  exit 1
fi

set -a
. "${ENV_FILE}"
set +a

npm run build

echo ""
echo "Starting OpenCommons Health host-local app..."
echo "  PIM UI      http://localhost:${APP_PORT:-8080}/"
echo "  API docs    http://localhost:${APP_PORT:-8080}/api/docs"
echo "  OpenAPI     http://localhost:${APP_PORT:-8080}/openapi.json"
echo "  Local CSS   ${SOLID_POD_SERVER_URL}"

exec npm start
