# Localhost MVP scope and native-client hold

## Decision

The OpenCommons Health PIM MVP is restricted to localhost deployment on a
personally controlled notebook or developer workstation.

Native iPad, iPhone, and other mobile-app deployment work is explicitly on hold
for a future implementation phase. Mobile planning may continue as architecture
notes, but it is not part of the current MVP acceptance bar, build pipeline, or
release checklist.

## MVP deployment boundary

The current MVP has two supported localhost happy paths:

| Mode | PIM runtime | Solid infrastructure | Primary use |
|---|---|---|---|
| Container-local | PIM and Solid Community Server run through Docker Compose. | Port-scoped local CSS container and Docker volume-backed pod. | Repeatable full-stack validation and release review. |
| Host-local | PIM runs on the host, while CSS runs in Docker. | Port-scoped local CSS container and generated client credentials under `.solid/`. | Active UI/API development with local Solid persistence. |

All MVP behavior must be reachable from localhost URLs and configurable ports.
`APP_PORT` and `CSS_PORT` remain the source of truth for local deployment
scripts, verification, and review instructions.

## Included in the MVP

The localhost MVP includes:

- browser UI for manual owner-facing record management;
- all nine domain APIs under `/api/resources/:domain`;
- anonymized release APIs under `/api/anonymized/resources/:domain`;
- Swagger/OpenAPI documentation under `/api/docs` and `/openapi.json`;
- FHIR-aligned metadata under `/fhir/metadata`;
- privacy schema under `/api/privacy/schema`;
- local Solid Community Server bootstrap and authenticated pod access checks;
- RDF/ShEx validation before pod writes;
- terminology-assisted manual entry for supported clinical domains;
- Epic connector controls and APIs at the current implementation level:
  - disabled by default;
  - deterministic mock mode for repeatable development;
  - localhost diagnostics at `/api/integrations/epic/diagnostics`;
  - SMART discovery, PKCE authorization URL generation, callback token
    exchange, refresh handling, and patient-scoped FHIR reads when real Epic
    registration values are supplied;
  - owner-mediated preview/apply workflow;
  - encrypted grant material stored in the owner pod.

## Excluded from the MVP

The following are intentionally excluded from the localhost MVP:

- native iPad/iPhone app packaging;
- iOS entitlements, HealthKit, Spezi, ASWebAuthenticationSession, custom URL
  scheme, or Universal Link implementation;
- embedded mobile pod storage;
- App Store, TestFlight, or mobile-device distribution;
- outbound Epic writes, message sends, or task updates;
- production Epic customer activation without approved app registration,
  redirect URI, scopes, and site policy;
- public DNS-visible hosting as an MVP requirement.

## Non-iPad development backlog for this MVP

The next non-iPad work should stay inside the localhost contract:

1. Preserve and harden the container-local happy path.
2. Preserve and harden the host-local happy path.
3. Keep all ports configurable and collision-resistant.
4. Extend deployment verification for optional Epic sandbox reachability without
   requiring live credentials in CI.
5. Strengthen import preview/reconciliation UX for Annual Medicare Wellness
   updates.
6. Add document/workflow read-only domain planning as localhost APIs before any
   mobile implementation.
7. Keep anonymized release tests in the release gate.
8. Keep native/iPad implementation as a parked future milestone.

Issue-style notes for the remaining localhost deployment work are maintained in
[`LOCALHOST_MVP_DEPLOYMENT_ISSUES.md`](./LOCALHOST_MVP_DEPLOYMENT_ISSUES.md).

## MVP acceptance gates

Before a localhost MVP release is considered valid, the following checks should
pass:

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
npm run validate:openapi
npm run validate:localhost-mvp
npm run local:release-gate
APP_PORT=<free-port> CSS_PORT=<free-port> ./scripts/local-container-up.sh
APP_PORT=<free-port> CSS_PORT=<free-port> npm run local:host-smoke
APP_URL=http://localhost:<app-port> npm run test:e2e:playwright
```

`npm run local:release-gate` runs the non-Docker checks above as one repeatable
local gate. The container-local and host-local smoke commands remain separate
because they start live Docker/Solid infrastructure and require available
localhost ports.

The deployment verification script must confirm more than process uptime. It
must prove the UI, OpenAPI documentation, FHIR metadata, privacy schema,
authenticated pod access, all nine domain APIs, anonymized release controls,
and optional Epic mock workflow are operating together.

## Future native-client reactivation criteria

The native iPad/mobile lane should not resume until the localhost MVP is stable
and the following decisions are explicit:

- whether the native client uses a SwiftUI UI, WKWebView shell, or another
  packaging strategy;
- whether the local Solid model is represented by an embedded pod-compatible
  store or a separately running CSS-compatible service;
- which SMART native redirect form an Epic/customer registration will accept;
- where OAuth grant material is stored on device;
- what mobile-specific PHI backup, export, deletion, and recovery policies
  apply.
