# Localhost MVP deployment issue notes

These notes track the remaining implementation work for the localhost-only MVP.
They are written in issue form so they can be copied into GitHub issues during
the next planning cycle.

Native iPad/iPhone work remains on hold. Public DNS-visible hosted deployment is
also outside the current MVP unless a later milestone explicitly opens it.

## Milestone: localhost deployment hardening

### Issue LHMVP-01: Add host-local deployment smoke automation

**Problem:** Container-local deployment has the strongest repeatable smoke path.
Host-local deployment uses the same Solid infrastructure but should have an
equally explicit release gate.

**Status:** Implemented by `npm run local:host-smoke`.

**Scope:** localhost only.

**Acceptance criteria:**

- `./scripts/local-host-solid-up.sh` provisions CSS and writes a port-scoped
  `.solid/host-local-<app>-<css>.env`.
- `./scripts/local-host-start.sh` starts the PIM against that env file.
- `./scripts/local-host-smoke.sh` starts CSS, starts the host PIM in the
  background, runs deployment verification, and stops only the host PIM process.
- `./scripts/verify-deployment.sh` passes against the configured host-local
  ports.
- The workflow avoids hard-coded `8080` and `3000` assumptions.

### Issue LHMVP-02: Add Epic mock diagnostics to visual review instructions

**Problem:** The UI has Epic diagnostics, but the visual review guide should
make them part of the review path.

**Status:** Implemented in `docs/PRE_MVP_VISUAL_REVIEW_STARTUP.md`.

**Scope:** local Epic mock mode only.

**Acceptance criteria:**

- Startup docs show how to set `EPIC_ENABLED=true`, `EPIC_MODE=mock`, and a
  local `EPIC_GRANT_ENCRYPTION_KEY`.
- Review steps confirm `/api/integrations/epic/diagnostics` returns
  `localhostMvp: true` and `readiness: ready`.
- No live Epic credentials are required.

### Issue LHMVP-03: Preserve owner-mediated Epic import by section

**Problem:** Medicare Wellness imports should not behave like an all-or-nothing
write. The owner should review and choose which sections are applied.

**Status:** Implemented in the local browser UI and Playwright Medicare
Wellness flow.

**Scope:** local mock data and existing nine PIM domains.

**Acceptance criteria:**

- Preview groups candidates by PIM domain.
- The owner can include or exclude sections before applying.
- Apply requests send the selected `domains` list.
- The UI shows selected candidate count before pod writes.
- Playwright confirms preview, section review, and apply.

### Issue LHMVP-04: Add conflict/reconciliation status to Epic preview

**Problem:** The current mapper emits import actions but does not yet surface
local-vs-Epic conflict details in the UI.

**Status:** Implemented for local preview reconciliation.

**Scope:** local mock data first; live Epic later.

**Acceptance criteria:**

- Preview distinguishes create, update, unchanged, and conflict.
- Local-only records are not overwritten without owner choice.
- Change summaries identify source FHIR resource type/id and destination PIM
  domain.

### Issue LHMVP-05: Add localhost document/workflow read-only planning stubs

**Problem:** Document and workflow resources are in the Epic roadmap but not yet
represented as localhost API surfaces.

**Status:** Implemented as read-only planning contracts at
`/api/planned/epic/documents` and `/api/planned/epic/workflow`.

**Scope:** read-only planning and schemas; no outbound Epic writes.

**Acceptance criteria:**

- DocumentReference and workflow/task concepts are mapped to local API
  contracts or explicitly parked.
- OpenAPI shows planned read-only surfaces when implemented.
- Anonymized release rules exclude document identifiers, URLs, and free text by
  default.

### Issue LHMVP-06: Add localhost deployment preflight checks

**Problem:** Container and host-local workflows can fail late when Docker is not
running or when a configured localhost port is already occupied.

**Status:** Implemented by `npm run local:preflight`; `local:container` and
`local:host-solid` run the preflight before Docker Compose starts.

**Scope:** local notebook/container deployment only.

**Acceptance criteria:**

- `APP_PORT` and `CSS_PORT` are validated as distinct TCP ports.
- Occupied localhost ports fail fast with a clear remediation message.
- Docker daemon availability is checked before local Solid infrastructure starts.
- `SKIP_LOCAL_PREFLIGHT=1` is available only for intentional reuse of an
  already-running stack.

### Issue LHMVP-07: Verify read-only Epic planning surfaces in deployment smoke

**Problem:** The operational deployment gate requires read-only Epic
document/workflow planning surfaces, but the live smoke test did not yet prove
those endpoints are reachable or privacy-safe.

**Status:** Implemented in `scripts/verify-deployment.sh` and
`scripts/validate-openapi.mjs`.

**Scope:** localhost deployment smoke and static OpenAPI validation only.

**Acceptance criteria:**

- `/api/planned/epic`, `/api/planned/epic/documents`, and
  `/api/planned/epic/workflow` are present in the OpenAPI contract.
- Live smoke verifies the document and workflow planning endpoints are
  reachable.
- Live smoke fails if either planning endpoint reports `writeEnabled: true` or
  `piiRelease: true`.

### Issue LHMVP-08: Keep anonymized release controls in the live smoke gate

**Problem:** Unit and Playwright tests cover anonymized release behavior, but
the deployment smoke script should also prove the running local stack denies
non-owner release and strips direct identifiers from approved anonymized output.

**Status:** Implemented in `scripts/verify-deployment.sh`.

**Scope:** localhost deployment smoke only.

**Acceptance criteria:**

- Live smoke creates a temporary condition with direct free-text PHI.
- `/api/anonymized/resources/conditions` returns `403` without owner approval
  and purpose headers.
- Owner-approved release returns `anonymized: true`, `ownerApproved: true`, and
  the declared purpose.
- Approved release generalizes dates and excludes `notes`, `recordedBy`, and
  direct free text.

### Issue LHMVP-09: Provide a single non-Docker localhost release gate

**Problem:** The MVP acceptance gate is documented as several commands, but the
repeatable local workflow should have one command that runs the non-Docker gate
before a PR/release cycle.

**Status:** Implemented by `npm run local:release-gate`.

**Scope:** non-Docker release checks only; live container-local and host-local
smoke tests remain explicit deployment steps.

**Acceptance criteria:**

- The release gate checks shell/script syntax for local deployment scripts.
- The release gate runs typecheck, lint, Jest, build, OpenAPI validation,
  localhost MVP validation, and `git diff --check`.
- Documentation distinguishes the non-Docker gate from live Docker/Solid smoke
  tests.

### Issue LHMVP-10: Add repeatable Epic diagnostics workflow

**Problem:** The app exposes `/api/integrations/epic/diagnostics`, including
optional `?live=true` SMART discovery, but localhost operators need a repeatable
command that checks the endpoint without requiring live Epic credentials in CI.

**Status:** Implemented by `npm run epic:diagnostics`.

**Scope:** diagnostics only; no authorization-code exchange, token exchange,
FHIR reads, or pod writes.

**Acceptance criteria:**

- Default diagnostics check calls `/api/integrations/epic/diagnostics` without
  live network discovery.
- `EPIC_DIAGNOSTICS_LIVE=true` adds `?live=true` for explicit sandbox or
  production SMART discovery checks.
- `EPIC_DIAGNOSTICS_EXPECT` can constrain acceptable readiness states for a
  local workflow.
- The command fails if diagnostics output contains configured secret values.

### Issue LHMVP-11: Align hosted CI with the localhost release gate

**Problem:** The repository has a single non-Docker release gate for local MVP
readiness, but hosted CI should execute that same command so local and PR
evidence do not drift.

**Status:** Implemented in `.github/workflows/ci.yml`.

**Scope:** hosted Node 22 CI only; Docker compose smoke remains in the Docker
Deploy workflow.

**Acceptance criteria:**

- Hosted CI runs `npm run local:release-gate`.
- Hosted CI keeps the deployable artifact checks after the release gate.
- Static localhost MVP validation fails if CI stops using the release gate.

## Future hosted/public deployment notes

These are not part of the current localhost MVP, but they are required before a
public hosted deployment could be considered complete:

- Decide whether hosted deployment is single-user personal hosting or a
  multi-user service.
- Replace local CSS bootstrap credentials with production-grade identity,
  account lifecycle, backup, and recovery operations.
- Terminate HTTPS/TLS at the application boundary.
- Define secret management for Solid and Epic configuration outside `.env`.
- Add production observability that redacts PHI and token material.
- Create a data retention, deletion, and export policy.
- Review HIPAA/BAA obligations if any third party operates infrastructure.
- Register approved Epic redirect URIs for the hosted base URL.
- Add hosted deployment rollback and disaster-recovery tests.
