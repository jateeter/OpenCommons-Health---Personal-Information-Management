#!/usr/bin/env node
import { createHash, createSign, generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, copyFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, dirname, join } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const envFile = process.env.EPIC_ENV_FILE ?? join(repoRoot, '.env.epic-sandbox.local');
const secretDir = process.env.EPIC_DYNAMIC_CLIENT_SECRET_DIR ?? join(repoRoot, '.secrets/epic-dynamic-client');
const resetKey = process.argv.includes('--reset-key');
const timeoutMs = Number.parseInt(process.env.EPIC_DCR_TIMEOUT_MS ?? `${10 * 60 * 1000}`, 10);
const skipDynamicGrantTest = process.env.EPIC_DCR_SKIP_DYNAMIC_GRANT_TEST === '1';

main().catch((error) => {
  console.error(`ERROR: ${safeMessage(error)}`);
  process.exit(1);
});

async function main() {
  mkdirSync(secretDir, { recursive: true });
  if (resetKey) resetDynamicClientKeyMaterial();

  const env = loadEnv(envFile);
  // Keep the temporary one-shot listener independent from the deployed PIM.
  const callbackUrl = new URL(process.env.EPIC_DCR_REDIRECT_URI ?? required(env, 'EPIC_REDIRECT_URI'));
  const fhirBaseUrl = required(env, 'EPIC_FHIR_BASE_URL');
  const softwareClientId = required(env, 'EPIC_CLIENT_ID');
  const registrationPath = env.EPIC_DYNAMIC_CLIENT_REGISTRATION_REQUEST_FILE
    ? resolveRepoPath(env.EPIC_DYNAMIC_CLIENT_REGISTRATION_REQUEST_FILE)
    : join(secretDir, 'dynamic-client-registration.request.json');
  const metadataPath = env.EPIC_DYNAMIC_CLIENT_METADATA_FILE
    ? resolveRepoPath(env.EPIC_DYNAMIC_CLIENT_METADATA_FILE)
    : join(secretDir, 'metadata.json');
  const statePath = join(secretDir, 'initial-smart-state.json');
  const startPath = join(secretDir, 'initial-smart-start.json');
  const responsePath = join(secretDir, 'dynamic-client-registration.response.json');

  if (callbackUrl.hostname !== 'localhost' && callbackUrl.hostname !== '127.0.0.1') {
    throw new Error(`EPIC_REDIRECT_URI must be localhost for this one-shot helper; received host ${callbackUrl.host}.`);
  }

  forceInitialPublicSmartEnv(envFile, env);
  alignRegistrationAndMetadata({
    registrationPath,
    metadataPath,
    softwareClientId,
    fhirBaseUrl,
    redirectUri: callbackUrl.href,
  });

  const smart = await discover(fhirBaseUrl);
  const state = `dcr-${Date.now()}`;
  const codeVerifier = randomUrlSafe(64);
  const codeChallenge = sha256Base64Url(codeVerifier);
  writeJsonSecret(statePath, { state, codeVerifier, createdAt: new Date().toISOString() });

  const authorizationUrl = authorizationUrlFor({
    authorizationEndpoint: smart.authorization_endpoint,
    clientId: softwareClientId,
    redirectUri: callbackUrl.href,
    scopes: scopes(env),
    state,
    aud: stripTrailingSlash(fhirBaseUrl),
    codeChallenge,
  });
  writeJsonSecret(startPath, {
    createdAt: new Date().toISOString(),
    purpose: 'Open this URL in a normal browser to complete the initial Epic Sandbox SMART authorization for DCR.',
    authorizationUrl,
    redirectUri: callbackUrl.href,
    state,
    scopes: scopes(env),
    fhirBaseUrl: stripTrailingSlash(fhirBaseUrl),
  });

  console.log('Epic DCR one-shot helper is waiting for the SMART callback.');
  console.log('Open this URL in your normal browser and complete MyChart authorization:');
  console.log(authorizationUrl);
  console.log('');
  console.log(`The same URL was saved to ${startPath}`);
  console.log(`Listening on ${callbackUrl.origin}${callbackUrl.pathname}`);
  console.log('No tokens, authorization codes, patient ids, or FHIR resource ids will be printed.');

  const callback = await waitForCallback(callbackUrl, state, timeoutMs);
  const token = await exchangeAuthorizationCode({
    tokenEndpoint: smart.token_endpoint,
    code: callback.code,
    codeVerifier,
    redirectUri: callbackUrl.href,
    clientId: softwareClientId,
  });

  const accessToken = stringValue(token.access_token);
  if (!accessToken) throw new Error('Initial SMART token response did not include the access token required for Dynamic Client Registration.');

  const registrationEndpoint = registrationEndpointFrom(metadataPath);
  const registrationRequest = JSON.parse(readFileSync(registrationPath, 'utf8'));
  const dcr = await registerDynamicClient(registrationEndpoint, accessToken, registrationRequest);
  const dynamicClientId = stringValue(dcr.client_id);
  if (!dynamicClientId) throw new Error('Epic Dynamic Client Registration response did not include client_id.');

  writeJsonSecret(responsePath, redactDcrResponseForLocalStorage(dcr));
  updateEnvLine(envFile, 'EPIC_DYNAMIC_CLIENT_ID', dynamicClientId);
  updateEnvLine(envFile, 'EPIC_CONNECT_FLOW', 'dynamic_jwt_bearer');
  updateEnvLine(envFile, 'EPIC_CLIENT_AUTH_METHOD', 'auto');
  updateMetadata(metadataPath, { issuerSubject: dynamicClientId, dcrCompletedAt: new Date().toISOString() });

  const dynamicResult = skipDynamicGrantTest
    ? { ok: true, skipped: true, hasPatient: false }
    : await tryDynamicBearerGrant({
      tokenEndpoint: smart.token_endpoint,
      fhirBaseUrl,
      dynamicClientId,
      keyId: required(loadEnv(envFile), 'EPIC_CLIENT_ASSERTION_KID'),
      privateKeyPath: resolveRepoPath(required(loadEnv(envFile), 'EPIC_CLIENT_ASSERTION_PRIVATE_KEY_FILE')),
      algorithm: loadEnv(envFile).EPIC_CLIENT_ASSERTION_ALG ?? 'RS384',
      scopes: scopes(loadEnv(envFile)),
    });

  console.log('');
  console.log('Epic Dynamic Client Registration completed.');
  console.log(`  Dynamic client id stored: yes`);
  console.log(`  Local env switched to: dynamic_jwt_bearer`);
  console.log(`  Dynamic JWT bearer token test: ${dynamicResult.skipped ? 'skipped for PIM first exchange' : dynamicResult.ok ? 'ok' : `failed (${dynamicResult.error})`}`);
  if (dynamicResult.ok && !dynamicResult.skipped) {
    console.log(`  Token response included patient context: ${dynamicResult.hasPatient ? 'yes' : 'no'}`);
  }
}

function resetDynamicClientKeyMaterial() {
  const archiveDir = join(secretDir, 'archive', new Date().toISOString().replace(/[:.]/g, '-'));
  mkdirSync(archiveDir, { recursive: true });
  for (const file of [
    'private-key.pem',
    'public-key.pem',
    'publickey509.pem',
    'jwks.json',
    'private-jwks.json',
    'dynamic-client-registration.request.json',
    'dynamic-client-registration.response.json',
    'metadata.json',
    'initial-smart-state.json',
    'initial-smart-start.json',
  ]) {
    const source = join(secretDir, file);
    if (existsSync(source)) copyFileSync(source, join(archiveDir, file));
  }

  const env = loadEnv(envFile);
  const kid = `och-epic-dcr-${randomBytes(12).toString('base64url')}`;
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 3072 });
  const publicJwk = publicKey.export({ format: 'jwk' });
  const privateJwk = privateKey.export({ format: 'jwk' });
  const publicKeyEntry = { kty: 'RSA', n: publicJwk.n, e: publicJwk.e, kid, use: 'sig', alg: 'RS384' };
  const privateKeyEntry = { ...privateJwk, kid, use: 'sig', alg: 'RS384' };
  writeSecret('private-key.pem', privateKey.export({ type: 'pkcs8', format: 'pem' }));
  writeSecret('public-key.pem', publicKey.export({ type: 'spki', format: 'pem' }));
  writeSecret('publickey509.pem', publicKey.export({ type: 'spki', format: 'pem' }));
  writeJsonSecret(join(secretDir, 'jwks.json'), { keys: [publicKeyEntry] });
  writeJsonSecret(join(secretDir, 'private-jwks.json'), { keys: [privateKeyEntry] });
  updateEnvLine(envFile, 'EPIC_CLIENT_ASSERTION_PRIVATE_KEY_FILE', '.secrets/epic-dynamic-client/private-key.pem');
  updateEnvLine(envFile, 'EPIC_CLIENT_ASSERTION_KID', kid);
  updateEnvLine(envFile, 'EPIC_CLIENT_ASSERTION_ALG', 'RS384');
  updateEnvLine(envFile, 'EPIC_DYNAMIC_CLIENT_ID', '');
  updateEnvLine(envFile, 'EPIC_DYNAMIC_CLIENT_PUBLIC_JWKS_FILE', '.secrets/epic-dynamic-client/jwks.json');
  updateEnvLine(envFile, 'EPIC_DYNAMIC_CLIENT_METADATA_FILE', '.secrets/epic-dynamic-client/metadata.json');
  updateEnvLine(envFile, 'EPIC_DYNAMIC_CLIENT_REGISTRATION_REQUEST_FILE', '.secrets/epic-dynamic-client/dynamic-client-registration.request.json');

  const softwareId = env.EPIC_CLIENT_ID ?? '';
  writeJsonSecret(join(secretDir, 'dynamic-client-registration.request.json'), {
    software_id: softwareId,
    jwks: { keys: [publicKeyEntry] },
    grant_types: ['urn:ietf:params:oauth:grant-type:jwt-bearer'],
    token_endpoint_auth_method: 'none',
  });
  writeJsonSecret(join(secretDir, 'metadata.json'), {
    createdAt: new Date().toISOString(),
    purpose: 'Fresh Epic sandbox dynamic client registration attempt',
    environment: 'sandbox',
    keyType: 'RSA',
    modulusLength: 3072,
    algorithm: 'RS384',
    kid,
    softwareId,
    issuerSubject: 'pending Epic DCR client_id',
    fhirBaseUrl: env.EPIC_FHIR_BASE_URL,
    authorizationEndpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
    tokenEndpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
    registrationEndpoint: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/register',
    redirectUri: env.EPIC_REDIRECT_URI,
  });
}

function forceInitialPublicSmartEnv(file, env) {
  updateEnvLine(file, 'EPIC_CONNECT_FLOW', 'authorization_code');
  updateEnvLine(file, 'EPIC_CLIENT_AUTH_METHOD', 'none');
  updateEnvLine(file, 'EPIC_CLIENT_SECRET', '');
  updateEnvLine(file, 'EPIC_CLIENT_SECRET_FILE', '');
  updateEnvLine(file, 'EPIC_DYNAMIC_CLIENT_ID', '');
  if (!env.EPIC_CLIENT_ID) throw new Error('EPIC_CLIENT_ID must be set to the Epic Non-Production Client ID before starting DCR.');
}

function alignRegistrationAndMetadata({ registrationPath, metadataPath, softwareClientId, fhirBaseUrl, redirectUri }) {
  const registration = JSON.parse(readFileSync(registrationPath, 'utf8'));
  registration.software_id = softwareClientId;
  if (!registration.jwks?.keys?.length) throw new Error(`${basename(registrationPath)} does not include a public JWKS.`);
  writeJsonSecret(registrationPath, registration);

  const metadata = existsSync(metadataPath) ? JSON.parse(readFileSync(metadataPath, 'utf8')) : {};
  metadata.softwareId = softwareClientId;
  metadata.fhirBaseUrl = fhirBaseUrl;
  metadata.redirectUri = redirectUri;
  metadata.registrationEndpoint ??= 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/register';
  writeJsonSecret(metadataPath, metadata);
}

async function discover(fhirBaseUrl) {
  const url = new URL('.well-known/smart-configuration', ensureTrailingSlash(fhirBaseUrl));
  const response = await fetch(url.href, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`SMART discovery failed with HTTP ${response.status}.`);
  const body = await response.json();
  if (!body.authorization_endpoint || !body.token_endpoint) {
    throw new Error('SMART discovery did not include authorization_endpoint and token_endpoint.');
  }
  return body;
}

function authorizationUrlFor({ authorizationEndpoint, clientId, redirectUri, scopes, state, aud, codeChallenge }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    aud,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${authorizationEndpoint}?${params.toString()}`;
}

function waitForCallback(callbackUrl, expectedState, timeout) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const requestUrl = new URL(req.url ?? '/', callbackUrl.origin);
      if (requestUrl.pathname !== callbackUrl.pathname) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not found');
        return;
      }
      const code = requestUrl.searchParams.get('code');
      const state = requestUrl.searchParams.get('state');
      const error = requestUrl.searchParams.get('error');
      if (error) {
        res.writeHead(400, { 'content-type': 'text/html' });
        res.end('<h1>Epic authorization failed</h1><p>You can return to Codex.</p>');
        cleanup();
        reject(new Error(`Epic authorization returned error: ${error}`));
        return;
      }
      if (!code) {
        res.writeHead(202, { 'content-type': 'text/html' });
        res.end('<h1>Epic authorization listener is active</h1><p>No authorization code was present on this request. Return to the current Epic authorization URL and continue.</p>');
        console.log('Ignored a callback request with no authorization code.');
        return;
      }
      if (state !== expectedState) {
        res.writeHead(400, { 'content-type': 'text/html' });
        res.end('<h1>Epic authorization callback state did not match</h1><p>This looks like a stale authorization URL. Return to the current Epic authorization URL and continue.</p>');
        console.log('Ignored a callback request with a stale or mismatched state.');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<h1>Epic authorization captured</h1><p>You can return to Codex.</p>');
      cleanup();
      resolve({ code });
    });
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for Epic SMART callback.'));
    }, timeout);
    const cleanup = () => {
      clearTimeout(timer);
      server.close();
    };
    server.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    server.listen(Number(callbackUrl.port || '80'), callbackUrl.hostname);
  });
}

async function exchangeAuthorizationCode({ tokenEndpoint, code, codeVerifier, redirectUri, clientId }) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  });
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Initial SMART token exchange failed: ${body.error ?? `HTTP ${response.status}`}`);
  return body;
}

async function registerDynamicClient(endpoint, bearerToken, body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { accept: 'application/json', authorization: `Bearer ${bearerToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Dynamic Client Registration failed: ${responseBody.error ?? `HTTP ${response.status}`}`);
  return responseBody;
}

async function tryDynamicBearerGrant({ tokenEndpoint, dynamicClientId, keyId, privateKeyPath, algorithm, scopes }) {
  try {
    const privateKey = readFileSync(privateKeyPath, 'utf8');
    const now = Math.floor(Date.now() / 1000);
    const assertion = signedJwt({
      header: { alg: algorithm, typ: 'JWT', kid: keyId },
      payload: { iss: dynamicClientId, sub: dynamicClientId, aud: tokenEndpoint, jti: randomUUID(), nbf: now - 60, exp: now + 300, iat: now },
      privateKey,
      algorithm,
    });
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
      client_id: dynamicClientId,
      scope: scopes.join(' '),
    });
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: body.error ?? `HTTP ${response.status}` };
    return { ok: true, hasPatient: Boolean(body.patient) };
  } catch (error) {
    return { ok: false, error: safeMessage(error) };
  }
}

function signedJwt({ header, payload, privateKey, algorithm }) {
  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signer = createSign(algorithm === 'RS256' ? 'RSA-SHA256' : 'RSA-SHA384');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(privateKey).toString('base64url')}`;
}

function updateMetadata(file, patch) {
  const metadata = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  writeJsonSecret(file, { ...metadata, ...patch });
}

function registrationEndpointFrom(metadataPath) {
  const metadata = existsSync(metadataPath) ? JSON.parse(readFileSync(metadataPath, 'utf8')) : {};
  return metadata.registrationEndpoint || 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/register';
}

function redactDcrResponseForLocalStorage(response) {
  return response;
}

function scopes(env) {
  return (env.EPIC_SCOPES?.trim()
    ? env.EPIC_SCOPES.trim().split(/\s+/)
    : ['openid', 'fhirUser', 'launch/patient', 'patient/Patient.rs']).filter(Boolean);
}

function loadEnv(file) {
  const env = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[line.slice(0, index).trim()] = value;
  }
  return env;
}

function updateEnvLine(file, key, value) {
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split(/\r?\n/) : [];
  let found = false;
  const next = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  writeFileSync(file, `${next.join('\n').replace(/\n*$/, '')}\n`);
  chmodSync(file, 0o600);
}

function writeSecret(file, data) {
  const target = join(secretDir, file);
  writeFileSync(target, data);
  chmodSync(target, 0o600);
}

function writeJsonSecret(file, data) {
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  chmodSync(file, 0o600);
}

function resolveRepoPath(value) {
  return value.startsWith('/') ? value : join(repoRoot, value);
}

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function stringValue(value) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function randomUrlSafe(length) {
  return randomBytes(length).toString('base64url');
}

function sha256Base64Url(value) {
  return createHash('sha256').update(value).digest('base64url');
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function safeMessage(error) {
  let message = error instanceof Error ? error.message : String(error);
  message = message.replace(/eyJ[A-Za-z0-9._-]+/g, '<jwt>');
  message = message.replace(/Bearer\s+\S+/gi, 'Bearer <redacted>');
  message = message.replace(/[A-Za-z0-9_-]{40,}/g, '<redacted>');
  return message.split('\n')[0].slice(0, 260);
}
