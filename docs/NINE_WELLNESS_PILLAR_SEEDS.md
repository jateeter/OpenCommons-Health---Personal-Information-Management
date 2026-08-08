# Nine wellness pillar seed data

This document describes the synthetic seed bundle in
[`fixtures/wellness-pillar-seeds.json`](../fixtures/wellness-pillar-seeds.json).
It is intended for local demos, manual UI review, Playwright automation, and
future import fixtures. It is not clinical data.

The seed bundle has two values for each pillar:

- `modalSeeds`: exact Add/Edit modal input names and values, including
  transient helper dropdowns and terminology search fields.
- `record`: the saved domain payload expected after the modal excludes
  transient helpers and writes the owner-approved record to the Solid pod.

All records are synthetic. Names, identifiers, URLs, member IDs, organizations,
lot numbers, and notes are deliberately fake and safe for repository use.

## Pillar coverage

| Pillar | Domain | Repository | ShEx schema | Coding alignment | Seed focus |
|---:|---|---|---|---|---|
| 1 | `profiles` | `ProfileRepository` | `src/schemas/profile.shex` | schema.org + FHIR AdministrativeGender | Owner identity/demographic form fields |
| 2 | `conditions` | `ConditionRepository` | `src/schemas/condition.shex` | SNOMED CT | Active diagnosis with severity and onset |
| 3 | `medications` | `MedicationRepository` | `src/schemas/medication.shex` | RxNorm | Active medication with dosage and prescriber |
| 4 | `allergies` | `AllergyRepository` | `src/schemas/allergy.shex` | SNOMED CT | Medication allergy/intolerance |
| 5 | `immunizations` | `ImmunizationRepository` | `src/schemas/immunization.shex` | CVX | Annual vaccination history |
| 6 | `vital-signs` | `VitalSignsRepository` | `src/schemas/vitalSigns.shex` | LOINC | HealthKit-style heart-rate observation |
| 7 | `providers` | `ProviderRepository` | `src/schemas/provider.shex` | schema.org | Local provider directory entry |
| 8 | `lab-results` | `LabResultRepository` | `src/schemas/labResult.shex` | LOINC | HbA1c annual wellness lab |
| 9 | `insurance-policies` | `InsuranceRepository` | `src/schemas/insurance.shex` | Local coverage-type values | Medical coverage record |

## Manual UI review recipe

1. Start the local stack and open the app:

   ```bash
   docker compose up --build -d pim
   open http://localhost:18080
   ```

2. Open **Records**.
3. Select each domain listed below.
4. Click **Add**.
5. Copy values from that pillar's `modalSeeds` object into the modal.
6. Confirm helper dropdowns pre-fill Coding fields:

   - SNOMED CT: `http://snomed.info/sct`
   - RxNorm: `http://www.nlm.nih.gov/research/umls/rxnorm`
   - CVX: `http://hl7.org/fhir/sid/cvx`
   - LOINC: `http://loinc.org`

7. Save the record and verify the owner-visible record card renders the
   expected title/detail.

## Validation

Run:

```bash
npm run validate:wellness-seeds
npm test -- --runInBand tests/unit/wellnessPillarSeeds.test.ts
```

The validator checks that:

- exactly nine pillars are present;
- every expected modal field has a seed value;
- every saved record contains the expected field paths;
- coded records include `system`, `code`, and `display`;
- transient helper fields such as `snomedChoice`, `rxnormChoice`,
  `cvxChoice`, `loincChoice`, and `terminologySearch` do not leak into saved
  records.

## Safety note

These seeds are intentionally synthetic and local-first. They should not be
used for clinical decision-making, patient matching, billing, eligibility,
identity verification, or any production exchange.
