# OpenCommons Health PIM Guidance

Last reviewed: 2026-11-09

See `/Users/johnt/workspace/GitHub/CLAUDE.md` for the integrated application map. PIM joined the RealityEngine focus set on 2026-11-09 (owner). Update both this file and the root map when PIM's role, its links, or its startup paths change. `AGENTS.md` is the repo's own operating contract (privacy, PHI, local deployment) and still applies.

## Role

PIM is the personal health information manager backed by a local Solid Community Server POD. In the suite it is the authoritative POD writer on the HealthKit → PIM → POD mirror (localHealthkitBridge `docs/MIRROR_CONTRACT.md`, MVP D2), and it pushes the owner's approved HealthKit scope to the PEs (`POST /api/integrations/healthkit/scope`).

## Links and lane TLS (PIM#86, RealityEngine_CI#668)

With `RE_TLS_CERT`, `RE_TLS_KEY`, `RE_TLS_CA` (and optionally `RE_TLS_CRL`) set, `src/laneTls.ts` applies RealityEngine_CI `docs/TRANSPORT_SECURITY.md`:

- PIM serves https only, TLS 1.3 at the transport profile. It is a user-facing port (the browser UI and the HealthKit bridge), so it uses server TLS and requests no client certificate.
- Calls to internal peers (its CSS, the PEs) trust the lane CA alone, present PIM's certificate and are held to the profile. The hooks are global, because the Solid client uses `fetch` (undici's global dispatcher) and openid-client uses `node:https` (`https.globalAgent`).
- Calls to external peers (Epic) use the system store and are held to TLS 1.3.
- On the lane, a plaintext URL to an internal peer is refused when the configuration loads.

PIM's CSS serves TLS 1.3 itself (`config/css-https.json` plus the `docker-compose.tls.yml` / `docker-compose.host-local.tls.yml` overlays). CSS cannot verify client certificates, so PIM → CSS is TLS without mTLS. That is an owner-accepted deficiency (2026-11-09), recorded in RealityEngine_CI `config/transport-inventory.json`.

```bash
eval "$(scripts/lane-tls-certs.sh)"   # issue pim + pim-css from the suite PKI, link under runtime/tls
./scripts/local-host-solid-up.sh      # PIM_TLS_DIR set: CSS on https, the env file turns PIM's lane on
./scripts/local-host-start.sh
```

RealityEngine_CI `scripts/pim-mirror-leg.sh` runs the mirror leg on the lane when `RE_TLS=on`.

## Key Commands

```bash
npm ci
npm run build
npm test                 # jest unit suites (tests/unit, ...)
npm run lint
npm run typecheck
```

## Standing rules

The standing rules are in
`../RealityEngine_CI/docs/ENGINEERING_CONTRACT.md`, which is
authoritative. They are not listed or summarised here, so this file never
falls behind the contract. Read it before changing anything here.
