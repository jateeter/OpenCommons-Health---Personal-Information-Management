# Epic Dynamic Client Integration Completion Status

Date: 2026-08-28

## Current status

The Epic Sandbox dynamic-client integration is implemented to the point where
OpenCommons Health PIM can generate local key material, start the required
initial SMART authorization flow, receive a localhost callback, perform Epic
Dynamic Client Registration, store the returned dynamic client id locally, and
switch the runtime into `dynamic_jwt_bearer` mode.

The live end-to-end sequence is blocked at Epic Sandbox user authentication.
The Epic authorization page did not accept the credentials attempted by the
operator, so Epic did not redirect to the local callback and no one-time DCR
registration access token was issued.

## Decisions tracked

1. Use Epic Sandbox only until the flow completes end-to-end.
2. Use the Epic app's Non-Production Client ID for Sandbox authorization and
   Dynamic Client Registration.
3. Keep the existing authorization-code flow available as the default/legacy
   option.
4. Make `dynamic_jwt_bearer` opt-in through `EPIC_CONNECT_FLOW`.
5. Generate and store dynamic-client private key material locally under
   `.secrets/epic-dynamic-client/`.
6. Never commit `.env.*`, `.secrets/`, Epic tokens, authorization codes, client
   secrets, JWT assertions, patient ids, or raw FHIR payloads.
7. Treat MyChart/Epic Sandbox login as patient/user authorization, not app
   authentication. Client IDs, client secrets, and JWT keys do not bypass this
   login step.
8. Use a normal browser for the one-time Epic authorization instead of relying
   on the Codex side-panel browser.

## Local implementation checkpoint

The following repo surfaces now support the dynamic-client path:

- `src/runtimeConfig.ts` loads the dynamic-client id, assertion private key,
  assertion `kid`, assertion algorithm, and optional local diagnostic artifact
  paths.
- `src/integrations/epic/smartClient.ts` supports
  `EPIC_CONNECT_FLOW=dynamic_jwt_bearer` and signs JWT bearer grant assertions
  with the discovered Epic token endpoint as the JWT `aud` claim.
- `src/integrations/epic/service.ts` reports PHI-safe readiness diagnostics for
  dynamic-client id presence, JWT signing-key presence, local JWKS alignment,
  metadata alignment, and registration-request shape.
- `scripts/epic-dcr-one-shot.mjs` performs the local one-shot setup and DCR
  sequence outside the browser UI.
- `package.json` exposes `npm run epic:dcr` and `npm run epic:dcr:reset`.
- `docs/EPIC_DYNAMIC_CLIENT_JWT_BEARER.md` describes the deployment switch and
  runtime contract.

## Validation checkpoint

Last local validation in this pass:

- `npm ci`: completed with Node engine warnings because the shell was using
  Node 25.5.0 while the repo declares Node 22/24 compatibility.
- `npm test -- --runInBand tests/unit/integrations/epic.smartClient.test.ts tests/unit/integrations/epic.service.test.ts tests/unit/runtimeConfig.test.ts`:
  36 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Sanitized runtime-artifact inspection confirmed:
  - `.env.epic-sandbox.local` exists;
  - Sandbox mode is selected;
  - initial SMART authorization mode is selected;
  - no dynamic client id is currently stored;
  - local private key, public JWKS, metadata, and DCR request artifacts exist;
  - configured `kid` matches the local public JWKS;
  - configured algorithm matches the local public JWKS;
  - DCR request includes `software_id`, `jwks`, and JWT bearer grant type;
  - `.env.*` and `.secrets/` are gitignored.

## Live DCR attempt result

Command attempted:

```sh
npm run epic:dcr:reset
```

Observed result:

- Helper generated a fresh authorization URL.
- Helper listened at the configured redirect URI:
  `http://localhost:8080/api/integrations/epic/connect/callback`.
- Epic did not redirect back before timeout because Sandbox/MyChart
  authentication was not completed successfully.
- No Epic token, authorization code, patient id, or FHIR resource id was printed
  or committed.

## Required next operator action

Retrieve valid Epic Sandbox patient-facing MyChart credentials from the Epic
Sandbox Test Patients/Test Data resource for the selected Sandbox patient and
MyChart user. Do not use the Epic developer portal account, the app client id,
the client secret, or the FHIR app registration credentials as the MyChart
login.

Epic's public guidance says patient-facing apps redirect users to MyChart for
authentication and authorization, and that Sandbox MyChart account credentials
are available in the test-patient resources. It also notes that app changes can
take time to sync to Sandbox.

## Completion sequence after valid Sandbox credentials are available

1. Confirm Epic app is saved/ready for Sandbox and sync wait has completed.
2. Confirm `EPIC_CLIENT_ID` is the app's Non-Production Client ID.
3. Confirm `EPIC_REDIRECT_URI` exactly matches the Epic-registered localhost
   callback.
4. Run:

   ```sh
   npm run epic:dcr:reset
   ```

5. Open the printed URL, or retrieve it from:

   ```txt
   .secrets/epic-dynamic-client/initial-smart-start.json
   ```

6. Log in using the valid Epic Sandbox MyChart/test-patient credentials.
7. Approve the requested scopes.
8. Confirm the helper reports Dynamic Client Registration completed.
9. Confirm `.env.epic-sandbox.local` now contains a non-empty
   `EPIC_DYNAMIC_CLIENT_ID` and `EPIC_CONNECT_FLOW=dynamic_jwt_bearer`.
10. Start/restart the local PIM with Epic enabled.
11. Validate:
    - Epic readiness endpoint;
    - Connect Epic using dynamic JWT bearer mode;
    - Preview Import;
    - PHI-safe FHIR source diagnostics;
    - Create/Apply selected mapped records into the authenticated Solid Pod.

## References

- Epic on FHIR Patient-Facing Apps and OAuth documentation:
  <https://fhir.epic.com/Documentation?docId=patientfacingfhirapps>
- Epic FHIR Sandbox and app creation guidance:
  <https://fhir.epic.com/documentation?docid=fhir>
