import http from 'node:http';
import https from 'node:https';
import { HealthPIM } from './index';
import { installOutboundLaneTls, laneDescription, laneSettings, serverOptions } from './laneTls';
import { contextFromPim, createDeviceRequestHandler, createRequestHandler, type ApplicationContext } from './httpApp';
import { loadDeviceListenerConfig, loadEpicRuntimeConfig, loadHealthKitRuntimeConfig, loadServerRuntimeConfig, loadSolidRuntimeConfig } from './runtimeConfig';
import { HealthKitMirrorService, MetricRegistryPodRepository } from './integrations/healthkit';
import { PillarObservationRepository } from './repositories';
import { EpicConnectionPodRepository, EpicIntegrationService } from './integrations/epic';
import { InMemoryPodActivityLog } from './podActivity';
import { PodActivityRepository } from './podActivityRepository';

let contextPromise: Promise<ApplicationContext> | undefined;
const activityLog = new InMemoryPodActivityLog();
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
      const epicConfig = loadEpicRuntimeConfig();
      const activityRepository = new PodActivityRepository(pim.pod);
      const baseContext = contextFromPim(pim, solid.podServerUrl, solid.podBaseUrl, undefined, activityLog, activityRepository);
      const epic = new EpicIntegrationService(
        epicConfig,
        epicConfig.enabled ? new EpicConnectionPodRepository(pim.pod) : undefined,
        baseContext.repositories,
      );
      await epic.initializeFromPod();
      const healthkitConfig = loadHealthKitRuntimeConfig();
      const healthkit = new HealthKitMirrorService(
        new MetricRegistryPodRepository(pim.pod),
        baseContext.repositories,
        (pillar) => new PillarObservationRepository(pim.pod, pillar),
        { bridgeId: healthkitConfig.bridgeId, peScopeUrls: healthkitConfig.peScopeUrls, peToken: healthkitConfig.peToken },
      );
      return contextFromPim(pim, solid.podServerUrl, solid.podBaseUrl, epic, activityLog, activityRepository, healthkit, healthkitConfig.bridgeToken);
    })();
    contextPromise.catch(() => {
      contextPromise = undefined;
    });
  }
  return contextPromise;
}

const { port, host } = loadServerRuntimeConfig();
const requestHandler = createRequestHandler(provideContext);
// Lane TLS (PIM#86): with RE_TLS_CERT set PIM serves https only and every
// outbound call follows the lane's rules; a partial configuration stops here.
const lane = laneSettings();
if (lane) installOutboundLaneTls(lane);
// The PE scope URLs are environment alone, so they are checked before PIM
// listens: on the lane a plaintext internal one stops PIM here, not at first use.
const healthkitRuntime = loadHealthKitRuntimeConfig();
// The device listener (PIM#91) faces the LAN: it starts only on lane TLS and
// with the bridge token, and a configuration missing either stops PIM here.
const device = loadDeviceListenerConfig();
if (device && !lane) throw new Error('PIM_DEVICE_PORT is set, but lane TLS (RE_TLS_CERT/KEY/CA) is not: the device listener serves https only.');
if (device && !healthkitRuntime.bridgeToken) throw new Error('PIM_DEVICE_PORT is set, but PIM_HEALTHKIT_BRIDGE_TOKEN is not: every device route but /healthz needs it.');
const handle = (req: http.IncomingMessage, res: http.ServerResponse): void => {
  void requestHandler(req, res);
};
const server = lane ? https.createServer(serverOptions(lane), handle) : http.createServer(handle);

server.listen(port, host, () => {
  console.log(`OpenCommons Health listening on ${lane ? 'https' : 'http'}://${host}:${port}${lane ? ` (${laneDescription()})` : ''}`);
});

const deviceHandler = createDeviceRequestHandler(provideContext, healthkitRuntime.bridgeToken);
const deviceServer = device && lane
  ? https.createServer(serverOptions(lane), (req, res) => { void deviceHandler(req, res); })
  : undefined;
if (device && deviceServer) {
  deviceServer.listen(device.port, device.host, () => {
    console.log(`OpenCommons Health device listener on https://${device.host}:${device.port} (HealthKit mirror and hydration, bridge token; ${laneDescription()})`);
  });
}

function shutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down...`);
  let open = deviceServer ? 2 : 1;
  const closed = (): void => { open -= 1; if (open === 0) process.exit(0); };
  server.close(closed);
  deviceServer?.close(closed);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
