import {
  buildThing,
  createSolidDataset,
  createThing,
  getStringNoLocale,
  getThing,
  setThing,
} from '@inrupt/solid-client';
import type { PodClient } from '../../pod/podClient';
import { NS } from '../../utils/rdfUtils';
import type { EpicConnectionRecord } from './types';

const EPIC_CONTAINER = 'integrations/epic';
const CONNECTION_RESOURCE = 'connection.ttl';
const health = NS.health;
const rdf = NS.rdf;

export class EpicConnectionPodRepository {
  constructor(private readonly pod: PodClient) {}

  async get(): Promise<EpicConnectionRecord | null> {
    const url = this.connectionUrl();
    try {
      const dataset = await this.pod.getDataset(url);
      const thing = getThing(dataset, url);
      if (!thing) return null;
      return {
        status: readJson(thing, `${health}epicStatus`) ?? 'not-connected',
        mode: readJson(thing, `${health}epicMode`) ?? 'mock',
        fhirBaseUrl: readJson(thing, `${health}epicFhirBaseUrl`),
        issuer: readJson(thing, `${health}epicIssuer`),
        patientId: readJson(thing, `${health}epicPatientId`),
        requestedScopes: readJson(thing, `${health}epicRequestedScopes`) ?? [],
        grantedScopes: readJson(thing, `${health}epicGrantedScopes`) ?? [],
        lastAuthorizationState: readJson(thing, `${health}epicLastAuthorizationState`),
        connectedAt: readJson(thing, `${health}epicConnectedAt`),
        disconnectedAt: readJson(thing, `${health}epicDisconnectedAt`),
        lastStartupAt: readJson(thing, `${health}epicLastStartupAt`),
        lastSyncAt: readJson(thing, `${health}epicLastSyncAt`),
        lastImportJobId: readJson(thing, `${health}epicLastImportJobId`),
        lastError: readJson(thing, `${health}epicLastError`),
        encryptedGrant: readJson(thing, `${health}epicEncryptedGrant`),
        audit: readJson(thing, `${health}epicAudit`) ?? [],
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async save(record: EpicConnectionRecord): Promise<EpicConnectionRecord> {
    await this.pod.ensureContainerPath(EPIC_CONTAINER);
    const url = this.connectionUrl();
    let builder = buildThing(createThing({ url }))
      .addUrl(`${rdf}type`, `${health}EpicConnection`);
    for (const [predicate, value] of Object.entries({
      epicStatus: record.status,
      epicMode: record.mode,
      epicFhirBaseUrl: record.fhirBaseUrl,
      epicIssuer: record.issuer,
      epicPatientId: record.patientId,
      epicRequestedScopes: record.requestedScopes,
      epicGrantedScopes: record.grantedScopes,
      epicLastAuthorizationState: record.lastAuthorizationState,
      epicConnectedAt: record.connectedAt,
      epicDisconnectedAt: record.disconnectedAt,
      epicLastStartupAt: record.lastStartupAt,
      epicLastSyncAt: record.lastSyncAt,
      epicLastImportJobId: record.lastImportJobId,
      epicLastError: record.lastError,
      epicEncryptedGrant: record.encryptedGrant,
      epicAudit: record.audit,
    })) {
      if (value !== undefined) {
        builder = builder.addStringNoLocale(`${health}${predicate}`, JSON.stringify(value));
      }
    }
    const existing = await this.pod.getDataset(url).catch((error: unknown) => {
      if (isNotFound(error)) return createSolidDataset();
      throw error;
    });
    const dataset = setThing(existing, builder.build());
    await this.pod.saveDataset(url, dataset);
    return record;
  }

  connectionUrl(): string {
    return `${this.pod.containerUrlForPath(EPIC_CONTAINER)}${CONNECTION_RESOURCE}`;
  }
}

function readJson<T>(thing: unknown, predicate: string): T | undefined {
  const raw = getStringNoLocale(thing as Parameters<typeof getStringNoLocale>[0], predicate);
  if (!raw) return undefined;
  return JSON.parse(raw) as T;
}

function isNotFound(error: unknown): boolean {
  const response = (error as { response?: { status?: number } } | undefined)?.response;
  if (response?.status === 404) return true;
  const status = (error as { status?: number; statusCode?: number } | undefined);
  return status?.status === 404 || status?.statusCode === 404;
}
