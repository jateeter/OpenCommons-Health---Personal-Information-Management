# Definitive MVP documentation corpus and authority review

Generated: 2026-08-09

This document is the current documentation authority map for the OpenCommons
Health PIM localhost/container MVP and its companion `localHealthkitBridge`
repository. It consolidates the application documentation around the current
implementation state and explicitly marks older material that should be read as
history, roadmap, or non-authoritative context.

## Current MVP truth

The current application MVP is:

- a localhost/container OpenCommons Health PIM web application;
- backed by a local Solid Community Server;
- using the authenticated owner Solid Pod as the source of authority for stored
  application data;
- exposing a browser UI with Wellness, Records, and Pod status/connection views;
- exposing CRUD APIs for 11 owner-controlled domains;
- using nine core wellness pillars as the primary health catalogue subset;
- storing coded clinical data with FHIR-style `Coding` objects where relevant;
- keeping Epic optional and disabled by default, with deterministic mock mode
  and configured sandbox/production readiness paths;
- surfacing HealthKitBridge state as metadata/status only in the PIM;
- keeping native iPad/iPhone packaging, outbound Epic writeback, public hosted
  deployment, and production customer activation outside the MVP release
  contract.

## Definitive contracts

The following files are the normative MVP contract set:

| Contract | Authority |
|---|---|
| [`docs/contracts/mvp-surface-contract.schema.json`](contracts/mvp-surface-contract.schema.json) | Locks the localhost/container deployment posture, UI surfaces, domain list, integration posture, and privacy constraints. |
| [`docs/contracts/domain-records.schema.json`](contracts/domain-records.schema.json) | Defines the JSON shape for current owner-approved records across all 11 MVP domains. |
| [`docs/contracts/owner-mediated-workflows.schema.json`](contracts/owner-mediated-workflows.schema.json) | Defines the owner-mediated workflow posture for manual entry, wellness summary, Epic preview/apply, HealthKit status, and Pod activity views. |
| [`src/openapi.ts`](../src/openapi.ts) and `/openapi.json` at runtime | Source and served OpenAPI/API-action contract for HTTP operations. |
| [`src/schemas/*.shex`](../src/schemas) | RDF/Turtle Shape Expressions used to validate Solid Pod storage shape. |
| [`fixtures/wellness-pillar-seeds.json`](../fixtures/wellness-pillar-seeds.json) | Synthetic nine-pillar seed data for modal entry and saved payload review. |
| [`../localHealthkitBridge/docs/INGEST_CONTRACT.md`](../../localHealthkitBridge/docs/INGEST_CONTRACT.md) | Canonical HealthKitBridge to Perception Engine ingest contract. |

## Definitive prose corpus

Read these as the best current prose compilation of the application:

| Document | Status | Purpose |
|---|---|---|
| [`README.md`](../README.md) | Current overview | Main developer/operator entry point. Some historical test counts and examples may lag current CI; prefer live command output for counts. |
| [`docs/EXECUTIVE_OVERVIEW.md`](EXECUTIVE_OVERVIEW.md) | Current executive framing | Best executive-level application overview and MVP boundary. |
| [`docs/APPLICATION_PURPOSE_AND_BENEFITS.md`](APPLICATION_PURPOSE_AND_BENEFITS.md) | Current purpose statement | Concise reason-for-existence and benefits summary. |
| [`docs/OPERATIONAL_STACK_DEPLOYMENT.md`](OPERATIONAL_STACK_DEPLOYMENT.md) | Current deployment framing | Current local/container stack and Epic-enabled target deployment overview. |
| [`docs/LOCALHOST_MVP_SCOPE.md`](LOCALHOST_MVP_SCOPE.md) | Current scope authority | Best statement of what is in and out of the current MVP. |
| [`docs/HL7_FHIR_ALIGNMENT.md`](HL7_FHIR_ALIGNMENT.md) | Current standards posture | Domain-to-FHIR and privacy alignment. |
| [`docs/TERMINOLOGY_AND_TRANSPORT_SECURITY.md`](TERMINOLOGY_AND_TRANSPORT_SECURITY.md) | Current terminology/security posture | Terminology systems, Coding requirements, and local transport caveats. |
| [`docs/WELLNESS_LANDING_SCORING.md`](WELLNESS_LANDING_SCORING.md) | Current UI scoring contract | Wellness graph/domain scoring behavior. |
| [`docs/NINE_WELLNESS_PILLAR_SEEDS.md`](NINE_WELLNESS_PILLAR_SEEDS.md) | Current seed-data guide | Synthetic nine-pillar seed documentation. |
| [`docs/CROSS_REPO_DOCUMENT_INDEX.md`](CROSS_REPO_DOCUMENT_INDEX.md) | Current index | Cross-repo document inventory and reading paths. |

## Current status by application surface

| Surface | Current authoritative status | Notes |
|---|---|---|
| Localhost/container deployment | In MVP scope | Host-local and Docker Compose paths are the happy paths. Ports are configurable; current review deployment commonly uses PIM `18080` and CSS `13000`. |
| Local Solid Community Server | In MVP scope | Included in local deployment; authenticated Pod access is a readiness requirement. |
| Browser UI | In MVP scope | Wellness, Records, and Pod status views are current MVP surfaces. |
| Domain APIs | In MVP scope | All 11 domains are visible and API-backed: the nine wellness pillars plus documents and workflow tasks. |
| Nine wellness pillars | In MVP scope | Primary health catalogue subset; seed bundle and modal terminology support exist. |
| Documents and workflow tasks | In MVP scope as local domains | They are first-class local PIM domains, but not a complete Epic document/message/writeback integration. |
| Epic integration | Optional, owner-mediated, not required for MVP startup | Mock mode and configured SMART/FHIR paths exist. Live personal Epic data requires valid registration, redirect, scopes, and health-system authorization. |
| Epic outbound writeback | Out of MVP scope | No provider messaging, task updates, or clinical writeback should be represented as available. |
| HealthKitBridge in PIM | Metadata/status only | The PIM must not expose raw HealthKit samples. Native bridge behavior is governed by `localHealthkitBridge`. |
| Native iPad/iPhone PIM deployment | Future work | iPhone HealthKitBridge UX exists in the companion repo, but native PIM/iPad packaging is not part of the localhost/container MVP. |
| Public hosted deployment | Future work | DNS-visible HTTPS, production secrets, backups, observability, and incident procedures remain hosted-deployment tasks. |

## Findings: stale or context-sensitive corpus areas

| Area | Risk | Current interpretation |
|---|---|---|
| Historical release logs under `docs/*IMPLEMENTATION_LOG*` and `docs/*RELEASE_EVIDENCE*` | They contain older branch names, ports, test counts, and moment-in-time limitations. | Treat as evidence snapshots, not current readiness claims. |
| References to "nine pre-decision domain APIs" in older Epic/release material | The app now exposes 11 MVP domains. | Use "nine wellness pillars" only for the health catalogue subset; use "11 domain APIs" for current API/UI scope. |
| Epic roadmap documents | They include future live, sandbox, document/workflow, and production aspirations. | Current MVP includes local connector foundation and owner-mediated preview/apply; live Epic personal data remains configuration- and authorization-dependent. |
| Mobile/iPhone/Solid compatibility documents | They describe companion bridge/mobile experiments and validated or planned native UX paths. | Keep them separate from PIM MVP. Do not treat native iPad/iPhone PIM deployment as completed MVP scope. |
| Public HTML legal/disclosure pages | They are suitable development/registration documents but explicitly say they are not final production legal policy. | Keep legal review as a production gate. |
| README test-count examples | Counts may lag as tests are added. | Prefer live CI/local command output for authoritative counts. |
| Local port examples | Different docs use historical ports from prior evidence runs. | Treat port examples as examples only. The contract requires configurable ports; current Docker-local review commonly uses `APP_PORT=18080`, `CSS_PORT=13000`. |

## Required correction rules for future documentation

1. Use **11 domain APIs** for the current app surface.
2. Use **nine wellness pillars** for the core health catalogue subset.
3. Do not imply live Epic access works without real Epic registration,
   configured redirect URI, approved scopes, and successful owner authorization.
4. Do not imply outbound Epic writeback, provider messaging, or task update
   writeback is implemented.
5. Do not imply native iPad/iPhone PIM deployment is part of the current MVP.
6. Do not expose Epic credentials, Solid credentials, tokens, client secrets,
   raw HealthKit samples, or identifiable resource URLs in public/status/
   anonymized surfaces.
7. Treat `/livez` as process liveness only; authenticated Pod readiness requires
   `/healthz`, `/api/status`, or a representative Pod-backed operation.
8. Keep HealthKitBridge details anchored to
   `localHealthkitBridge/docs/INGEST_CONTRACT.md`.

## JSON Schema use

The schema files in `docs/contracts/` should be used for documentation review,
fixtures, integration planning, and future contract tests:

- use `mvp-surface-contract.schema.json` to review whether a deployment or
  release note claims capabilities outside the current MVP;
- use `domain-records.schema.json` to keep examples and fixtures aligned with
  the 11 domain payload shapes;
- use `owner-mediated-workflows.schema.json` to ensure data movement is modeled
  as owner-approved, local-first, and privacy-constrained.

## Recommended corpus reading order

1. [`docs/APPLICATION_PURPOSE_AND_BENEFITS.md`](APPLICATION_PURPOSE_AND_BENEFITS.md)
2. [`docs/EXECUTIVE_OVERVIEW.md`](EXECUTIVE_OVERVIEW.md)
3. [`docs/LOCALHOST_MVP_SCOPE.md`](LOCALHOST_MVP_SCOPE.md)
4. [`docs/OPERATIONAL_STACK_DEPLOYMENT.md`](OPERATIONAL_STACK_DEPLOYMENT.md)
5. [`docs/HL7_FHIR_ALIGNMENT.md`](HL7_FHIR_ALIGNMENT.md)
6. [`docs/TERMINOLOGY_AND_TRANSPORT_SECURITY.md`](TERMINOLOGY_AND_TRANSPORT_SECURITY.md)
7. [`docs/NINE_WELLNESS_PILLAR_SEEDS.md`](NINE_WELLNESS_PILLAR_SEEDS.md)
8. [`docs/CROSS_REPO_DOCUMENT_INDEX.md`](CROSS_REPO_DOCUMENT_INDEX.md)
