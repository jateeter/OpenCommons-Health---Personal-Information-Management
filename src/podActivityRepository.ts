import {
  buildThing,
  createSolidDataset,
  createThing,
  getStringNoLocale,
  getThing,
  setThing,
} from '@inrupt/solid-client';
import type { PodClient } from './pod/podClient';
import type { PodActivityAuditPersistence, PodActivityEvent } from './podActivity';
import { NS, nowIso } from './utils/rdfUtils';

const ACTIVITY_CONTAINER = 'audit';
const ACTIVITY_RESOURCE = 'activity.ttl';
const MAX_PERSISTED_EVENTS = 200;
const health = NS.health;
const rdf = NS.rdf;

export class PodActivityRepository {
  constructor(
    private readonly pod: PodClient,
    private readonly maxEvents = MAX_PERSISTED_EVENTS,
  ) {}

  async append(event: PodActivityEvent): Promise<void> {
    const events = [event, ...(await this.list(this.maxEvents))]
      .filter((candidate, index, all) => all.findIndex((other) => other.id === candidate.id) === index)
      .slice(0, this.maxEvents);
    await this.save(events);
  }

  async list(limit = 25): Promise<PodActivityEvent[]> {
    const events = await this.readEvents();
    return events.slice(0, Math.max(0, Math.min(limit, this.maxEvents)));
  }

  async status(): Promise<PodActivityAuditPersistence> {
    try {
      const events = await this.readEvents();
      return {
        enabled: true,
        status: 'active',
        containerPath: 'health-pim/audit/',
        resourcePath: 'health-pim/audit/activity.ttl',
        eventCount: events.length,
      };
    } catch (error) {
      return {
        enabled: true,
        status: 'attention',
        containerPath: 'health-pim/audit/',
        resourcePath: 'health-pim/audit/activity.ttl',
        error: error instanceof Error ? error.message : 'Unable to read Pod-backed activity audit.',
      };
    }
  }

  activityUrl(): string {
    return `${this.pod.containerUrlForPath(ACTIVITY_CONTAINER)}${ACTIVITY_RESOURCE}`;
  }

  private async readEvents(): Promise<PodActivityEvent[]> {
    const url = this.activityUrl();
    try {
      const dataset = await this.pod.getDataset(url);
      const thing = getThing(dataset, url);
      if (!thing) return [];
      return readJson<PodActivityEvent[]>(thing, `${health}podActivityEvents`) ?? [];
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
  }

  private async save(events: PodActivityEvent[]): Promise<void> {
    await this.pod.ensureContainerPath(ACTIVITY_CONTAINER);
    const url = this.activityUrl();
    const existing = await this.pod.getDataset(url).catch((error: unknown) => {
      if (isNotFound(error)) return createSolidDataset();
      throw error;
    });
    const thing = buildThing(createThing({ url }))
      .addUrl(`${rdf}type`, `${health}PodActivityAudit`)
      .addStringNoLocale(`${health}podActivityUpdatedAt`, nowIso())
      .addStringNoLocale(`${health}podActivityEvents`, JSON.stringify(events))
      .build();
    await this.pod.saveDataset(url, setThing(existing, thing));
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
