# Epic personal health data configuration

This document provides a safe sample configuration for connecting
OpenCommons Health PIM to personal health data available through an Epic
SMART/FHIR endpoint.

Important: do not place Epic/MyChart usernames or passwords in `.env`, source
control, logs, Codex chat, shell history, or Solid pod documents. The user
should authenticate only through the Epic/MyChart SMART authorization page in a
browser. OpenCommons receives the OAuth callback and stores only encrypted
grant material in the authenticated owner's Solid pod.

## Identity model

OpenCommons uses two linked but separate identities:

1. Solid pod owner identity
   - The local Solid account and pod own the OpenCommons PIM data.
   - The Solid pod remains the source of authority for records managed by the
     application.

2. Epic/MyChart patient identity
   - The patient authenticates directly with Epic/MyChart through SMART on FHIR.
   - OpenCommons does not collect or store the Epic password.
   - The resulting patient context, granted scopes, and encrypted grant state
     are stored under the authenticated owner's Solid pod.

## Local personal-data configuration template

Create a local, untracked file such as `.env.epic-personal.local` or copy these
values into your local `.env`. Do not commit the filled file.

```dotenv
# Local OpenCommons/Solid runtime
APP_PORT=8080
CSS_PORT=3000
HOST=0.0.0.0

# Your local Solid identity. Use values that identify your local owner pod.
CSS_ACCOUNT_EMAIL=<your-local-solid-owner-email>
CSS_ACCOUNT_PASSWORD=<long-local-solid-password>
CSS_POD_NAME=<your-solid-pod-name>

SOLID_POD_SERVER_URL=http://localhost:3000
SOLID_OIDC_ISSUER=http://localhost:3000
SOLID_POD_BASE_URL=http://localhost:3000/<your-solid-pod-name>/
SOLID_POD_PATH=/health-pim/
SOLID_REDIRECT_URL=http://localhost:8080/callback

# Epic SMART/FHIR personal access.
# Use sandbox while developing. Use production only after the app is registered,
# approved, and configured for the target Epic/MyChart organization.
EPIC_ENABLED=true
EPIC_MODE=sandbox
EPIC_FHIR_BASE_URL=<epic-fhir-r4-base-url-from-your-provider-or-epic-app-registration>
EPIC_CLIENT_ID=<epic-smart-client-id>
# Optional: only when your Epic app registration requires a confidential client
# secret. Prefer EPIC_CLIENT_SECRET_FILE over an inline value.
EPIC_CLIENT_SECRET_FILE=<path-to-local-untracked-client-secret-file>
EPIC_REDIRECT_URI=http://localhost:8080/api/integrations/epic/connect/callback

# Local key used to encrypt Epic grant material before storing it in your Solid pod.
# Use a long random value. Do not commit it.
EPIC_GRANT_ENCRYPTION_KEY=<long-random-local-encryption-key>

# Keep startup sync off until you have verified preview/apply behavior.
EPIC_SYNC_ON_STARTUP=false

# Minimum read-only MVP scope set.
EPIC_SCOPES=openid fhirUser launch/patient offline_access patient/Patient.rs patient/Condition.rs patient/MedicationRequest.rs patient/MedicationStatement.rs patient/AllergyIntolerance.rs patient/Immunization.rs patient/Observation.rs patient/DiagnosticReport.rs patient/Coverage.rs patient/DocumentReference.rs
```

For local MVP testing without personal Epic data, keep:

```dotenv
EPIC_ENABLED=true
EPIC_MODE=mock
EPIC_GRANT_ENCRYPTION_KEY=<long-random-local-encryption-key>
```

## Credential prompt workflow

The credential prompt must happen in Epic/MyChart, not in OpenCommons or Codex.

1. Start the local stack with Epic enabled.
2. Open the PIM UI.
3. Select **Connect Epic**.
4. OpenCommons calls:

   ```http
   POST /api/integrations/epic/connect/start
   ```

5. In sandbox/production mode, OpenCommons redirects the browser to the Epic
   SMART authorization URL.
6. Epic/MyChart prompts you for your credentials and consent.
7. Epic redirects back to:

   ```http
   GET /api/integrations/epic/connect/callback?code=...&state=...
   ```

8. OpenCommons stores the resulting connection state in your Solid pod:

   ```text
   /health-pim/integrations/epic/connection.ttl
   ```

9. Grant/token material is encrypted before being written to the pod.
10. Import remains owner-mediated:

   ```http
   POST /api/integrations/epic/sync/preview
   POST /api/integrations/epic/sync/apply
   ```

## Development commands

Container-local mode:

```bash
EPIC_ENABLED=true \
EPIC_MODE=sandbox \
EPIC_FHIR_BASE_URL=<epic-fhir-r4-base-url> \
EPIC_CLIENT_ID=<epic-client-id> \
EPIC_CLIENT_SECRET_FILE=<path-to-local-untracked-client-secret-file> \
EPIC_REDIRECT_URI=http://localhost:8080/api/integrations/epic/connect/callback \
EPIC_GRANT_ENCRYPTION_KEY=<long-random-local-encryption-key> \
APP_PORT=8080 \
CSS_PORT=3000 \
./scripts/local-container-up.sh
```

Host-local mode:

```bash
EPIC_ENABLED=true \
EPIC_MODE=sandbox \
EPIC_FHIR_BASE_URL=<epic-fhir-r4-base-url> \
EPIC_CLIENT_ID=<epic-client-id> \
EPIC_CLIENT_SECRET_FILE=<path-to-local-untracked-client-secret-file> \
EPIC_REDIRECT_URI=http://localhost:8080/api/integrations/epic/connect/callback \
EPIC_GRANT_ENCRYPTION_KEY=<long-random-local-encryption-key> \
APP_PORT=8080 \
CSS_PORT=3000 \
./scripts/local-host-solid-up.sh

./scripts/local-host-start.sh
```

## Safety rules for personal data development

- Never paste Epic/MyChart credentials into Codex, GitHub, `.env.example`, docs,
  tests, logs, or issue comments.
- Use Epic's browser-hosted login/consent page for credentials.
- Use synthetic or mock data until the real SMART callback path has been
  validated.
- Preview imported FHIR data before applying it to the Solid pod.
- Treat the Solid pod as authoritative after apply.
- Do not enable anonymized release without explicit owner approval.
- Do not use production Epic endpoints until the app registration, redirect URI,
  client id, scopes, privacy disclosures, and organization access are approved.

## Required implementation gap before real personal Epic access

The application now includes SMART configuration discovery,
authorization-code-with-PKCE request generation, token endpoint exchange,
refresh-token handling when granted, granted-scope capture, and live FHIR read
support for the MVP resource set.

Live personal Epic access still requires real Epic registration values and an
Epic/MyChart organization that permits the requested patient-facing scopes. Use
`EPIC_MODE=mock` for repeatable local testing and `EPIC_MODE=sandbox` or
`EPIC_MODE=production` only with approved Epic app/client configuration.
