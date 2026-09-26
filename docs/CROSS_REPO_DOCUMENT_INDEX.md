# Cross-repository document index

Generated: 2026-08-09

Scope:

- OpenCommons Health PIM:
  `OpenCommons-Health---Personal-Information-Management`
- HealthKit bridge:
  `localHealthkitBridge`

This index covers tracked documentation, public HTML documents, operational
playbooks, roadmap documents, test/use-case documents, and tracked visual assets.
It intentionally excludes generated build outputs, dependency folders, runtime
logs, and local scratch files. In particular, `epic.txt` is not indexed because
it is an untracked local Epic scratch/credential-adjacent file.

## OpenCommons Health PIM documents

### Primary orientation and architecture

| Document | Audience | Purpose |
|---|---|---|
| [README.md](../README.md) | Developers, operators | Main project overview, architecture, local setup, health data catalogue, API/domain list, wellness landing description, and deployment/testing entry points. |
| [docs/EXECUTIVE_OVERVIEW.md](EXECUTIVE_OVERVIEW.md) | Executives, product stakeholders | Concise authority-level description of the app purpose, value proposition, stakeholders, core capabilities, and privacy/security posture. |
| [docs/APPLICATION_PURPOSE_AND_BENEFITS.md](APPLICATION_PURPOSE_AND_BENEFITS.md) | Executives, product stakeholders, patients | Definitive explanation of why the application exists, what it provides today, user benefits, and what it deliberately does not claim yet. |
| [docs/DEFINITIVE_MVP_DOCUMENTATION_CORPUS.md](DEFINITIVE_MVP_DOCUMENTATION_CORPUS.md) | Product, architecture, engineering, reviewers | Current documentation authority map, stale-context review, definitive contract set, and correction rules for future docs. |
| [docs/OPERATIONAL_STACK_DEPLOYMENT.md](OPERATIONAL_STACK_DEPLOYMENT.md) | Deployment architects, operators | Operational stack overview for local/container deployment, MVP boundary, and Epic-enabled target stack. |
| [docs/LOCALHOST_MVP_SCOPE.md](LOCALHOST_MVP_SCOPE.md) | Product, engineering | Defines the localhost-only MVP boundary, included/excluded scope, and non-iPad backlog. |
| [docs/LOCALHOST_MVP_DEPLOYMENT_ISSUES.md](LOCALHOST_MVP_DEPLOYMENT_ISSUES.md) | Engineering, release managers | Localhost MVP hardening issue notes for smoke automation, Epic diagnostics, owner-mediated import, and reconciliation status. |

### Patient, legal, and public-facing documents

| Document | Audience | Purpose |
|---|---|---|
| [docs/PATIENT_GUIDE_OPENCOMMONS_HEALTH_PIM.md](PATIENT_GUIDE_OPENCOMMONS_HEALTH_PIM.md) | Patients / pod owners | Patient-focused guide to opening the app, reviewing the Solid Pod panel, adding records, and understanding information workflows. |
| [docs/END_USER_EPIC_WORKFLOWS.md](END_USER_EPIC_WORKFLOWS.md) | Patients / pod owners | End-user guide for Epic/MyChart connection, stored vs non-released information, Medicare Wellness updates, documents/messages, and troubleshooting. |
| [public/terms.html](../public/terms.html) | End users, Epic registration reviewers | HTML Terms and Conditions for local/container/iPhone app surfaces. |
| [public/data-disclosure.html](../public/data-disclosure.html) | End users, Epic registration reviewers | HTML data and information disclosure statement describing processed information, release posture, and consent boundaries. |
| [public/index.html](../public/index.html) | End users, UI reviewers | Main single-page application shell for Wellness, Records, and Pod status views. |
| [public/api-docs.html](../public/api-docs.html) | Developers, integrators | Browser-rendered OpenAPI/action documentation surface. |

### Standards, terminology, privacy, and validation

| Document | Audience | Purpose |
|---|---|---|
| [docs/HL7_FHIR_ALIGNMENT.md](HL7_FHIR_ALIGNMENT.md) | Standards reviewers, developers | HL7/FHIR reference model, domain-to-FHIR mapping, owner-held PHI schema posture, anonymized release contract, and validation obligations. |
| [docs/TERMINOLOGY_AND_TRANSPORT_SECURITY.md](TERMINOLOGY_AND_TRANSPORT_SECURITY.md) | Developers, security/standards reviewers | Terminology systems in the UI, required FHIR Coding parameters, FHIR storage validation posture, and transport encryption/security posture. |
| [docs/NINE_WELLNESS_PILLAR_SEEDS.md](NINE_WELLNESS_PILLAR_SEEDS.md) | Developers, QA, demo operators | Human-readable guide to the synthetic nine-pillar seed bundle, modal seeds, saved-record payloads, validation, and safety notes. |
| [fixtures/wellness-pillar-seeds.json](../fixtures/wellness-pillar-seeds.json) | QA, automation, demo operators | Machine-readable synthetic seed records for the nine wellness pillars. Includes modal-entry fields and saved payloads. |

### JSON Schema documentation contracts

| Contract | Audience | Purpose |
|---|---|---|
| [docs/contracts/mvp-surface-contract.schema.json](contracts/mvp-surface-contract.schema.json) | Architecture, QA, release reviewers | Machine-readable contract for current MVP deployment posture, UI surfaces, domain APIs, integration boundaries, and privacy constraints. |
| [docs/contracts/domain-records.schema.json](contracts/domain-records.schema.json) | API consumers, QA, fixture authors | Machine-readable contract for owner-approved record payloads across all 11 MVP domains. |
| [docs/contracts/owner-mediated-workflows.schema.json](contracts/owner-mediated-workflows.schema.json) | Product, QA, integration developers | Machine-readable contract for manual entry, wellness summary, Epic preview/apply, HealthKit status, and Pod activity workflows. |

### Wellness UI, scoring, and domain UX

| Document | Audience | Purpose |
|---|---|---|
| [docs/WELLNESS_LANDING_SCORING.md](WELLNESS_LANDING_SCORING.md) | Developers, UX/product reviewers | Wellness landing view model, axis vs browse domains, score/status model, and domain-specific scoring behavior. |
| [docs/SEMANTIC_GRAPH_CONTRACT.md](SEMANTIC_GRAPH_CONTRACT.md) | Browser/mobile UX developers, QA | Versioned semantic graph contract for all 11 domains, Vitals parity, terminology hooks, and mobile consumption guidance. |
| [docs/MVP_11_DOMAIN_UI_ROADMAP.md](MVP_11_DOMAIN_UI_ROADMAP.md) | Product, UX, engineering | Roadmap and implemented MVP slice for first-class 11-domain UI navigation and workflow behavior. |
| [docs/POD_MANAGEMENT_UX_FINAL_UPDATE.md](POD_MANAGEMENT_UX_FINAL_UPDATE.md) | Product, UX, engineering | Final update for owner-facing Pod management UX, local MVP posture, deployment contract, and next focus. |
| [docs/PRE_MVP_VISUAL_REVIEW_STARTUP.md](PRE_MVP_VISUAL_REVIEW_STARTUP.md) | Demo operators, reviewers | Startup workflow and configuration for pre-MVP local visual review. |

### Epic integration and release history

| Document | Audience | Purpose |
|---|---|---|
| [docs/EPIC_INTEGRATION_ROADMAP.md](EPIC_INTEGRATION_ROADMAP.md) | Product, integration architects, developers | Roadmap for Epic SMART/FHIR integration, reference architecture, integration lanes, Medicare Wellness workflow, and future-cycle issues. |
| [docs/EPIC_PERSONAL_DATA_CONFIGURATION.md](EPIC_PERSONAL_DATA_CONFIGURATION.md) | Developers, local operators | Safe sample configuration guidance for Epic personal health data integration, identity model, local Solid identity, and secret handling. |
| [docs/EPIC_MVP_IMPLEMENTATION_LOG_2026-07-13.md](EPIC_MVP_IMPLEMENTATION_LOG_2026-07-13.md) | Release reviewers, developers | Implementation log summarizing completed Epic MVP scope, API surface, and validation outcomes as of 2026-07-13. |
| [docs/MVP_RELEASE_EVIDENCE_2026-07-14.md](MVP_RELEASE_EVIDENCE_2026-07-14.md) | Release reviewers, QA | Localhost MVP release evidence including publication, release gate, and container-local deployment evidence. |

### Test and use-case documents

| Document | Audience | Purpose |
|---|---|---|
| [tests/e2e/playwright/medicare-wellness-evaluation.md](../tests/e2e/playwright/medicare-wellness-evaluation.md) | QA, automation engineers | Playwright E2E use case for Annual Medicare Wellness Evaluation update, including preconditions, scenario, and command. |

### Tracked visual documentation assets

These screenshots support the patient guide and UI workflow documentation.

| Asset | Purpose |
|---|---|
| [docs/assets/patient-pim-workflows/01-health-overview.png](assets/patient-pim-workflows/01-health-overview.png) | Health overview / wellness landing screenshot. |
| [docs/assets/patient-pim-workflows/02-pod-management.png](assets/patient-pim-workflows/02-pod-management.png) | Pod management screenshot. |
| [docs/assets/patient-pim-workflows/03-add-condition-snomed.png](assets/patient-pim-workflows/03-add-condition-snomed.png) | Add Condition SNOMED workflow screenshot. |
| [docs/assets/patient-pim-workflows/04-add-medication-rxnorm.png](assets/patient-pim-workflows/04-add-medication-rxnorm.png) | Add Medication RxNorm workflow screenshot. |
| [docs/assets/patient-pim-workflows/05-add-lab-result-loinc.png](assets/patient-pim-workflows/05-add-lab-result-loinc.png) | Add Lab Result LOINC workflow screenshot. |
| [docs/assets/patient-pim-workflows/06-add-document-loinc.png](assets/patient-pim-workflows/06-add-document-loinc.png) | Add Document LOINC workflow screenshot. |
| [docs/assets/patient-pim-workflows/07-add-workflow-task-snomed.png](assets/patient-pim-workflows/07-add-workflow-task-snomed.png) | Add Workflow Task SNOMED workflow screenshot. |
| [docs/assets/patient-pim-workflows/08-local-api-docs.png](assets/patient-pim-workflows/08-local-api-docs.png) | Local API documentation screenshot. |

## localHealthkitBridge documents

### Canonical bridge documentation

| Document | Audience | Purpose |
|---|---|---|
| [localHealthkitBridge/README.md](../../localHealthkitBridge/README.md) | iOS developers, integration engineers | Main HealthKit bridge guide covering architecture, iOS app setup, capabilities, privacy strings, authorization, and normalization tables. |
| [localHealthkitBridge/ROADMAP.md](../../localHealthkitBridge/ROADMAP.md) | Product, engineering | MVP roadmap for the HealthKit bridge, including current state, contract drift, MVP definition, and milestones M0-M6. |
| [localHealthkitBridge/docs/INGEST_CONTRACT.md](../../localHealthkitBridge/docs/INGEST_CONTRACT.md) | Cross-repo developers, PE runtime owners | Canonical HealthKit ingest contract for request body, authentication, mapping resolution, status, and validation responsibilities. |
| [localHealthkitBridge/docs/MIRROR_CONTRACT.md](../../localHealthkitBridge/docs/MIRROR_CONTRACT.md) | PIM and bridge developers | **Single source of truth for the HealthKit → PIM → POD mirror**: the bridge calls this PIM's `/api/integrations/healthkit/*` routes, and PIM writes the owner POD. It covers runtime-declared metrics, the owner-approved set (add/lock/remove, generation), rule-based pillar storage, per-batch owner approval, and reconciliation in which the POD wins. |
| [localHealthkitBridge/docs/MOBILE_SOLID_PHASE0_COMPATIBILITY.md](../../localHealthkitBridge/docs/MOBILE_SOLID_PHASE0_COMPATIBILITY.md) | Mobile/PIM integration developers | Phase 0 compatibility spike for SolidAuthSwift/SolidResourcesSwift, iPhone local Solid capability, and acceptance checks. Its in-app CSS mirroring is superseded by MIRROR_CONTRACT.md (the bridge mirrors through PIM). |

### Local agent/codebase guidance

| Document | Audience | Purpose |
|---|---|---|
| [localHealthkitBridge/AGENTS.md](../../localHealthkitBridge/AGENTS.md) | Codex / agentic development | Repo-specific Codex guidance: role, development rules, bug triage, verification commands, and artifact hygiene. |
| [localHealthkitBridge/CLAUDE.md](../../localHealthkitBridge/CLAUDE.md) | Developers, agentic coding tools | Current codebase map, key commands, and contract rules for the HealthKit bridge. |

### Vendored/reference documents

| Document | Audience | Purpose |
|---|---|---|
| [localHealthkitBridge/Experiments/Vendor/SolidAuthSwift/README.md](../../localHealthkitBridge/Experiments/Vendor/SolidAuthSwift/README.md) | iOS Solid developers | Vendored SolidAuthSwift reference README, including tested matrix and SolidAuthSwiftUI usage example. |
| [localHealthkitBridge/Experiments/Vendor/SolidAuthSwift/VERSIONS.txt](../../localHealthkitBridge/Experiments/Vendor/SolidAuthSwift/VERSIONS.txt) | Dependency maintainers | Vendored SolidAuthSwift version/provenance notes. |
| [localHealthkitBridge/Experiments/Vendor/serd-parser/README.md](../../localHealthkitBridge/Experiments/Vendor/serd-parser/README.md) | RDF/parser experiment maintainers | Vendored serd-parser README for experimental Solid/RDF parsing work. |

## Cross-repo reading paths

### New developer onboarding

1. [Application purpose and benefits](APPLICATION_PURPOSE_AND_BENEFITS.md)
2. [Definitive MVP documentation corpus](DEFINITIVE_MVP_DOCUMENTATION_CORPUS.md)
3. [OpenCommons Health PIM README](../README.md)
4. [Operational stack deployment overview](OPERATIONAL_STACK_DEPLOYMENT.md)
5. [localHealthkitBridge README](../../localHealthkitBridge/README.md)
6. [HealthKit ingest contract](../../localHealthkitBridge/docs/INGEST_CONTRACT.md)

### Local demo / visual review

1. [Pre-MVP local visual review startup](PRE_MVP_VISUAL_REVIEW_STARTUP.md)
2. [Patient guide](PATIENT_GUIDE_OPENCOMMONS_HEALTH_PIM.md)
3. [Nine wellness pillar seed data](NINE_WELLNESS_PILLAR_SEEDS.md)
4. [Wellness landing scoring](WELLNESS_LANDING_SCORING.md)

### Standards and interoperability review

1. [Definitive MVP documentation corpus](DEFINITIVE_MVP_DOCUMENTATION_CORPUS.md)
2. [HL7/FHIR alignment and PHI privacy controls](HL7_FHIR_ALIGNMENT.md)
3. [Terminology, FHIR Coding, and transport security](TERMINOLOGY_AND_TRANSPORT_SECURITY.md)
4. [Domain record JSON Schema](contracts/domain-records.schema.json)
5. [HealthKit ingest contract](../../localHealthkitBridge/docs/INGEST_CONTRACT.md)
6. [Mobile Solid Phase 0 compatibility spike](../../localHealthkitBridge/docs/MOBILE_SOLID_PHASE0_COMPATIBILITY.md)

### Epic and annual wellness workflow planning

1. [Epic integration roadmap](EPIC_INTEGRATION_ROADMAP.md)
2. [End-user Epic workflows](END_USER_EPIC_WORKFLOWS.md)
3. [Epic personal health data configuration](EPIC_PERSONAL_DATA_CONFIGURATION.md)
4. [Annual Medicare Wellness Playwright use case](../tests/e2e/playwright/medicare-wellness-evaluation.md)

## Maintenance notes

- Update this index whenever adding, renaming, or deleting docs in either repo.
- Keep credential-bearing local scratch files out of this index.
- For HealthKit ingest behavior, treat
  [localHealthkitBridge/docs/INGEST_CONTRACT.md](../../localHealthkitBridge/docs/INGEST_CONTRACT.md)
  as canonical and mirror contract changes across the affected PE runtimes.
