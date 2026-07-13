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

**Scope:** local mock data first; live Epic later.

**Acceptance criteria:**

- Preview distinguishes create, update, unchanged, and conflict.
- Local-only records are not overwritten without owner choice.
- Change summaries identify source FHIR resource type/id and destination PIM
  domain.

### Issue LHMVP-05: Add localhost document/workflow read-only planning stubs

**Problem:** Document and workflow resources are in the Epic roadmap but not yet
represented as localhost API surfaces.

**Scope:** read-only planning and schemas; no outbound Epic writes.

**Acceptance criteria:**

- DocumentReference and workflow/task concepts are mapped to local API
  contracts or explicitly parked.
- OpenAPI shows planned read-only surfaces when implemented.
- Anonymized release rules exclude document identifiers, URLs, and free text by
  default.

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
