# OpenCommons Health – Personal Information Management

A modern, privacy-first **Personal Information Management (PIM)** application for health data, backed by a local [Solid Community Server](https://github.com/CommunitySolidServer/CommunitySolidServer) pod.

---

## Overview

OpenCommons Health PIM lets individuals own and control their health data by storing it in a personal **Solid pod** running on their own machine. All data is modelled as [Linked Data](https://www.w3.org/DesignIssues/LinkedData) (RDF/Turtle) and validated against [ShEx](https://shex.io/) schemas before being written to the pod.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  OpenCommons Health PIM (this repo)                                 │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌───────────────────┐  │
│  │ SolidAuthSvc │──▶│    PodClient     │──▶│  *Repository      │  │
│  └──────────────┘   └──────────────────┘   └───────────────────┘  │
│         │                    │                        │             │
│   OIDC / Client-Creds   Solid REST API          ShEx Schemas       │
│         ▼                    ▼                        ▼             │
│   ┌────────────────────────────────────────────────────────┐       │
│   │            Solid Community Server (local pod)          │       │
│   │                 http://localhost:3000                   │       │
│   └────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

The deployment in this repository includes the application, persistent local
Solid infrastructure, and an idempotent identity/pod bootstrap.

---

## Health Data Catalogue

The following health information categories are supported, each with a validated ShEx schema and a dedicated TypeScript repository class:

| Category | ShEx Schema | Repository class |
|---|---|---|
| Personal Profile | `src/schemas/profile.shex` | `ProfileRepository` |
| Medical Conditions | `src/schemas/condition.shex` | `ConditionRepository` |
| Medications | `src/schemas/medication.shex` | `MedicationRepository` |
| Allergies & Intolerances | `src/schemas/allergy.shex` | `AllergyRepository` |
| Immunizations | `src/schemas/immunization.shex` | `ImmunizationRepository` |
| Vital Signs | `src/schemas/vitalSigns.shex` | `VitalSignsRepository` |
| Healthcare Providers | `src/schemas/provider.shex` | `ProviderRepository` |
| Laboratory Results | `src/schemas/labResult.shex` | `LabResultRepository` |
| Insurance Policies | `src/schemas/insurance.shex` | `InsuranceRepository` |

Coding systems used: **SNOMED CT** (conditions, allergies), **RxNorm** (medications), **CVX** (vaccines), **LOINC** (lab results, vital signs), **schema.org** (profiles, providers).

---

## Prerequisites

- **Docker Engine** with Docker Compose v2 for the complete local deployment
- **Node.js 22 or 24** for development without containers

## Quickstart (under 10 minutes)

```bash
# 1. Clone
git clone https://github.com/jateeter/OpenCommons-Health---Personal-Information-Management.git
cd OpenCommons-Health---Personal-Information-Management

# 2. Configure the local account (use a private, strong password)
cp .env.example .env
# Edit CSS_ACCOUNT_PASSWORD in .env

# 3. Start CSS, provision the account/WebID/pod/client credentials, and start PIM
docker compose up --build -d

# 4. Verify UI, authenticated readiness, and real domain CRUD
./scripts/verify-deployment.sh
```

Open `http://localhost:8080`. CSS is available locally at
`http://localhost:3000`. Pod data is retained in the `css_data` named volume;
generated client credentials are retained separately in `css_credentials` and
mounted read-only into the PIM container. Normal `docker compose down` and
container rebuilds preserve both. `docker compose down --volumes` deliberately
deletes the local pod and generated credentials.

Inside the Compose network the CSS base URL is `http://css.localhost:3000`.
That keeps container-to-container DNS working while satisfying Solid-OIDC's
localhost-only allowance for non-HTTPS local WebIDs.

The bootstrap is safe to rerun:

```bash
docker compose up bootstrap
```

### Application UI and domain API

The production server serves the browser application at `http://localhost:8080`
and exposes the Solid-backed domain API under `/api/resources/:domain`.

```bash
SOLID_POD_SERVER_URL=http://localhost:3000
SOLID_POD_BASE_URL=http://localhost:3000/alice/
SOLID_POD_PATH=/health-pim/
SOLID_CLIENT_CREDENTIALS_FILE=/secure/path/client-credentials.json
npm run build
npm start
```

Direct `SOLID_CLIENT_ID` and `SOLID_CLIENT_SECRET` environment variables remain
supported and take precedence over the credentials file.

Supported domain names are `profiles`, `conditions`, `medications`, `allergies`,
`immunizations`, `vital-signs`, `providers`, `lab-results`, and
`insurance-policies`.

| Operation | Request |
|---|---|
| List | `GET /api/resources/conditions` |
| Read | `GET /api/resources/conditions?url=<absolute-pod-resource-url>` |
| Create | `POST /api/resources/conditions` with a JSON entity |
| Update | `PUT /api/resources/conditions` with a JSON entity containing `url` |
| Delete | `DELETE /api/resources/conditions?url=<absolute-pod-resource-url>` |

`GET /livez` reports process liveness. `GET /healthz` and `GET /api/status`
report readiness of the authenticated Solid-backed application and perform a
read-only authenticated pod access probe.

### Sample usage

```typescript
import { HealthPIM } from './dist';

const pim = await HealthPIM.create({
  podServerUrl: 'http://localhost:3000',
  podBaseUrl:   'http://localhost:3000/alice/',
  podPath:      '/health-pim/',
  clientId:     'alice-client-id',
  clientSecret: 'alice-client-secret',
});

// Record a diagnosis
const condition = await pim.conditions.create({
  code: {
    system:  'http://snomed.info/id/',
    code:    '44054006',
    display: 'Type 2 diabetes mellitus',
  },
  status:    'active',
  onsetDate: '2021-03-15',
});

console.log('Saved at:', condition.url);

// List all conditions
const all = await pim.conditions.findAll();
console.log('Conditions:', all.length);
```

---

## Error handling

All repository operations throw typed errors from `src/errors.ts`:

| Error class | When thrown | Key properties |
|---|---|---|
| `ValidationError` | Required fields missing, invalid values, or absent `url` on update | `issues: ValidationIssue[]` – per-field `field`, `reason`, `value` |
| `NotFoundError` | Pod resource does not exist (404 equivalent) | `url: string` |
| `AuthError` | Session not authenticated or credentials insufficient | `message` |
| `ConflictError` | Write conflict on the pod (409 equivalent) | `url`, `message` |

```typescript
import { ValidationError, NotFoundError } from './dist';

try {
  await pim.conditions.create({ code: { system: '', code: '' }, status: 'active' });
} catch (err) {
  if (err instanceof ValidationError) {
    console.error('Validation failed:');
    for (const issue of err.issues) {
      console.error(` • ${issue.field}: ${issue.reason}`);
    }
  }
}
```

---



Two flows are supported:

### Client Credentials (headless)
Suitable for local scripts and server-side tools.  
Requires a client ID/secret issued by the local CSS (see the `localSolidCommunityServer` docs).

```typescript
const pim = await HealthPIM.create({ podServerUrl, podBaseUrl, podPath, clientId, clientSecret });
```

### Interactive OIDC
Suitable for user-facing web applications.

```typescript
const pim = await HealthPIM.create({ podServerUrl, podBaseUrl, podPath, redirectUrl });
const loginUrl = await pim.auth.beginInteractiveLogin();
// Redirect the user to loginUrl …
// On callback:
await pim.auth.handleLoginCallback(callbackUrl);
```

---

## Solid API Alignment

This application follows the Solid specification in the following ways:

| Aspect | Implementation |
|---|---|
| **Identity** | WebID via OIDC (CSS v7+) |
| **Authentication** | [Solid-OIDC](https://solidproject.org/TR/oidc) via `@inrupt/solid-client-authn-node` |
| **Data access** | [Solid Protocol](https://solidproject.org/TR/protocol) via `@inrupt/solid-client` |
| **Data format** | RDF / Turtle (`.ttl`) |
| **Schema validation** | [ShEx 2.1](https://shex.io/shex-semantics/) (schema files in `src/schemas/`) |
| **Access control** | WAC/ACP as configured on the local CSS pod |
| **Storage** | LDP containers – one per health resource type |

---

## Project Structure

```
src/
├── auth/               # Solid authentication (SolidAuthService)
├── pod/                # Low-level Solid pod client (PodClient)
├── repositories/       # Domain CRUD repositories (one per health type)
├── schemas/            # ShEx shape definitions (.shex) + registry
├── types/              # TypeScript types for all health entities
└── utils/              # RDF namespace helpers, URI builders

config/
├── default.json        # Default configuration (safe to commit)
└── local.json.example  # Template for local secrets (copy → local.json)

tests/
├── schemas/            # Schema registry tests
├── types/              # Type-level tests
└── utils/              # RDF utility tests
```

---

## Development

```bash
npm run build              # Compile TypeScript → dist/
npm test                   # Run Jest unit + round-trip tests (97+ tests)
npm run test:integration   # Run integration tests (requires live CSS + env vars)
npm run test:integration:docker  # Run integration tests in Docker
npm run lint               # ESLint
npm run lint:fix           # ESLint auto-fix
npm run typecheck          # TypeScript type-check without emitting
npm run dev                # Run src/index.ts directly via ts-node
npm run clean              # Remove dist/
```

### Project structure

```
src/
├── auth/               # Solid authentication (SolidAuthService)
├── errors.ts           # Typed error classes (ValidationError, NotFoundError, …)
├── pod/                # Low-level Solid pod client (PodClient)
├── repositories/       # Domain CRUD repositories (one per health type)
├── schemas/            # ShEx shape definitions (.shex) + registry
├── types/              # TypeScript types for all health entities
└── utils/              # RDF namespace helpers, URI builders

config/
├── default.json        # Default configuration (safe to commit)
└── local.json.example  # Template for local secrets (copy → local.json)

tests/
├── integration/        # Integration tests (require live CSS endpoint)
├── roundtrip/          # RDF domain ↔ Thing round-trip tests
├── schemas/            # Schema registry tests
├── types/              # Type-level tests
├── unit/               # Unit tests (auth, pod, repositories)
└── utils/              # RDF utility tests

scripts/
└── wait-for-pod.sh     # Waits for a CSS endpoint to become healthy

.env.example            # Environment variable template
docker-compose.test.yml # Containerised integration test runner
Dockerfile.test         # Docker image for the test runner
.github/workflows/
└── ci.yml              # GitHub Actions CI pipeline
```

---

## License

MIT – see [LICENSE](LICENSE).
