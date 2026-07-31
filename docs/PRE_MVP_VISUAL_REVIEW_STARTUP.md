# Pre-MVP local visual review startup

This workflow starts the current OpenCommons Health PIM pre-MVP with the
application and local Solid infrastructure running together in Docker Compose.
It is intended for visual review, UI walkthroughs, and basic domain API
validation.

## Active review deployment

| Service | URL |
|---|---|
| PIM UI | <http://localhost:18080/> |
| API docs | <http://localhost:18080/api/docs> |
| OpenAPI JSON | <http://localhost:18080/openapi.json> |
| FHIR metadata | <http://localhost:18080/fhir/metadata> |
| Privacy schema | <http://localhost:18080/api/privacy/schema> |
| Solid Community Server | <http://localhost:13000/> |

## Local configuration

The review stack uses a gitignored `.env` file at the repository root.

Required values:

| Variable | Review value | Purpose |
|---|---|---|
| `APP_PORT` | `18080` | Host port for the PIM UI and API. |
| `CSS_PORT` | `13000` | Host port for the local Solid Community Server. |
| `HOST` | `0.0.0.0` | Container bind host. |
| `CSS_ACCOUNT_EMAIL` | `alice@example.test` | Local Solid account for review. |
| `CSS_ACCOUNT_PASSWORD` | local review password in `.env` | Required for first-run Solid account bootstrap. |
| `CSS_POD_NAME` | `alice` | Local Solid pod name. |
| `SOLID_POD_SERVER_URL` | `http://localhost:13000` | Host-local Solid URL reference. |
| `SOLID_OIDC_ISSUER` | `http://localhost:13000` | Host-local Solid issuer reference. |
| `SOLID_POD_PATH` | `/health-pim/` | Container path inside the owner pod. |
| `SOLID_REDIRECT_URL` | `http://localhost:18080/callback` | PIM callback URL. |
| `EPIC_ENABLED` | `true` for Epic mock review | Enables the local Epic connector panel and mock workflow. |
| `EPIC_MODE` | `mock` | Uses deterministic local Medicare Wellness data with no live Epic credentials. |
| `EPIC_GRANT_ENCRYPTION_KEY` | local review key in `.env` | Encrypts mock grant material before pod storage. |
| `REALITYENGINE_SUITE_ENABLED` | `1` | Starts `../RealityEngine_CI/startUniverse.sh` before the PIM container stack. |
| `REALITYENGINE_SUITE_ARGS` | `--engines=scala:1,cpp:1,lsp:1 --machine-load=runtime --pe-source-bootstrap=auto --no-openclaw --no-local-ai` | Spawns one Scala, C++, and LSP RealityEngine runtime for suite review. |

Do not commit `.env`, generated `.solid/` files, or local Docker volume data.

## Start or restart

From the repository root:

```bash
APP_PORT=18080 \
CSS_PORT=13000 \
npm run local:preflight
```

Then start the stack:

```bash
APP_PORT=18080 \
CSS_PORT=13000 \
WAIT_TIMEOUT=180 \
EPIC_ENABLED=true \
EPIC_MODE=mock \
EPIC_GRANT_ENCRYPTION_KEY=local-review-epic-key \
./scripts/local-container-up.sh
```

The script will:

1. validate the configured localhost ports and Docker availability;
2. start the sibling RealityEngine suite through `../RealityEngine_CI/startUniverse.sh`;
3. build the local PIM and CSS images;
4. create isolated Docker volumes for this port pair;
5. start Solid Community Server;
6. provision the local account, WebID, pod, and client credentials;
7. start the PIM app;
8. verify the UI, liveness, OpenAPI docs, authenticated pod readiness, and CRUD
   coverage for all 11 health domains.

For a Solid/PIM-only visual review, add `REALITYENGINE_SUITE_ENABLED=0` to the
startup command.

## Stop without deleting pod data

```bash
APP_PORT=18080 CSS_PORT=13000 ./scripts/local-container-down.sh
```

The normal stop workflow preserves Docker volumes for the review pod and
generated credentials. It also stops the RealityEngine suite by default; use
`REALITYENGINE_SUITE_STOP_ON_DOWN=0` only when you intentionally want to leave
that suite running.

## Reset review data

Only use this when you intentionally want to delete the local review pod and
generated credentials for this port pair:

```bash
APP_PORT=18080 CSS_PORT=13000 docker compose down --volumes
```

## Review checklist

- Open the PIM UI and confirm the header shows `Pod connected`.
- Navigate all 11 domains:
  `Profiles`, `Conditions`, `Medications`, `Allergies`, `Immunizations`,
  `Vital signs`, `Providers`, `Lab results`, `Insurance`, `Documents`, and
  `Workflow tasks`.
- Add, edit, and delete a non-sensitive sample record.
- Open `/api/docs` and confirm the local API action runner loads.
- Open `/fhir/metadata` and confirm the FHIR CapabilityStatement-style payload
  is available.
- Open `/api/privacy/schema` and confirm the identifiable PHI and anonymized
  release schemas are available.
- Open `/api/integrations/epic/diagnostics` and confirm:
  - `localhostMvp` is `true`;
  - `readiness` is `ready`;
  - no live Epic credentials are requested.
- In the Epic panel, connect mock Epic, preview the Medicare Wellness import,
  confirm candidates are grouped by section, deselect at least one section, and
  apply only the owner-selected sections to the pod.
