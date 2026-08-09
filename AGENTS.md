# OpenCommons Health PIM Agent Guidance

This file is the repo-local operating contract for Codex agents working in the
OpenCommons Health Personal Information Management repository.

## Project focus

OpenCommons Health PIM is a localhost-first, privacy-first personal health
information manager backed by a local Solid Community Server Pod. The current
MVP priority is repeatable local deployability in both:

- container mode through Docker Compose; and
- host-local mode with the Node app on the host and Solid in Docker.

Treat the Solid Pod as the source of authority for application-managed health
data. The browser UI, domain APIs, Epic import workflow, and HealthKit bridge
surfaces are projections or controlled ingestion paths into that owner-managed
Pod.

## Repository boundaries

- Work in this repository for the PIM web app, TypeScript domain APIs, Solid
  repositories, schemas, OpenAPI contract, documentation, and local deployment
  scripts.
- Use `../localHealthkitBridge` only when a request explicitly includes iPhone,
  HealthKit, native bridge, or cross-repo validation work.
- Use RealityEngine sibling repositories only when the request explicitly
  includes PE/RE integration, local suite startup, or cross-repo deployment
  verification.
- Do not modify unrelated sibling repositories as part of a PIM-only task.

## Privacy and security rules

- Never commit `.env`, `.solid/`, generated credentials, tokens, client secrets,
  Epic authorization codes, local Pod data, or scratch files containing secret
  material.
- Do not print secrets while debugging. Redact or summarize environment-derived
  values.
- Identifiable PHI belongs only in owner-authenticated PIM/Solid workflows.
  Anonymized release APIs must remove direct identifiers and require explicit
  owner approval headers.
- Epic diagnostics and UI summaries must be PHI-safe: resource family, status,
  HTTP/FHIR response class, and counts are acceptable; patient identifiers,
  resource IDs, tokens, document contents, and clinical values are not.
- Prefer HTTPS for non-local deployments. Localhost HTTP is acceptable only for
  local development and the Solid localhost allowance.

## Local deployment contract

The deployment contract must keep port assignments configurable:

- `APP_PORT` controls the PIM HTTP port.
- `CSS_PORT` controls the local Solid Community Server port.
- `HOST` controls the server bind address.
- `COMPOSE_PROJECT_NAME` should remain port-scoped when using local helper
  scripts so Solid volumes and WebID/client credential URLs do not drift across
  port combinations.

Primary scripts:

- `npm run local:preflight` checks local configuration and port readiness.
- `npm run local:container` starts the Docker Compose local stack.
- `npm run local:host-solid` provisions containerized Solid for host-local app
  development.
- `npm run local:host-start` starts the host Node app using generated Solid
  settings.
- `npm run local:host-smoke` validates the host-local deployment.
- `npm run verify:deployment` validates live app, Solid access, and deployment
  surfaces.
- `npm run local:release-gate` runs the non-Docker localhost MVP gate.

When runtime source and browser behavior disagree, suspect a stale built
container or stale served asset first. Rebuild/recreate the PIM image and verify
served `app.js`, `styles.css`, `/healthz`, and representative API behavior.

## Epic SMART on FHIR workflow

- Epic integration is optional and must remain disabled by default for Solid-only
  local deployments.
- Sandbox/live Epic access requires registered `EPIC_FHIR_BASE_URL`,
  `EPIC_CLIENT_ID`, `EPIC_REDIRECT_URI`, and an encryption key for persisted
  grant material.
- Confidential Epic apps may require `EPIC_CLIENT_SECRET` or
  `EPIC_CLIENT_SECRET_FILE`; handle both without echoing the value.
- The SMART callback should complete into an owner-visible connection state,
  not expose raw authorization codes or tokens in UI output.
- Preview import is owner-reviewed. Apply must write only selected, mapped,
  reconciled candidates to the Solid Pod.
- FHIR source diagnostics are a first-class troubleshooting surface. Keep them
  PHI-safe and available to the UX/OpenAPI contract when previewing imports.

## Domain model and standards contract

The owner-facing health catalogue currently includes eleven domains:

- profiles
- conditions
- medications
- allergies
- immunizations
- vital-signs
- providers
- lab-results
- insurance-policies
- documents
- workflow-tasks

Maintain alignment among:

- TypeScript domain types;
- repository classes;
- ShEx schemas in `src/schemas/`;
- OpenAPI schemas/actions in `src/openapi.ts`;
- browser UI data-entry fields in `public/app.js`;
- terminology helpers for SNOMED CT, LOINC, RxNorm, RxTerms, MED-RT, CVX, and
  schema.org-oriented administrative data; and
- documentation under `docs/`.

If a field is added to a domain, update the relevant validation, UI, API docs,
tests, and documentation contract together.

## Validation expectations

Choose the smallest useful validation set for the change, then run broader
gates before release or merge.

Common checks:

- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`
- `npm run build`
- `npm run validate:openapi`
- `npm run validate:localhost-mvp`
- `npm run validate:wellness-seeds`
- `npm run validate:documentation-contracts`
- `npm run local:release-gate`

Live deployment checks require running infrastructure. For local release claims,
include evidence from `/healthz`, authenticated `podAccess`, representative
domain API access, served UI assets, and any relevant Epic/HealthKit status
endpoints. Do not treat process health alone as full deployment proof.

## Git workflow

- Check `git status --short` before editing.
- Preserve unrelated and user-owned work in the tree.
- Stage with explicit pathspecs. Avoid broad `git add .` when generated,
  credential, scratch, or unrelated files are present.
- Before commit/PR/merge, run appropriate validation and `git diff --check`.
- When asked for a full commit to PR to merge cycle, create a scoped branch,
  commit only relevant files, push, open a PR, verify mergeability/checks when
  possible, merge, return to `main`, pull/verify alignment, and report any
  caveats.

## Documentation workflow

Documentation should describe the current MVP truth, not aspirational behavior
unless clearly labeled as roadmap or future work. When documentation defines a
contract, keep it synchronized with JSON/OpenAPI/ShEx schemas and validation
scripts.

Good documentation updates should answer:

- what is owner-managed in the Pod;
- what is imported, projected, or anonymized;
- what local deployment mode is being described;
- which ports and environment variables control the workflow;
- how the user verifies success; and
- what remains out of scope for the localhost MVP.
