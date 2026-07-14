#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import net from 'node:net';

const host = process.env.HOST ?? '127.0.0.1';
const checkDocker = (process.env.CHECK_DOCKER ?? 'true') !== 'false';
const checkPorts = (process.env.CHECK_PORTS ?? 'true') !== 'false';
const failures = [];
const warnings = [];

const requestedPorts = [
  ['APP_PORT', process.env.APP_PORT ?? '8080'],
  ['CSS_PORT', process.env.CSS_PORT ?? '3000'],
  ...extraPorts(),
];

for (const [name, value] of requestedPorts) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    failures.push(`${name} must be an integer TCP port from 1 through 65535; received ${JSON.stringify(value)}.`);
  }
}

const portOwners = new Map();
for (const [name, value] of requestedPorts) {
  if (!/^\d+$/.test(value)) continue;
  const existing = portOwners.get(value);
  if (existing) {
    failures.push(`${name}=${value} duplicates ${existing}; choose distinct APP_PORT/CSS_PORT values.`);
  } else {
    portOwners.set(value, name);
  }
}

if (checkDocker) {
  const docker = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (docker.status !== 0) {
    const detail = (docker.stderr || docker.stdout || docker.error?.message || 'Docker daemon is not reachable.').trim();
    failures.push(`Docker is required for local Solid infrastructure but is not reachable: ${detail}`);
  }
}

if (checkPorts && failures.length === 0) {
  for (const [name, value] of requestedPorts) {
    await assertPortAvailable(name, Number(value));
  }
}

if (failures.length > 0) {
  console.error('Local deployment preflight failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('');
  console.error('Set APP_PORT and CSS_PORT to unused localhost ports, or set CHECK_PORTS=false only when reusing an already-running stack intentionally.');
  process.exit(1);
}

console.log('Local deployment preflight passed.');
for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}
console.log(`  Host: ${host}`);
console.log(`  APP_PORT: ${process.env.APP_PORT ?? '8080'}`);
console.log(`  CSS_PORT: ${process.env.CSS_PORT ?? '3000'}`);
console.log(`  Docker: ${checkDocker ? 'reachable' : 'not checked'}`);
console.log(`  Ports: ${checkPorts ? portStatus() : 'not checked'}`);

function extraPorts() {
  return (process.env.EXTRA_PORTS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value, index) => [`EXTRA_PORTS[${index}]`, value]);
}

function portStatus() {
  return warnings.length > 0 ? 'not fully verified' : 'available';
}

function assertPortAvailable(name, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error) => {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code === 'EADDRINUSE') {
        failures.push(`${name}=${port} is already in use on ${host}. Choose a different port or stop the conflicting service.`);
      } else if (code === 'EACCES' || code === 'EPERM') {
        warnings.push(`${name}=${port} could not be probed on ${host} because this environment denied bind checks; continuing without port availability proof.`);
      } else {
        failures.push(`${name}=${port} cannot be probed on ${host}: ${error instanceof Error ? error.message : String(error)}`);
      }
      resolve();
    });
    server.once('listening', () => {
      server.close(() => resolve());
    });
    server.listen(port, host);
  });
}
