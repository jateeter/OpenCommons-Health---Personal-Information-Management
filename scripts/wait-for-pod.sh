#!/usr/bin/env sh
# wait-for-pod.sh
#
# Polls a Solid pod URL until it responds with HTTP 200 (or until the timeout
# expires), then executes the provided command.
#
# Usage:
#   ./scripts/wait-for-pod.sh http://localhost:3000 -- npm run test:integration
#
# Environment:
#   WAIT_TIMEOUT  – total seconds to wait before giving up (default: 60)
#   WAIT_INTERVAL – seconds between retries                (default: 3)

set -e

POD_URL="${1}"
shift

if [ "$1" = "--" ]; then
  shift
fi

WAIT_TIMEOUT="${WAIT_TIMEOUT:-60}"
WAIT_INTERVAL="${WAIT_INTERVAL:-3}"

elapsed=0

echo "Waiting for Solid pod at ${POD_URL} (timeout: ${WAIT_TIMEOUT}s)..."

until wget -q --spider "${POD_URL}" 2>/dev/null; do
  if [ "$elapsed" -ge "$WAIT_TIMEOUT" ]; then
    echo "ERROR: Solid pod at ${POD_URL} did not become available within ${WAIT_TIMEOUT}s."
    exit 1
  fi
  echo "  Pod not ready yet (${elapsed}s elapsed). Retrying in ${WAIT_INTERVAL}s..."
  sleep "${WAIT_INTERVAL}"
  elapsed=$((elapsed + WAIT_INTERVAL))
done

echo "Solid pod is ready after ${elapsed}s."

if [ "$#" -gt 0 ]; then
  exec "$@"
fi
