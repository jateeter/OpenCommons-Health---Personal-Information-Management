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

### Related Repositories

| Repository | Purpose |
|---|---|
| **OpenCommons-Health---Personal-Information-Management** *(this repo)* | TypeScript PIM library – types, schemas, Solid auth, pod client, repositories |
| **localSolidCommunityServer** *(coming soon)* | Docker / configuration for the local single-user CSS pod that backs this application |

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
| Insurance Policies | `src/schemas/insurance.shex` | *(planned)* |

Coding systems used: **SNOMED CT** (conditions, allergies), **RxNorm** (medications), **CVX** (vaccines), **LOINC** (lab results, vital signs), **schema.org** (profiles, providers).

---

## Prerequisites

- **Node.js ≥ 18**
- A running **Solid Community Server** instance (see `localSolidCommunityServer`)

## Getting Started

```bash
# 1. Clone and install
git clone https://github.com/jateeter/OpenCommons-Health---Personal-Information-Management.git
cd OpenCommons-Health---Personal-Information-Management
npm install

# 2. Copy and edit local config
cp config/local.json.example config/local.json
# Fill in clientId, clientSecret, podServerUrl, podBaseUrl

# 3. Build
npm run build

# 4. Use the library
```

```typescript
import { HealthPIM } from './dist';

// Headless / server-to-server (CSS client-credentials)
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

## Authentication

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
npm run build      # Compile TypeScript → dist/
npm test           # Run Jest test suite (34 tests)
npm run lint       # ESLint
npm run dev        # Run src/index.ts directly via ts-node
npm run clean      # Remove dist/
```

---

## License

MIT – see [LICENSE](LICENSE).
