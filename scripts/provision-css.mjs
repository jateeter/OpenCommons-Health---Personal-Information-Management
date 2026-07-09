import fs from 'node:fs/promises';
import path from 'node:path';

await main();

async function main() {
  const baseUrl = required('CSS_BASE_URL').replace(/\/?$/, '/');
  const publicBaseUrl = (process.env.CSS_PUBLIC_BASE_URL?.trim() || baseUrl).replace(/\/?$/, '/');
  const internalBaseUrl = (process.env.CSS_INTERNAL_BASE_URL?.trim() || baseUrl).replace(/\/?$/, '/');
  const email = required('CSS_ACCOUNT_EMAIL');
  const password = required('CSS_ACCOUNT_PASSWORD');
  const podName = required('CSS_POD_NAME');
  const outputFile = required('CSS_CLIENT_CREDENTIALS_FILE');

  const anonymous = await getJson(new URL('.account/', internalBaseUrl), { publicBaseUrl, internalBaseUrl });
  const login = await postJson(anonymous.controls.password.login, { email, password }, {}, { publicBaseUrl, internalBaseUrl });
  const authorization = login.authorization;
  if (!authorization) throw new Error('CSS password login did not return an account authorization token.');

  const headers = { authorization: `CSS-Account-Token ${authorization}` };
  const account = await getJson(new URL('.account/', internalBaseUrl), headers, { publicBaseUrl, internalBaseUrl });
  const webIds = await getJson(account.controls.account.webId, headers, { publicBaseUrl, internalBaseUrl });
  const expectedWebId = new URL(`${podName}/profile/card#me`, publicBaseUrl).href;
  const webId = Object.keys(webIds.webIdLinks ?? {}).find((value) => value === expectedWebId)
    ?? Object.keys(webIds.webIdLinks ?? {})[0];
  if (!webId) throw new Error('The seeded CSS account has no linked WebID.');

  const existing = await readCredentials(outputFile);
  if (existing?.resource && existing.webId === webId) {
    const credentials = await getJson(account.controls.account.clientCredentials, headers, { publicBaseUrl, internalBaseUrl });
    const resources = Object.values(credentials.clientCredentials ?? {});
    if (resources.includes(existing.resource)) {
      console.log(`Reusing client credentials for ${webId}.`);
      return;
    }
  }

  const created = await postJson(
    account.controls.account.clientCredentials,
    { name: 'opencommons-health-pim', webId },
    headers,
    { publicBaseUrl, internalBaseUrl },
  );
  if (!created.id || !created.secret || !created.resource) {
    throw new Error('CSS did not return a complete client credentials response.');
  }

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  const temporary = `${outputFile}.tmp`;
  await fs.writeFile(temporary, JSON.stringify({
    clientId: created.id,
    clientSecret: created.secret,
    resource: created.resource,
    webId,
  }), { mode: 0o600 });
  await fs.rename(temporary, outputFile);
  console.log(`Provisioned client credentials for ${webId}.`);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function readCredentials(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function getJson(url, headers = {}, routing = {}) {
  return requestJson(url, { headers }, routing);
}

async function postJson(url, body, headers = {}, routing = {}) {
  return requestJson(url, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }, routing);
}

async function requestJson(url, init, routing = {}) {
  const requested = new URL(url);
  const response = await fetch(fetchUrlFor(requested, routing), init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`CSS returned non-JSON from ${requested.href}: HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`CSS request failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

function fetchUrlFor(url, routing) {
  if (!routing.publicBaseUrl || !routing.internalBaseUrl) return url;
  if (routing.publicBaseUrl === routing.internalBaseUrl) return url;
  if (!url.href.startsWith(routing.publicBaseUrl)) return url;
  return new URL(`${routing.internalBaseUrl}${url.href.slice(routing.publicBaseUrl.length)}`);
}
