# Executive overview: OpenCommons Health PIM

## Document status

This is the executive-level document of record for the OpenCommons Health
Personal Information Management application in this repository. It summarizes
the application purpose, operating model, privacy posture, standards alignment,
deployment approach, and near-term integration roadmap.

## Application purpose

OpenCommons Health PIM is a privacy-first personal health information
management application. Its purpose is to let an individual maintain a personal
health record that is owned by the authenticated person and stored in that
person's Solid Pod.

The system is designed around a simple governance principle:

> Identifiable personal health information belongs under the control of the
> authenticated Pod owner. External release is anonymized-only, authenticated,
> explicitly owner-approved, and purpose-bound.

## Executive value proposition

OpenCommons Health PIM provides a standards-aligned foundation for patient-owned
health data management:

- gives patients a local, owner-managed health record;
- uses Solid Pods for personal data ownership and access control;
- models health information with RDF/Linked Data and ShEx validation;
- aligns domain records with HL7/FHIR resource concepts;
- exposes OpenAPI/Swagger documentation for application and integration teams;
- supports repeatable local deployment in both container and host-local modes;
- establishes an anonymized release boundary for non-owner data sharing;
- provides a roadmap for Epic/MyChart integration through SMART on FHIR and
  FHIR-based data, document, messaging, and workflow APIs.

## Users and stakeholders

| Stakeholder | Interest |
|---|---|
| Patient / Pod owner | Owns, reviews, updates, and controls personal health information. |
| Care partner or caregiver | May assist the patient only under patient-approved access patterns. |
| Developer / integrator | Uses OpenAPI, FHIR mappings, and deployment contracts to build integrations. |
| Healthcare organization | Can connect through standards-based workflows without becoming the owner of the local PIM data. |
| Research or reporting consumer | Receives only anonymized, owner-approved, purpose-bound data. |

## Core application capabilities

The current application supports nine personal health information domains:

| Domain | Primary standards alignment |
|---|---|
| Personal profile | FHIR `Patient` |
| Conditions | FHIR `Condition`, SNOMED CT |
| Medications | FHIR `MedicationStatement` / medication concepts, RxNorm |
| Allergies and intolerances | FHIR `AllergyIntolerance`, SNOMED CT |
| Immunizations | FHIR `Immunization`, CVX |
| Vital signs | FHIR `Observation`, vital-sign profile intent |
| Providers | FHIR `PractitionerRole` / care team concepts |
| Laboratory results | FHIR `Observation`, LOINC |
| Insurance policies | FHIR `Coverage` |

For each supported domain, the application provides:

- browser-based create, read, update, and delete actions;
- Solid-backed persistence;
- ShEx schema validation before pod writes;
- TypeScript repository logic;
- REST domain APIs under `/api/resources/:domain`;
- OpenAPI/Swagger documentation;
- anonymized release mappings where downstream release is permitted.

## Privacy and security posture

The application's privacy model is intentionally conservative:

- identifiable personal health information is available only through
  authenticated owner-facing access;
- anonymized release requires an authenticated session, explicit owner approval,
  and a declared release purpose;
- direct identifiers, exact dates, record URLs, member IDs, provider IDs,
  document source references, and free-text notes are excluded from anonymized
  release payloads;
- health checks validate authenticated Pod access, not merely process uptime;
- broad error handling has been narrowed so authentication, authorization,
  network, parsing, validation, conflict, and not-found failures remain
  distinguishable.

This posture supports patient control while still allowing carefully governed
secondary use of anonymized information.

## Standards alignment

OpenCommons Health PIM is standards-aligned rather than a replacement for a
certified electronic health record.

The application currently aligns with:

- Solid and Solid-OIDC for personal data storage and access control;
- RDF/Turtle and Linked Data for stored health records;
- ShEx for schema validation;
- HL7/FHIR resource concepts for health domain mapping;
- FHIR `CapabilityStatement` style metadata through `/fhir/metadata`;
- OpenAPI 3.1 through `/openapi.json` and `/swagger.json`;
- SMART on FHIR as the planned authorization pattern for Epic/MyChart
  integration.

The PIM stores owner-controlled records in Solid. It does not claim that the
local Solid Pod is itself a full certified FHIR server. Instead, it exposes a
FHIR-aligned capability surface and maps local PIM domains to the relevant FHIR
resource concepts for interoperability planning.

## Deployment model

The current MVP is restricted to localhost deployment on a personally
controlled notebook or developer workstation. Native iPad/iPhone deployment is
on hold for a future implementation phase.

The repository supports two local deployment modes.

| Mode | Description | Primary use |
|---|---|---|
| Container deployment | PIM and Solid Community Server run through Docker Compose with persistent volumes and bootstrap automation. | Repeatable full-stack local deployment. |
| Host-local deployment | PIM runs directly on the host while Solid Community Server remains containerized. | Active application and UI development. |

Both deployment modes are designed around configurable ports and repeatable
validation. The current operational contract includes:

- PIM browser UI;
- Solid Community Server;
- authenticated Pod bootstrap;
- persistent local Solid storage;
- OpenAPI/Swagger documentation;
- FHIR metadata and privacy schema endpoints;
- deployment verification for all nine domain APIs.

The localhost-only MVP boundary is documented in
[`LOCALHOST_MVP_SCOPE.md`](./LOCALHOST_MVP_SCOPE.md). Mobile/native packaging,
embedded iPad pod storage, and mobile SMART redirect handling are not part of
the current MVP release bar.

## Epic integration direction

The next development cycle should integrate Epic data streams and workflows
without weakening the local ownership boundary.

The recommended direction is:

1. Use SMART on FHIR / OAuth for Epic authorization.
2. Keep Solid authentication and Epic authorization as separate trust domains.
3. Import only patient-approved FHIR resources into the owner's Solid Pod.
4. Preserve source provenance for imported records.
5. Add patient-facing preview and reconciliation before writing imported Epic
   data to the Pod.
6. Implement document management around FHIR `DocumentReference` and `Binary`.
7. Implement messaging and workflow as read-only first, using supported FHIR
   resources such as `Communication`, `Task`, `ServiceRequest`,
   `Questionnaire`, and `QuestionnaireResponse`.
8. Treat outbound Epic writes as a later, site-specific capability requiring
   explicit policy, audit, and rollback controls.

The Annual Medicare Wellness Evaluation is the anchor use case for the first
Epic-enabled workflow. That use case should update profile, conditions,
medications, allergies, immunizations, vitals, labs, insurance, documents, and
preventive-care workflow state after patient review.

The current implementation includes the local Epic connector foundation,
deterministic mock mode, SMART discovery, PKCE authorization request generation,
token exchange, refresh handling, patient-scoped FHIR reads, and pod-owned
encrypted grant storage. Live Epic access still depends on approved Epic
registration values, requested scopes, redirect URI acceptance, and the target
Epic/MyChart organization.

## Validation and quality posture

The current validation approach includes:

- TypeScript type checking;
- unit tests for repositories, schemas, authentication, pod client behavior, and
  HTTP routes;
- schema validation tests;
- OpenAPI contract validation;
- deployment verification against local Solid infrastructure;
- Playwright-oriented end-to-end automation for the Medicare Wellness Evaluation
  roadmap use case.

The intended release bar is not just that the process starts. A valid local
deployment must prove that the UI, OpenAPI documentation, authenticated Pod
access, schema validation, all nine domain APIs, FHIR metadata, privacy schema,
and anonymized release controls operate together.

## Current maturity

The application is ready as a local, Solid-backed PIM foundation with validated
domain APIs and a browser UI. It is not yet a production Epic integration.

Current strengths:

- repeatable local deployment;
- complete nine-domain CRUD surface;
- schema-backed Solid persistence;
- OpenAPI/Swagger documentation;
- FHIR alignment artifacts;
- anonymized release controls;
- clear Epic integration roadmap;
- localhost Epic connector foundation with mock and SMART token-exchange paths.

Current next-cycle priorities:

- preserve the localhost-only MVP scope and keep native/iPad work parked;
- harden container-local and host-local deployment validation;
- add Epic connector health checks that do not require live credentials in CI;
- build import preview and reconciliation;
- add document and workflow repositories;
- implement Medicare Wellness Evaluation E2E workflow;
- harden audit logging and token/secret handling;
- pilot against Epic sandbox data before any customer environment.

## Executive conclusion

OpenCommons Health PIM is positioned as a patient-owned health information hub:
local-first, standards-aligned, privacy-preserving, and integration-ready. The
application already establishes the core Solid-backed PIM, domain APIs,
validation, deployment, and anonymized release architecture. The next
development cycle should focus on Epic/MyChart interoperability through SMART on
FHIR, starting with patient-mediated import and the Annual Medicare Wellness
Evaluation workflow.
