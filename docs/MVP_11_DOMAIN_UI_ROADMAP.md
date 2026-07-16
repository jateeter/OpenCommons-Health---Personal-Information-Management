# MVP 11-domain UI roadmap

## Objective

Make all 11 owner-controlled PIM domains visible and usable in the localhost MVP
without adding cognitive overhead for the pod owner.

## UX principles

- Keep the owner in one consistent record-management pattern: choose a domain,
  add or review a record, save to the Solid pod.
- Prefer standards-assisted entry over blank clinical coding fields.
- Make document and workflow support feel like natural health-record sections,
  not hidden integration plumbing.
- Keep raw document upload, outbound Epic messaging, and task writeback out of
  the MVP until those flows have explicit owner-approval and site-policy design.

## Implemented MVP slice

1. First-class navigation for all 11 domains:
   - Profiles
   - Conditions
   - Medications
   - Allergies
   - Immunizations
   - Vital signs
   - Providers
   - Lab results
   - Insurance
   - Documents
   - Workflow tasks
2. Low-friction document metadata entry:
   - LOINC document-type search.
   - LOINC document-category search.
   - status, title, authored date, source system, custodian, and owner notes.
3. Low-friction workflow-task entry:
   - SNOMED CT workflow task search.
   - status, intent, description, authored date, due date, requester, owner,
     related document URL, and owner notes.
4. Consistent visual behavior:
   - each domain has a nav icon, plural label, empty state, add/edit dialog,
     search, and Solid pod storage status.
5. Integration continuity:
   - Epic Annual Medicare Wellness preview can map DocumentReference and Task
     resources into these same UI-visible domains.

## Release workflow

For each UI change in this MVP lane:

1. Update `public/app.js` domain metadata and form behavior.
2. Update `tests/unit/publicAppSnomed.test.ts` or add focused UI contract tests.
3. Run `npm run local:release-gate`.
4. Deploy a fresh container-local stack with configurable ports.
5. Verify browser-visible UI and `/api/status` domain count.
6. Commit, open PR, wait for hosted Node/Docker/compose checks, and merge.

## Deferred UX work

- Add richer grouped navigation if the 11-domain list grows beyond comfortable
  single-column scanning.
- Add raw document file upload only after encryption, size limits, content-type
  validation, and PHI-safe preview are designed.
- Add outbound workflow/message actions only after Epic site policy and
  patient-confirmation requirements are explicit.
