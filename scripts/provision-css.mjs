import fs from 'node:fs/promises';
import path from 'node:path';

await main();

async function main() {
  const baseUrl = required('CSS_BASE_URL').replace(/\/?$/, '/');
  const email = required('CSS_ACCOUNT_EMAIL');
  const password = required('CSS_ACCOUNT_PASSWORD');
  const podName = required('CSS_POD_NAME');
  const outputFile = required('CSS_CLIENT_CREDENTIALS_FILE');

  const anonymous = await getJson(new URL('.account/', baseUrl));
  const login = await postJson(anonymous.controls.password.login, { email, password });
  const authorization = login.authorization;
  if (!authorization) throw new Error('CSS password login did not return an account authorization token.');

  const headers = { authorization: `CSS-Account-Token ${authorization}` };
  const account = await getJson(new URL('.account/', baseUrl), headers);
  const webIds = await getJson(account.controls.account.webId, headers);
  const expectedWebId = new URL(`${podName}/profile/card#me`, baseUrl).href;
  const webId = Object.keys(webIds.webIdLinks ?? {}).find((value) => value === expectedWebId)
    ?? Object.keys(webIds.webIdLinks ?? {})[0];
  if (!webId) throw new Error('The seeded CSS account has no linked WebID.');

  const existing = await readCredentials(outputFile);
  if (existing?.resource && existing.webId === webId) {
    const credentials = await getJson(account.controls.account.clientCredentials, headers);
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

async function getJson(url, headers = {}) {
  return requestJson(url, { headers });
}

async function postJson(url, body, headers = {}) {
  return requestJson(url, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`CSS returned non-JSON from ${url}: HTTP ${response.status}`);
  }
  if (!response.ok) {
    throw new Error(`CSS request failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}
