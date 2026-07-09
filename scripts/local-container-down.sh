#!/usr/bin/env sh
# Stop the containerized local deployment without deleting Solid pod data.

set -e

APP_PORT="${APP_PORT:-8080}"
CSS_PORT="${CSS_PORT:-3000}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-opencommons-health-pim-${APP_PORT}-${CSS_PORT}}"
export APP_PORT CSS_PORT COMPOSE_PROJECT_NAME

docker compose down

echo "Container deployment stopped."
echo "Solid pod data and generated client credentials were preserved."
echo "Use docker compose down --volumes only for an intentional destructive reset."
