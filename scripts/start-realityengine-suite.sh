#!/usr/bin/env sh
# Start the sibling RealityEngine multi-runtime suite for local PIM review.

set -e

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
REALITYENGINE_CI_DIR="${REALITYENGINE_CI_DIR:-${ROOT_DIR}/../RealityEngine_CI}"
case "${REALITYENGINE_CI_DIR}" in
  /*) ;;
  *) REALITYENGINE_CI_DIR="${ROOT_DIR}/${REALITYENGINE_CI_DIR}" ;;
esac
START_UNIVERSE="${REALITYENGINE_START_UNIVERSE:-${REALITYENGINE_CI_DIR}/startUniverse.sh}"
REALITYENGINE_SUITE_ARGS="${REALITYENGINE_SUITE_ARGS:---engines=scala:1,cpp:1,lsp:1 --machine-load=runtime --pe-source-bootstrap=auto --no-openclaw --no-local-ai}"

if [ ! -x "${START_UNIVERSE}" ]; then
  echo "ERROR: RealityEngine start script is not executable: ${START_UNIVERSE}"
  echo "Set REALITYENGINE_CI_DIR or REALITYENGINE_START_UNIVERSE to the sibling RealityEngine_CI checkout."
  exit 1
fi

echo ""
echo "Starting RealityEngine suite..."
echo "  Script: ${START_UNIVERSE}"
echo "  Args  : ${REALITYENGINE_SUITE_ARGS}"

# Intentional word-splitting lets callers override REALITYENGINE_SUITE_ARGS with
# the same argv shape they would use on startUniverse.sh directly.
set -- ${REALITYENGINE_SUITE_ARGS}
"${START_UNIVERSE}" "$@"
