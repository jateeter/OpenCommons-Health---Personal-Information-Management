import {
  buildThing,
  createSolidDataset,
  createThing,
  getStringNoLocale,
  getThing,
  setThing,
} from '@inrupt/solid-client';
import type { PodClient } from '../../pod/podClient';
import { isNotFound } from '../../pod/podClient';
import { NS } from '../../utils/rdfUtils';
import type { MetricRegistry } from './types';

const HEALTHKIT_CONTAINER = 'integrations/healthkit';
const REGISTRY_RESOURCE = 'metric-registry.ttl';
const health = NS.health;
const rdf = NS.rdf;

/** Where the owner's metric registry is kept. Abstracted for tests. */
export interface MetricRegistryStore {
  get(): Promise<MetricRegistry>;
  save(registry: MetricRegistry): Promise<MetricRegistry>;
}

/**
 * The metric registry in the owner's POD, beside the Epic connection record and
 * in the same shape: one Thing carrying the registry as JSON. The POD is the
 * authority for which metrics the owner has approved (§7b).
 */
export class MetricRegistryPodRepository implements MetricRegistryStore {
  constructor(private readonly pod: PodClient) {}

  async get(): Promise<MetricRegistry> {
    const url = this.registryUrl();
    try {
      const dataset = await this.pod.getDataset(url);
      const thing = getThing(dataset, url);
      const raw = thing ? getStringNoLocale(thing, `${health}healthkitMetricRegistry`) : null;
      if (!raw) return emptyRegistry();
      const parsed = JSON.parse(raw) as MetricRegistry;
      return { generation: parsed.generation ?? 0, metrics: parsed.metrics ?? {}, updatedAt: parsed.updatedAt };
    } catch (error) {
      if (isNotFound(error)) return emptyRegistry();
      throw error;
    }
  }

  async save(registry: MetricRegistry): Promise<MetricRegistry> {
    await this.pod.ensureContainerPath(HEALTHKIT_CONTAINER);
    const url = this.registryUrl();
    const thing = buildThing(createThing({ url }))
      .addUrl(`${rdf}type`, `${health}HealthKitMetricRegistry`)
      .addStringNoLocale(`${health}healthkitMetricRegistry`, JSON.stringify(registry))
      .build();
    const existing = await this.pod.getDataset(url).catch((error: unknown) => {
      if (isNotFound(error)) return createSolidDataset();
      throw error;
    });
    await this.pod.saveDataset(url, setThing(existing, thing));
    return registry;
  }

  registryUrl(): string {
    return `${this.pod.containerUrlForPath(HEALTHKIT_CONTAINER)}${REGISTRY_RESOURCE}`;
  }
}

/** In-memory store, for tests and for a deployment with no POD. */
export class InMemoryMetricRegistryStore implements MetricRegistryStore {
  private registry: MetricRegistry = emptyRegistry();

  async get(): Promise<MetricRegistry> {
    return JSON.parse(JSON.stringify(this.registry)) as MetricRegistry;
  }

  async save(registry: MetricRegistry): Promise<MetricRegistry> {
    this.registry = JSON.parse(JSON.stringify(registry)) as MetricRegistry;
    return registry;
  }
}

export function emptyRegistry(): MetricRegistry {
  return { generation: 0, metrics: {} };
}
