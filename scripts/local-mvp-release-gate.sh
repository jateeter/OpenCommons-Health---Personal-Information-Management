#!/usr/bin/env sh
# Run the non-Docker localhost MVP release gate.
#
# This gate is intentionally limited to checks that do not require a running
# Docker daemon or occupied localhost ports. Container-local and host-local
# smoke tests remain separate because they start live infrastructure.

set -e

echo "Running OpenCommons Health localhost MVP release gate..."

echo ""
echo "1/8 Checking deployment shell scripts..."
sh -n scripts/local-container-up.sh
sh -n scripts/local-host-solid-up.sh
sh -n scripts/local-host-start.sh
sh -n scripts/local-host-smoke.sh
sh -n scripts/verify-deployment.sh
node --check scripts/local-preflight.mjs

echo ""
echo "2/8 Typechecking..."
npm run typecheck

echo ""
echo "3/8 Linting..."
npm run lint

echo ""
echo "4/8 Running unit tests..."
npm test -- --runInBand

echo ""
echo "5/8 Building distributable artifacts..."
npm run build

echo ""
echo "6/8 Validating OpenAPI..."
npm run validate:openapi

echo ""
echo "7/8 Validating localhost MVP contract..."
npm run validate:localhost-mvp

echo ""
echo "8/8 Checking diff whitespace..."
git diff --check

echo ""
echo "Localhost MVP release gate passed."
echo "Run live deployment smoke separately when Docker is available:"
echo "  APP_PORT=<free-port> CSS_PORT=<free-port> ./scripts/local-container-up.sh"
echo "  APP_PORT=<free-port> CSS_PORT=<free-port> npm run local:host-smoke"
