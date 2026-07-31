#!/usr/bin/env sh
# Stop the sibling RealityEngine suite started by scripts/start-realityengine-suite.sh.

set -e

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
REALITYENGINE_CI_DIR="${REALITYENGINE_CI_DIR:-${ROOT_DIR}/../RealityEngine_CI}"
case "${REALITYENGINE_CI_DIR}" in
  /*) ;;
  *) REALITYENGINE_CI_DIR="${ROOT_DIR}/${REALITYENGINE_CI_DIR}" ;;
esac
STOP_UNIVERSE="${REALITYENGINE_STOP_UNIVERSE:-${REALITYENGINE_CI_DIR}/stopUniverse.sh}"
REALITYENGINE_SUITE_STOP_ARGS="${REALITYENGINE_SUITE_STOP_ARGS:---all --stop-docker}"

if [ ! -x "${STOP_UNIVERSE}" ]; then
  echo "ERROR: RealityEngine stop script is not executable: ${STOP_UNIVERSE}"
  echo "Set REALITYENGINE_CI_DIR or REALITYENGINE_STOP_UNIVERSE to the sibling RealityEngine_CI checkout."
  exit 1
fi

echo ""
echo "Stopping RealityEngine suite..."
echo "  Script: ${STOP_UNIVERSE}"
echo "  Args  : ${REALITYENGINE_SUITE_STOP_ARGS}"

# Intentional word-splitting lets callers override REALITYENGINE_SUITE_STOP_ARGS
# with the same argv shape they would use on stopUniverse.sh directly.
set -- ${REALITYENGINE_SUITE_STOP_ARGS}
"${STOP_UNIVERSE}" "$@"
