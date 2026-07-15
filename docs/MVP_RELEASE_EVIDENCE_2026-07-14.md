# Localhost MVP Release Evidence — 2026-07-14

This note records the release evidence collected for the localhost-only
OpenCommons Health PIM MVP validation workflow on 2026-07-14.

## Scope

- MVP target: localhost-only deployment on a personally owned notebook.
- Included deployment modes:
  - Container-local PIM plus containerized local Solid Community Server.
  - Host-local PIM plus containerized local Solid Community Server.
- Included application surfaces:
  - Application UI.
  - OpenAPI/Swagger documentation.
  - 11 domain APIs, including document and workflow-task repositories.
  - Anonymized owner-approved release controls.
  - Read-only Epic planning and mock integration surfaces.
- Excluded from this evidence:
  - Live Epic SMART authorization-code exchange and live FHIR reads.
  - Public DNS-visible HTTPS deployment.
  - Native iPad/iPhone deployment.

## Publication evidence

- Published branch: `localhost-ci-release-gate-alignment`
- Pull request: <https://github.com/jateeter/OpenCommons-Health---Personal-Information-Management/pull/23>
- Merge commit on `main`: `e5f82ff70a1963e5787ec7d178ef1c761ac91ff6`
- Hosted checks observed passing before merge:
  - Build and test on Node 22.
  - Build Docker image.
  - Compose stack smoke tests.
  - GitGuardian.

## Release gate evidence

Command:

```sh
npm run local:release-gate
```

Result: passed from merged `main`.

Validated:

- script syntax
- TypeScript typecheck
- lint
- Jest unit/integration tests
- production build
- OpenAPI validation
- localhost MVP static contract validation
- whitespace diff check

## Container-local deployment evidence

Command:

```sh
APP_PORT=18280 \
CSS_PORT=13200 \
WAIT_TIMEOUT=180 \
EPIC_ENABLED=true \
EPIC_MODE=mock \
EPIC_GRANT_ENCRYPTION_KEY=local-mvp-evidence-epic-key \
./scripts/local-container-up.sh
```

Result: passed after Docker Desktop was started.

Validated:

- PIM UI: `http://localhost:18280`
- local Solid Community Server: `http://localhost:13200`
- `/livez`
- `/openapi.json`
- `/api/docs`
- `/api/status`
- CRUD for the nine pre-decision domain APIs:
  - profiles
  - conditions
  - medications
  - allergies
  - immunizations
  - vital-signs
  - providers
  - lab-results
  - insurance-policies
- anonymized release controls
- read-only Epic planning surfaces
- Epic MVP mock connect, preview, apply, and audit flow

Operational note: the first attempt failed because Docker Desktop was not
running. Starting Docker Desktop restored the container-local happy path.

## Host-local deployment evidence

Command:

```sh
APP_PORT=18282 \
CSS_PORT=13202 \
WAIT_TIMEOUT=180 \
EPIC_ENABLED=true \
EPIC_MODE=mock \
EPIC_GRANT_ENCRYPTION_KEY=host-local-mvp-evidence-epic-key \
npm run local:host-smoke
```

Result: passed.

Validated:

- host PIM build and startup
- containerized local Solid Community Server startup
- PIM UI and liveness
- OpenAPI/Swagger surfaces
- authenticated `/api/status`
- CRUD for the nine pre-decision domain APIs
- anonymized release controls
- read-only Epic planning surfaces
- Epic MVP mock connect, preview, apply, and audit flow

Log artifact:

- `.solid/host-local-smoke-18282-13202.log`

Operational note: an earlier host-local attempt exposed a verifier race where
process liveness was available before authenticated pod readiness. This was
addressed by LHMVP-12: `scripts/verify-deployment.sh` now retries JSON
readiness probes until `WAIT_TIMEOUT` and reports the last response on timeout.

## Playwright Medicare Wellness E2E evidence

Command:

```sh
APP_URL=http://localhost:18280 \
PLAYWRIGHT_OUTPUT_DIR=output/playwright-mvp-evidence \
npm run test:e2e:playwright
```

Result: passed.

Screenshot artifact:

- `output/playwright-mvp-evidence/medicare-wellness-2026-07-14T18-38-41-287Z.png`

Validated:

- user-facing local UI flow
- annual Medicare Wellness Evaluation fixture path
- UI interaction against the running container-local application

## Epic diagnostics evidence

Command:

```sh
APP_URL=http://localhost:18280 \
EPIC_DIAGNOSTICS_EXPECT=ready \
npm run epic:diagnostics
```

Result: passed in mock mode.

Observed diagnostics:

- endpoint: `http://localhost:18280/api/integrations/epic/diagnostics`
- mode: `mock`
- readiness: `ready`
- live discovery: `false`
- checks:
  - `epic-enabled: ok`
  - `mode: ok`
  - `grant-encryption-key: ok`
  - `scopes: ok`
  - `fhir-base-url: skipped`
  - `client-id: skipped`
  - `redirect-uri: ok`
  - `smart-discovery: skipped`

Live SMART discovery was not run because this localhost MVP evidence used mock
Epic mode and did not include a registered Epic sandbox or production
configuration.

## Roadblocks found during release validation

### Docker Desktop availability

Container-local and host-local Solid infrastructure require a reachable Docker
daemon. If Docker Desktop is not running, Docker commands fail before the
application can be evaluated.

Mitigation:

- Start Docker Desktop before container-local or host-local workflows.
- Keep this as an operator preflight item for the notebook-local MVP.

### Authenticated readiness race

Host-local liveness can become available before authenticated pod-backed status
is ready.

Mitigation:

- LHMVP-12 was added to `docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md`.
- `scripts/verify-deployment.sh` now retries JSON readiness checks until
  `WAIT_TIMEOUT`.
- `scripts/validate-localhost-mvp.mjs` now requires the retry contract.

## Step 8 decision

Decision: actual document/workflow repository implementation is required before
MVP completion.

Implementation response:

- `documents` is implemented as owner-held FHIR `DocumentReference` metadata at
  `/api/resources/documents`.
- `workflow-tasks` is implemented as owner-held FHIR `Task` metadata at
  `/api/resources/workflow-tasks`.
- Both domains are included in OpenAPI, FHIR metadata, ShEx validation,
  anonymized-release rules, and deployment smoke coverage.
- Post-decision source validation passed with `npm run local:release-gate`:
  18 test suites, 163 tests, production build, OpenAPI validation, and
  localhost MVP static validation.
- The OpenAPI contract now covers 11 domains, 44 owner actions, and 11
  anonymized-release actions.
- Fresh post-decision live Docker smoke was attempted on `APP_PORT=18290` and
  `CSS_PORT=13210`, but Docker Desktop/BuildKit stopped responding during the
  image build. The run was interrupted before application validation completed.
  Rerun the live smoke commands after Docker Desktop is healthy to capture
  post-decision CSS-backed evidence for all 11 domains.
