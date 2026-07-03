cat > .github/workflows/ci.yml <<'EOF'
name: ci
on:
  pull_request:
  push:
    branches: [ main, feature/config-ui-nginx-https-solid-ci ]
jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate certs
        run: sh certs/generate-self-signed.sh
      - name: Build and start stack
        run: docker compose up -d --build
      - name: Wait
        run: sleep 20
      - name: Smoke
        run: bash scripts/ci-smoke.sh
      - name: Teardown
        if: always()
        run: docker compose down -v
EOF
