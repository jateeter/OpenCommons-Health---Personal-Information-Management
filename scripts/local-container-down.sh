#!/usr/bin/env sh
# Stop the containerized local deployment without deleting Solid pod data.

set -e

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

APP_PORT="${APP_PORT:-8080}"
CSS_PORT="${CSS_PORT:-13000}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-opencommons-health-pim-${APP_PORT}-${CSS_PORT}}"
export APP_PORT CSS_PORT COMPOSE_PROJECT_NAME

docker compose down

if [ "${REALITYENGINE_SUITE_ENABLED:-1}" != "0" ] && [ "${REALITYENGINE_SUITE_STOP_ON_DOWN:-1}" != "0" ]; then
  ./scripts/stop-realityengine-suite.sh
fi

echo "Container deployment stopped."
echo "Solid pod data and generated client credentials were preserved."
echo "Use docker compose down --volumes only for an intentional destructive reset."
