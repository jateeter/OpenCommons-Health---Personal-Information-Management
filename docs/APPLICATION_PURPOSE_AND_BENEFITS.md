# Application purpose and benefits

## Why OpenCommons Health PIM exists

OpenCommons Health PIM exists to give an individual a private, local-first way
to collect, review, and manage personal health information without making a
centralized application database the primary source of truth. The application
places the authenticated owner-controlled Solid Pod at the center of the
information architecture. The browser application, local APIs, Epic connector
foundation, HealthKitBridge observability, and future device integrations are
all clients or projections around that Pod; they are not replacements for owner
authority.

The practical problem is simple: personal health data is fragmented across
clinical portals, devices, insurers, documents, provider directories, and
manual notes. Most systems either trap that data in institutional silos or
aggregate it into centralized services the individual does not fully control.
OpenCommons Health PIM is designed around a different posture: the owner keeps
their own structured health record locally, encoded with interoperable health
standards, and decides what is imported, reviewed, updated, shared, or withheld.

## What the application provides today

The current MVP provides a localhost/container application that runs on a
personally controlled notebook or workstation. It includes:

- a browser UI for Wellness, Records, and Pod status;
- a local Solid Community Server deployment;
- authenticated Pod-backed readiness checks;
- CRUD workflows for 11 owner-controlled domains;
- nine core wellness pillars for the primary health catalogue;
- FHIR-style coded health records using SNOMED CT, RxNorm, CVX, LOINC, and
  schema.org-aligned structures;
- a wellness summary that reports status and counts without exposing underlying
  record values;
- owner-visible Pod activity and HealthKitBridge mirror/status observability;
- an optional Epic SMART/FHIR connector foundation with deterministic mock mode,
  diagnostics, owner preview, reconciliation, and selected-domain apply.

## Benefits for the individual

### 1. Local ownership and control

The individual keeps the authoritative record in their own Solid Pod. The app
does not require a public hosted account or centralized database for the MVP
workflow. This reduces the exposure pattern that normally comes from syncing
personal health information into a vendor-controlled cloud database.

### 2. Clear consent before data movement

The application is designed around owner-mediated workflows. Manual entries are
reviewed before save. Epic imports are previewed and selected before Pod writes.
HealthKitBridge data is surfaced in the PIM as status/metadata unless the owner
approves a future resource workflow. This keeps the owner in the loop when
health data moves.

### 3. Interoperable structure

The PIM stores health records in domain models aligned with common healthcare
standards. Conditions and allergies use SNOMED CT. Medications use RxNorm.
Immunizations use CVX. Vitals and labs use LOINC. This improves future
portability, validation, and mapping to HL7 FHIR-style exchanges.

### 4. Safer summaries

The wellness landing view is intentionally a summary surface. It helps the
owner see where records are present, stale, or need review without turning the
landing page into a PHI disclosure surface. Detailed values remain in the
owner-controlled record views.

### 5. Reduced integration risk

External integrations are optional. Epic is disabled by default and can run in
mock mode for repeatable local validation. Live Epic access requires real app
registration, approved scopes, and owner authorization. HealthKitBridge behavior
is separated into a companion native bridge contract. This separation prevents
the local MVP from depending on live clinical credentials or device permissions
to function.

### 6. Better development and auditability

The application includes explicit contract documents, OpenAPI/API docs, ShEx
storage schemas, JSON Schema documentation contracts, synthetic seed records,
and repeatable local/container checks. This makes the system easier to review,
test, extend, and explain before any hosted or production deployment is
attempted.

## What the application deliberately does not claim yet

The MVP is not a production clinical system, not medical advice, not a public
hosted service, and not an Epic production integration. It does not perform
outbound Epic writeback, provider messaging, clinical task updates, emergency
monitoring, or native iPad/iPhone PIM deployment as part of the current release
contract. Those require additional site-specific, security, legal, operational,
and user-experience work.

## Strategic value

OpenCommons Health PIM creates a foundation for patient-controlled health data
management that can grow toward real clinical interoperability without
abandoning local ownership. Its value is not merely that it can import or enter
health records; its value is that it makes the owner-controlled Pod the
authority, keeps integrations optional and reviewable, and uses standards-based
data structures so the owner’s record can become more useful over time.
