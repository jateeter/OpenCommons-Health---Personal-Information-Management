# HL7/FHIR alignment and PHI privacy controls

OpenCommons Health PIM stores personal health information in Solid pods owned
and managed by the authenticated pod owner. The application is not an Epic
MyChart clone and does not claim Epic certification. It follows the same broad
patient-portal interoperability pattern: patient-centered data access, explicit
security boundaries, standards-based resource mapping, and ongoing validation.

## HL7 and FHIR reference model

- HL7 is the healthcare standards organization whose FHIR specification defines
  resource-based healthcare data exchange.
- FHIR resources provide the interoperability vocabulary used by this PIM. The
  relevant OpenCommons domains map to FHIR resources such as `Patient`,
  `Condition`, `MedicationStatement`, `AllergyIntolerance`, `Immunization`,
  `Observation`, `PractitionerRole`, and `Coverage`.
- A FHIR `CapabilityStatement` documents the implementation capabilities of a
  server or client, including supported resources, formats, security, and REST
  interactions. OpenCommons exposes a CapabilityStatement-style artifact at
  `GET /fhir/metadata`.
- FHIR supports JSON, XML, Turtle/RDF, and UML-style definitions. OpenCommons
  uses JSON for the app API, ShEx/RDF/Turtle for Solid pod persistence, and
  OpenAPI JSON for deployment/API documentation.

## Domain-to-FHIR mapping

| OpenCommons domain | FHIR resource/profile intent | Terminology |
|---|---|---|
| `profiles` | `Patient` demographics | Administrative gender |
| `conditions` | `Condition` | SNOMED CT |
| `medications` | `MedicationStatement` | RxNorm |
| `allergies` | `AllergyIntolerance` | SNOMED CT |
| `immunizations` | `Immunization` | CVX |
| `vital-signs` | `Observation` / Vital Signs profile | LOINC |
| `providers` | `PractitionerRole` / organization context | local role codes |
| `lab-results` | `Observation` | LOINC |
| `insurance-policies` | `Coverage` | local coverage type codes |

The canonical machine-readable mapping is in
`src/standards/fhir.ts`.

## Owner-held identifiable PHI schema

Identifiable information is owner-held pod data only. The PHI schema exported
by `GET /api/privacy/schema` requires:

- an authenticated Solid owner identity (`owner.webId`);
- Solid storage coordinates for the owner pod resource;
- a FHIR resource mapping;
- a `patient-sensitive` classification;
- a release policy declaring that identifiable API release is disabled and
  anonymized release requires owner approval.

The schema intentionally treats direct identifiers as owner-held data, not as
release data. Direct identifiers include names, contact details, addresses,
photo URLs, pod resource URLs, provider identifiers, policy/member identifiers,
free-text notes, and exact dates.

## Anonymized release contract

The owner-facing `/api/resources/:domain` API is still the authenticated local
PIM CRUD surface. Any release outside that owner-facing use must use:

```http
GET /api/anonymized/resources/:domain
x-opencommons-owner-approved: true
x-opencommons-release-purpose: <non-empty purpose>
```

The anonymized release API:

- requires the PIM to be authenticated with the configured Solid server;
- requires explicit owner approval headers;
- removes direct identifiers, URLs, exact dates, free-text notes, provider
  identifiers, and insurance/member identifiers;
- generalizes dates to year where useful;
- returns only the anonymized payload shape defined by
  `ANONYMIZED_HEALTH_INFORMATION_SCHEMA`.

## Validation obligations

The repository validates the standards posture through:

- ShEx/RDF schema validation before pod writes;
- OpenAPI validation for owner CRUD and anonymized release operations;
- unit tests proving unauthenticated access is rejected;
- unit tests proving anonymized release requires owner approval;
- unit tests proving anonymized payloads do not contain direct identifier
  fields;
- FHIR mapping tests ensuring every PIM domain has a declared FHIR resource
  mapping.
