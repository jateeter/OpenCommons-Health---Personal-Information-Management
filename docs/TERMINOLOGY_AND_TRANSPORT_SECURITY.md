# Terminology, FHIR Coding, and transport security

This document describes the terminology controls used by OpenCommons Health PIM
for manual record entry and the expected security posture for information in
motion.

## Terminology systems in the UI

The browser UI provides searchable terminology helpers for common manual-entry
workflows. Each helper supports incremental type-ahead by either display name or
code.

| PIM domain | Terminology helper | Stored FHIR-style coding path |
|---|---|---|
| Conditions | SNOMED CT | `code.system`, `code.code`, `code.display` |
| Allergies and intolerances | SNOMED CT | `substance.system`, `substance.code`, `substance.display` |
| Medications | RxNorm, RxTerms, MED-RT | `medicationCode.system`, `medicationCode.code`, `medicationCode.display` |
| Vital signs | LOINC | `loincCode.system`, `loincCode.code`, `loincCode.display` plus the local vital-sign measurement selector |
| Laboratory results | LOINC | `code.system`, `code.code`, `code.display` |

The search lists are convenience subsets for pre-MVP manual entry. They do not
replace a production terminology server or exhaustive value-set expansion.
Manual entry remains available for codes that are not in the curated starter
lists.

## Required coding parameters

The PIM keeps coded clinical data aligned with the HL7/FHIR `Coding` pattern.
For every terminology-backed field, the required parameters are:

- `system`: the terminology system URI, such as `http://snomed.info/sct`,
  `http://loinc.org`, or the relevant NLM medication terminology URI;
- `code`: the code or concept identifier from that terminology;
- `display`: the human-readable display/name, stored when supplied.

`display` is strongly recommended for readability and operational review, even
when the repository schema allows it to be optional.

## HL7/FHIR storage validation posture

OpenCommons stores owner-managed personal health information in Solid as
RDF/Linked Data. The domain repositories validate data against ShEx schemas
before writing to the Pod. The schemas and UI fields intentionally preserve
FHIR-style coding triplets so that stored pod information can be mapped to the
corresponding HL7/FHIR resource concepts documented in
[`HL7_FHIR_ALIGNMENT.md`](HL7_FHIR_ALIGNMENT.md).

The application should be described as FHIR-aligned Solid storage, not as a
certified standalone FHIR server.

## Information in motion

The deployment expectation is:

- Production and non-local deployments must terminate HTTPS/TLS at the
  application ingress, reverse proxy, platform load balancer, or equivalent
  trusted boundary.
- Epic, SMART on FHIR, and other external clinical integrations must use HTTPS
  endpoints.
- Local development and visual-review deployments may use loopback HTTP on
  `localhost` ports because traffic is constrained to the developer machine and
  Docker-internal network.
- Container-to-container traffic in the local Docker Compose stack remains on
  the private Compose network.
- Secrets, tokens, raw clinical documents, and identifiable PHI must not be
  logged.
- Any future remote deployment guide must identify the TLS termination point and
  verify that owner-facing UI/API traffic and external integration traffic are
  encrypted in transit.

The anonymized release API remains the only intended non-owner release surface,
and it requires authenticated access, explicit owner approval, and a release
purpose.
