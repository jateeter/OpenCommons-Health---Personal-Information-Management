# Epic MVP implementation log — 2026-07-13

## Scope completed

This implementation slice undertook the Epic MVP roadmap phases with a local
repeatability focus:

1. Epic runtime configuration is disabled by default and supports `mock`,
   `sandbox`, and `production` modes.
2. Patient-owned Epic connection state is stored in the authenticated Solid pod.
3. Epic grant material is encrypted before pod storage.
4. A deterministic mock Epic/FHIR connector supplies Annual Medicare Wellness
   resources for local and Docker validation.
5. The PIM exposes Epic integration APIs for status, connect, callback,
   disconnect, preview, apply, and audit.
6. The UI exposes an Epic SMART/FHIR MVP panel for mock connect, preview, and
   owner-approved apply-to-pod review.
7. Docker and host-local configuration contracts carry the same `EPIC_*`
   settings.
8. Deployment verification now validates the optional Epic mock flow.

## Implemented API surface

- `GET /api/integrations/epic/status`
- `POST /api/integrations/epic/connect/start`
- `GET /api/integrations/epic/connect/callback`
- `POST /api/integrations/epic/disconnect`
- `POST /api/integrations/epic/sync/preview`
- `POST /api/integrations/epic/sync/apply`
- `GET /api/integrations/epic/audit`

The Solid pod remains the source of authority for all managed application data.
Epic mock resources are mapped to PIM domain candidates first, then written to
the pod only through the existing domain repositories and validation path.

## Validation outcomes

Commands run successfully:

```bash
node --check scripts/playwright-medicare-wellness-e2e.mjs
npm run typecheck
npm test -- --runInBand
npm run validate:openapi
npm run build
npm run lint
git diff --check
```

Jest result:

```text
Test Suites: 15 passed, 15 total
Tests: 144 passed, 144 total
```

Docker deployment proof:

```bash
EPIC_ENABLED=true \
EPIC_MODE=mock \
EPIC_GRANT_ENCRYPTION_KEY=local-docker-mvp-epic-grant-key \
APP_PORT=18083 \
CSS_PORT=13003 \
WAIT_TIMEOUT=180 \
./scripts/local-container-up.sh
```

Outcome:

- PIM UI reachable at `http://localhost:18083/`
- CSS reachable at `http://localhost:13003/`
- `/livez`, `/api/status`, `/openapi.json`, `/api/docs` passed
- all nine owner domain CRUD smoke tests passed
- Epic mock connect, preview, apply, and audit smoke tests passed

Browser E2E proof:

```bash
APP_URL=http://localhost:18083 \
PLAYWRIGHT_OUTPUT_DIR=output/playwright \
npm run test:e2e:playwright
```

Outcome:

```text
Medicare Wellness Playwright E2E passed against http://localhost:18083
```

The Playwright flow now covers the Epic MVP panel when enabled, manual Annual
Medicare Wellness record entry across the domain UI, and anonymized release PII
controls.

## Roadblocks removed during implementation

- Solid connection records now update existing pod resources by first loading
  the existing dataset, avoiding CSS `412 Precondition Failed`.
- BMI vital-sign records now map to the ShEx-required `health:VitalBMI` IRI.
- Numeric UI fields now allow clinical decimals such as BMI `27.4` and A1c
  `5.8`.
- Playwright form automation now targets `<label for="...">` controls directly,
  avoiding ambiguity from terminology search labels and tooltip accessible names.

## Remaining MVP gaps

- Real Epic sandbox SMART token exchange is not implemented in this slice.
- SMART discovery and customer-specific Epic metadata checks need live sandbox
  credentials.
- DocumentReference/Binary and messaging/workflow resources remain roadmap
  lanes, not completed MVP features.
- Production Epic app registration, customer download, JWK/JWKS management, and
  non-mock refresh-token rotation remain future work.
- Imported clinical records preserve provenance in preview/apply audit output;
  deeper per-record RDF provenance links should be added before production use.

