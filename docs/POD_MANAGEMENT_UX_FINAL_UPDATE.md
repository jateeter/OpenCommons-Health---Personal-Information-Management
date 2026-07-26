# Pod management UX final update

## Status

The HealthKitBridge work has been validated from the RealityEngine side. The
OpenCommons Health PIM localhost MVP now treats that bridge as an upstream
validated input path and keeps the browser focus on owner-controlled Solid Pod
management.

## Owner-facing UX update

The browser application now includes a first-class Pod Management panel. The
panel gives the authenticated Pod owner immediate observability into:

- authenticated owner Pod access;
- configured Solid Community Server URL;
- configured Pod root URL;
- all visible Pod-backed health domains;
- owner-visible container status for HealthKit observations, clinical
  documents, workflow tasks, consent, and audit surfaces;
- recent safe metadata activity for local owner actions;
- persisted audit status for `health-pim/audit/activity.ttl`;
- HealthKitBridge mirror readiness and observation counts for
  `health-pim/healthkit/observations/`;
- local data residency;
- anonymized-only external release policy;
- local API documentation, FHIR metadata, and privacy schema links.

The panel intentionally does not expose tokens, client secrets, raw credential
material, or non-owner release controls. Identifiable personal health
information remains available only through authenticated owner-facing domain
APIs.

The current activity trail is intentionally limited to safe metadata and is
persisted back into an owner-controlled Solid Pod audit container. The
HealthKit mirror status is also metadata-only and does not expose sample
payloads or resource URLs.

## Current local MVP posture

The PIM supports 11 owner-managed domains:

1. Profiles
2. Conditions
3. Medications
4. Allergies
5. Immunizations
6. Vital signs
7. Providers
8. Lab results
9. Insurance policies
10. Documents
11. Workflow tasks

Each domain remains visible through consistent navigation, owner-facing CRUD
forms, Solid-backed repository logic, ShEx validation, and OpenAPI-documented
domain APIs.

## Deployment contract

The supported MVP operating modes remain:

- container-local PIM plus local Solid Community Server;
- host-local PIM plus containerized local Solid Community Server.

Both modes should continue to validate:

- `/api/status` authenticated Pod readiness;
- `/api/resources/:domain` for all 11 domains;
- `/openapi.json` and `/api/docs`;
- `/fhir/metadata`;
- `/api/privacy/schema`;
- `/api/pod/activity`;
- `/api/pod/healthkit/status`;
- owner-approved anonymized release headers.

## Next implementation focus

The next PIM development step should stay on Pod owner management before adding
new external integrations:

1. Add conflict/reconciliation UX for mobile-originated versus CSS-originated
   Pod records.
2. Expand HealthKitBridge-originated summaries when actual mirrored Observation
   records are available from the bridge.
3. Keep outbound Epic writes, mobile-native packaging, and public callback flows
   out of the localhost MVP until the user explicitly resumes those tracks.
