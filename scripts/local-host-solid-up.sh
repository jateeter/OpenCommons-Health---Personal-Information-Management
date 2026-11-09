#!/usr/bin/env sh
# Start local Solid infrastructure for host-run PIM development/deployment.

set -e

APP_PORT="${APP_PORT:-8080}"
CSS_PORT="${CSS_PORT:-13000}"
HOST="${HOST:-127.0.0.1}"
CSS_POD_NAME="${CSS_POD_NAME:-alice}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-180}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-opencommons-health-pim-host-${CSS_PORT}}"
HOST_CREDENTIALS_DIR="${HOST_CREDENTIALS_DIR:-./.solid/host-${CSS_PORT}}"
ENV_FILE="${HOST_LOCAL_ENV_FILE:-.solid/host-local-${APP_PORT}-${CSS_PORT}.env}"
case "${HOST_CREDENTIALS_DIR}" in
  /*) CREDS_DIR_ABS="${HOST_CREDENTIALS_DIR}" ;;
  *) CREDS_DIR_ABS="$(pwd)/${HOST_CREDENTIALS_DIR#./}" ;;
esac
CREDS_FILE="${CREDS_DIR_ABS}/client-credentials.json"
export APP_PORT CSS_PORT HOST CSS_POD_NAME COMPOSE_PROJECT_NAME HOST_CREDENTIALS_DIR

# Lane TLS (PIM#86): with PIM_TLS_DIR set (eval "$(scripts/lane-tls-certs.sh)"),
# CSS serves TLS 1.3 itself through docker-compose.host-local.tls.yml, every URL
# written below is https, and the env file turns PIM's own lane on.
COMPOSE_FILES="-f docker-compose.host-local.yml"
SCHEME=http
if [ -n "${PIM_TLS_DIR:-}" ]; then
  case "${PIM_TLS_DIR}" in
    /*) ;;
    *) PIM_TLS_DIR="$(pwd)/${PIM_TLS_DIR#./}" ;;
  esac
  for f in ca.crt ca.crl css/chain.pem css/key.pem pim/chain.pem pim/key.pem; do
    [ -r "${PIM_TLS_DIR}/${f}" ] || { echo "ERROR: ${PIM_TLS_DIR}/${f} is not readable; run scripts/lane-tls-certs.sh"; exit 1; }
  done
  export PIM_TLS_DIR
  COMPOSE_FILES="${COMPOSE_FILES} -f docker-compose.host-local.tls.yml"
  SCHEME=https
fi

# CSS answers (any status below 500). On the lane the probe is Node, held to
# TLS 1.3 and the install CA: macOS's curl cannot complete the handshake.
css_ready() {
  if [ "${SCHEME}" = https ]; then
    node -e "require('https').get({host:'127.0.0.1',port:${CSS_PORT},path:'/',servername:'localhost',minVersion:'TLSv1.3',ca:require('fs').readFileSync(process.argv[1]),timeout:5000},r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))" "${PIM_TLS_DIR}/ca.crt" >/dev/null 2>&1
  else
    curl -fsS --max-time 5 "http://localhost:${CSS_PORT}/" >/dev/null 2>&1
  fi
}

quote_env_value() {
  printf "%s" "$1" | sed "s/'/'\\\\''/g"
}

write_env() {
  printf "%s='%s'\n" "$1" "$(quote_env_value "$2")"
}

echo "Starting host-local Solid infrastructure..."
echo "  PIM host/port to advertise: ${HOST}:${APP_PORT}"
echo "  CSS port: ${CSS_PORT}"
echo "  Compose project: ${COMPOSE_PROJECT_NAME}"
echo "  Credentials dir: ${HOST_CREDENTIALS_DIR}"

if [ "${SKIP_LOCAL_PREFLIGHT:-0}" != "1" ]; then
  node scripts/local-preflight.mjs
fi

# shellcheck disable=SC2086  # COMPOSE_FILES is a word list built above
docker compose ${COMPOSE_FILES} up --build -d css

echo "Waiting for Community Solid Server at ${SCHEME}://localhost:${CSS_PORT}/..."
elapsed=0
until css_ready; do
  if [ "${elapsed}" -ge "${WAIT_TIMEOUT}" ]; then
    echo "ERROR: Community Solid Server did not become reachable within ${WAIT_TIMEOUT}s."
    # shellcheck disable=SC2086
    docker compose ${COMPOSE_FILES} ps
    # shellcheck disable=SC2086
    docker compose ${COMPOSE_FILES} logs css
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

echo "Starting host-local Solid bootstrap..."
# shellcheck disable=SC2086
docker compose ${COMPOSE_FILES} up --no-recreate -d bootstrap

mkdir -p "$(dirname "${ENV_FILE}")" "${HOST_CREDENTIALS_DIR}"
{
  write_env PORT "${APP_PORT}"
  write_env APP_PORT "${APP_PORT}"
  write_env HOST "${HOST}"
  write_env SOLID_POD_SERVER_URL "${SCHEME}://localhost:${CSS_PORT}"
  write_env SOLID_OIDC_ISSUER "${SCHEME}://localhost:${CSS_PORT}"
  write_env SOLID_POD_BASE_URL "${SCHEME}://localhost:${CSS_PORT}/${CSS_POD_NAME}/"
  write_env SOLID_POD_PATH "${SOLID_POD_PATH:-/health-pim/}"
  write_env SOLID_REDIRECT_URL "${SCHEME}://localhost:${APP_PORT}/callback"
  if [ "${SCHEME}" = https ]; then
    write_env RE_TLS_CERT "${PIM_TLS_DIR}/pim/chain.pem"
    write_env RE_TLS_KEY "${PIM_TLS_DIR}/pim/key.pem"
    write_env RE_TLS_CA "${PIM_TLS_DIR}/ca.crt"
    write_env RE_TLS_CRL "${PIM_TLS_DIR}/ca.crl"
  fi
  write_env SOLID_CLIENT_CREDENTIALS_FILE "${CREDS_FILE}"
  write_env EPIC_ENABLED "${EPIC_ENABLED:-false}"
  write_env EPIC_MODE "${EPIC_MODE:-mock}"
  write_env EPIC_FHIR_BASE_URL "${EPIC_FHIR_BASE_URL:-}"
  write_env EPIC_CLIENT_ID "${EPIC_CLIENT_ID:-}"
  write_env EPIC_CONNECT_FLOW "${EPIC_CONNECT_FLOW:-authorization_code}"
  write_env EPIC_CLIENT_AUTH_METHOD "${EPIC_CLIENT_AUTH_METHOD:-auto}"
  write_env EPIC_DYNAMIC_CLIENT_ID "${EPIC_DYNAMIC_CLIENT_ID:-}"
  write_env EPIC_CLIENT_ASSERTION_PRIVATE_KEY_FILE "${EPIC_CLIENT_ASSERTION_PRIVATE_KEY_FILE:-}"
  write_env EPIC_CLIENT_ASSERTION_KID "${EPIC_CLIENT_ASSERTION_KID:-}"
  write_env EPIC_CLIENT_ASSERTION_ALG "${EPIC_CLIENT_ASSERTION_ALG:-RS384}"
  write_env EPIC_DYNAMIC_CLIENT_PUBLIC_JWKS_FILE "${EPIC_DYNAMIC_CLIENT_PUBLIC_JWKS_FILE:-}"
  write_env EPIC_DYNAMIC_CLIENT_METADATA_FILE "${EPIC_DYNAMIC_CLIENT_METADATA_FILE:-}"
  write_env EPIC_DYNAMIC_CLIENT_REGISTRATION_REQUEST_FILE "${EPIC_DYNAMIC_CLIENT_REGISTRATION_REQUEST_FILE:-}"
  write_env EPIC_CLIENT_SECRET "${EPIC_CLIENT_SECRET:-}"
  write_env EPIC_CLIENT_SECRET_FILE "${EPIC_CLIENT_SECRET_FILE:-}"
  write_env EPIC_REDIRECT_URI "${EPIC_REDIRECT_URI:-${SCHEME}://localhost:${APP_PORT}/api/integrations/epic/connect/callback}"
  write_env EPIC_SCOPES "${EPIC_SCOPES:-}"
  write_env EPIC_GRANT_ENCRYPTION_KEY "${EPIC_GRANT_ENCRYPTION_KEY:-}"
  write_env EPIC_SYNC_ON_STARTUP "${EPIC_SYNC_ON_STARTUP:-false}"
} > "${ENV_FILE}"

echo "Waiting for generated Solid client credentials..."
elapsed=0
until [ -s "${CREDS_FILE}" ]; do
  if [ "${elapsed}" -ge "${WAIT_TIMEOUT}" ]; then
    echo "ERROR: ${CREDS_FILE} was not generated within ${WAIT_TIMEOUT}s."
    # shellcheck disable=SC2086
    docker compose ${COMPOSE_FILES} logs bootstrap
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

echo ""
echo "Host-local Solid infrastructure is ready."
echo "  Local CSS     ${SCHEME}://localhost:${CSS_PORT}/"
echo "  Env file      ${ENV_FILE}"
echo "  Credentials   ${CREDS_FILE}"
echo ""
echo "Start the host app with:"
echo "  ./scripts/local-host-start.sh"
