import http from 'node:http';
import { HealthPIM } from './index';
import { contextFromPim, createRequestHandler, type ApplicationContext } from './httpApp';
import { loadServerRuntimeConfig, loadSolidRuntimeConfig } from './runtimeConfig';

let contextPromise: Promise<ApplicationContext> | undefined;
function provideContext(): Promise<ApplicationContext> {
  if (!contextPromise) {
    contextPromise = (async () => {
      const solid = loadSolidRuntimeConfig();
      const pim = await HealthPIM.create({
        podServerUrl: solid.podServerUrl,
        oidcIssuer: solid.oidcIssuer,
        podBaseUrl: solid.podBaseUrl,
        podPath: solid.podPath,
        redirectUrl: solid.redirectUrl,
        clientId: solid.clientId,
        clientSecret: solid.clientSecret,
      });
      return contextFromPim(pim, solid.podServerUrl, solid.podBaseUrl);
    })();
    contextPromise.catch(() => {
      contextPromise = undefined;
    });
  }
  return contextPromise;
}

const { port, host } = loadServerRuntimeConfig();
const requestHandler = createRequestHandler(provideContext);
const server = http.createServer((req, res) => {
  void requestHandler(req, res);
});

server.listen(port, host, () => {
  console.log(`OpenCommons Health listening on http://${host}:${port}`);
});

function shutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
