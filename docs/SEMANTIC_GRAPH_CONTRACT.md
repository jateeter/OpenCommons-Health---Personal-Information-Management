# Semantic graph contract for browser and mobile parity

`public/semantic-domain-contract.json` is the owner-authoritative UX contract
for second-level OpenCommons Health semantic spider graphs. It exists so the
browser PIM and companion mobile experiences use the same domain vocabulary
instead of maintaining separate, drifting hard-coded lists.

The contract is metadata only. It contains no PHI, Pod resource paths, tokens,
DPoP key material, Epic payloads, raw HealthKit samples, or credential material.

## Contract authority

The Solid Pod remains the source of authority for owner-managed health data.
This contract is the source of authority for the UI shape used to inspect and
add that owner-managed data:

- domain key;
- domain label and plural label;
- FHIR resource family;
- semantic graph element ID;
- semantic graph element label;
- owner-facing summary;
- FHIR element hint;
- coding-system reference and code/display where applicable; and
- Add-modal prefill defaults.

The browser currently validates its hard-coded `DOMAIN_SEMANTIC_ELEMENTS`
definitions against this JSON contract. A future refactor may make the browser
load this contract directly, but drift protection is already enforced by:

```bash
npm run validate:semantic-contract
```

That validation is also part of:

```bash
npm run local:release-gate
```

## Contract location

| Path | Purpose |
| --- | --- |
| `public/semantic-domain-contract.json` | Versioned semantic graph contract, packaged with the browser UI and readable by mobile tooling. |
| `scripts/validate-semantic-domain-contract.mjs` | Validates contract shape, all 11 domains, terminology systems, Vitals parity, and browser source alignment. |
| `tests/unit/semanticDomainContract.test.ts` | Jest-level regression coverage for the contract and browser source alignment. |

## Domains covered

The contract covers all 11 owner-visible OpenCommons Health PIM domains:

1. `profiles`
2. `conditions`
3. `medications`
4. `allergies`
5. `immunizations`
6. `vital-signs`
7. `providers`
8. `lab-results`
9. `insurance-policies`
10. `documents`
11. `workflow-tasks`

## Required Vitals parity

The `vital-signs` graph must remain equivalent across browser and mobile
experiences. The current owner-facing Vitals elements are:

| Element ID | Display | Coding |
| --- | --- | --- |
| `blood-pressure` | Blood pressure | LOINC `85354-9` |
| `heart-rate` | Heart rate | LOINC `8867-4` |
| `body-temperature` | Temperature | LOINC `8310-5` |
| `oxygen-saturation` | Oxygen saturation | LOINC `59408-5` |
| `body-weight` | Body weight | LOINC `29463-7` |
| `bmi` | BMI | LOINC `39156-5` |

HealthKit-specific concepts such as activity, sleep, and provenance may still
appear in HealthKit mirror/source-status views, but they should not silently
replace the owner-facing PIM Vitals semantic elements above.

## Mobile consumption guidance

Mobile clients should consume or test against
`public/semantic-domain-contract.json` as the upstream source of truth. If the
mobile app keeps native Swift model definitions for offline/local operation,
those definitions should be generated from or validated against this contract.

At minimum, mobile parity tests should fail when:

- a domain key is missing;
- a semantic element ID differs;
- a user-visible element label differs;
- Vitals omits any of the six required clinical elements; or
- coding-system/code/display values differ for LOINC, RxNorm, SNOMED CT, CVX,
  or administrative/schema.org metadata.

## Change process

When changing a semantic graph element:

1. Update `public/semantic-domain-contract.json`.
2. Update browser definitions in `public/app.js` or refactor the browser to
   consume the contract directly.
3. Update tests and run `npm run validate:semantic-contract`.
4. Coordinate the corresponding mobile parity update in `localHealthkitBridge`.
5. Run `npm run local:release-gate` before merge.
