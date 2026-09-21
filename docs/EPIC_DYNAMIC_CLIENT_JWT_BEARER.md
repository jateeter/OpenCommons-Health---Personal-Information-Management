# Epic dynamic client JWT bearer connection

OpenCommons Health PIM supports two Epic localhost connection flows. The default
flow remains the existing SMART authorization-code redirect/callback workflow.
The dynamic client flow is opt-in and uses an Epic-issued dynamic client id plus
a locally stored private key to request a patient-bound access token with the
JWT bearer authorization grant.

## Flow switch

Use the existing flow:

```sh
EPIC_CONNECT_FLOW=authorization_code
EPIC_CLIENT_AUTH_METHOD=auto
```

Use the dynamic client JWT bearer flow:

```sh
EPIC_CONNECT_FLOW=dynamic_jwt_bearer
EPIC_DYNAMIC_CLIENT_ID=<dynamic-client-id-returned-by-Epic-DCR>
EPIC_CLIENT_ASSERTION_PRIVATE_KEY_FILE=.secrets/epic-dynamic-client/private-key.pem
EPIC_CLIENT_ASSERTION_KID=<kid-from-the-registered-jwks>
EPIC_CLIENT_ASSERTION_ALG=RS384
EPIC_DYNAMIC_CLIENT_PUBLIC_JWKS_FILE=.secrets/epic-dynamic-client/jwks.json
EPIC_DYNAMIC_CLIENT_METADATA_FILE=.secrets/epic-dynamic-client/metadata.json
EPIC_DYNAMIC_CLIENT_REGISTRATION_REQUEST_FILE=.secrets/epic-dynamic-client/dynamic-client-registration.request.json
```

For Docker deployment, mount `.secrets` through the compose-provided read-only
volume and use the container path:

```sh
EPIC_CLIENT_ASSERTION_PRIVATE_KEY_FILE=/run/opencommons-secrets/epic-dynamic-client/private-key.pem
```

## Dynamic client setup sequence

The one-shot listener can use a port separate from the deployed PIM callback:

```sh
EPIC_REDIRECT_URI=http://localhost:18080/api/integrations/epic/connect/callback
EPIC_DCR_REDIRECT_URI=http://localhost:18081/api/integrations/epic/connect/callback \
EPIC_DCR_SKIP_DYNAMIC_GRANT_TEST=1 \
  npm run epic:dcr
```

`EPIC_DCR_REDIRECT_URI` affects only the temporary authorization listener and
does not replace the PIM's configured redirect URI.
`EPIC_DCR_SKIP_DYNAMIC_GRANT_TEST=1` reserves the newly registered client's
first patient-bound JWT bearer exchange for the PIM instead of consuming it in
the one-shot helper.

1. Complete the public standalone SMART launch using the Epic-issued application
   client id. Epic returns a one-time registration access token for dynamic
   client registration.
2. Register the local dynamic client with Epic using the public JWKS from
   `.secrets/epic-dynamic-client/jwks.json`.
3. Save the returned `client_id` as `EPIC_DYNAMIC_CLIENT_ID`.
4. Start the PIM with `EPIC_CONNECT_FLOW=dynamic_jwt_bearer`.
5. Press **Connect Epic**. In this mode the PIM signs a one-time JWT assertion
   locally, posts it to Epic's token endpoint with
   `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`, stores the returned
   grant encrypted in the owner Solid Pod, and does not perform a browser
   callback.

## Security contract

- `.secrets/` is gitignored and must remain local-only.
- Never log or commit private keys, JWT assertions, registration access tokens,
  authorization codes, access tokens, refresh tokens, patient ids, or raw FHIR
  payloads.
- The JWT header uses the configured `kid` and algorithm.
- For the dynamic JWT bearer grant, the JWT payload uses the dynamic client id
  as both `iss` and `sub`, the discovered Epic token endpoint as `aud`, and
  short-lived `iat`/`nbf`/`exp` claims. This JWT is sent as the token request
  `assertion`.
- For `private_key_jwt` client authentication on authorization-code or refresh
  token calls, the JWT payload uses the client id as `iss` and `sub`, the Epic
  token endpoint as `aud`, and is sent as `client_assertion` with
  `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer`.
- The current client-secret/basic authorization-code connection remains
  available and is selected unless `EPIC_CONNECT_FLOW=dynamic_jwt_bearer` is set.
