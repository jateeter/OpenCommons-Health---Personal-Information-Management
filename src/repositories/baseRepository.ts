import {
  addStringNoLocale,
  addUrl,
  buildThing,
  createThing,
  getStringNoLocale,
  getThing,
  getUrl,
  removeThing,
  setThing,
  type SolidDataset,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import { ValidationError, NotFoundError } from '../errors';
import { validateThingAgainstSchema } from '../schemas';
import { NS, newResourceUrl, nowIso } from '../utils/rdfUtils';

/**
 * BaseRepository provides generic CRUD scaffolding for health resources stored
 * as Solid datasets (one resource = one dataset containing one primary Thing).
 *
 * Concrete repositories extend this class and implement `toThing` / `fromThing`
 * to handle domain-specific RDF mapping.
 */
export abstract class BaseRepository<T extends { url?: string }> {
  protected readonly client: PodClient;
  protected readonly typeName: string;

  constructor(client: PodClient, typeName: string) {
    this.client = client;
    this.typeName = typeName;
  }

  // ─── Abstract mapping methods ────────────────────────────────────────────

  /** Convert a domain object to an RDF Thing for storage. */
  protected abstract toThing(entity: T, resourceUrl: string): Thing;

  /** Convert an RDF Thing back to the domain object. */
  protected abstract fromThing(thing: Thing, resourceUrl: string): T;

  /**
   * Validate the entity before a create or update write.
   * Concrete repositories can override this to enforce domain-level rules before
   * RDF mapping. The base class always performs ShEx-driven RDF validation after
   * mapping, before any write reaches the pod.
   *
   * @throws {ValidationError} if the entity does not satisfy the shape.
   */
  protected validate(_entity: T): void {
    // Default: no domain-level validation – RDF shape validation always runs.
  }

  // ─── CRUD operations ─────────────────────────────────────────────────────

  /**
   * Persist a new entity to the pod.
   * The `url` field of the returned object is the new pod resource URL.
   *
   * @throws {ValidationError} if the entity fails shape validation.
   */
  async create(entity: T): Promise<T> {
    this.validate(entity);
    const containerUrl = await this.client.ensureContainer(this.typeName);
    const resourceUrl = newResourceUrl(
      containerUrl,
      this.typeName.toLowerCase(),
    );

    const thing = this.toThing(
      { ...entity, createdAt: nowIso(), updatedAt: nowIso() } as T,
      resourceUrl,
    );
    this.validateRdf(thing);
    let dataset = this.client.createEmptyDataset();
    dataset = setThing(dataset, thing);
    await this.client.saveDataset(resourceUrl, dataset);
    return { ...entity, url: resourceUrl };
  }

  /**
   * Retrieve an entity by its pod resource URL.
   * Returns `null` when the resource is not found.
   */
  async findByUrl(resourceUrl: string): Promise<T | null> {
    try {
      const dataset = await this.client.getDataset(resourceUrl);
      const thing = this.primaryThing(dataset, resourceUrl);
      if (!thing) return null;
      return this.fromThing(thing, resourceUrl);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  /**
   * List all entities in the container for this resource type.
   */
  async findAll(): Promise<T[]> {
    const containerUrl = this.client.containerUrlFor(this.typeName);
    const urls = await this.client.listResources(containerUrl);
    const results = await Promise.all(urls.map((u) => this.findByUrl(u)));
    return results.filter((r): r is NonNullable<typeof r> => r !== null) as T[];
  }

  /**
   * Update an existing entity.
   * The entity must have a `url` field that matches an existing pod resource.
   *
   * @throws {ValidationError} if the entity is missing a `url` or fails shape
   *   validation.
   * @throws {NotFoundError} if the target resource does not exist on the pod.
   */
  async update(entity: T): Promise<T> {
    if (!entity.url) {
      throw new ValidationError('Cannot update entity without a url.', [
        { field: 'url', reason: 'url is required for update operations' },
      ]);
    }
    this.validate(entity);
    const dataset = await this.client.getDataset(entity.url).catch((error: unknown) => {
      if (isNotFound(error)) throw new NotFoundError(entity.url as string);
      throw error;
    });
    const updated = {
      ...entity,
      updatedAt: nowIso(),
    } as T;
    const newThing = this.toThing(updated, entity.url);
    this.validateRdf(newThing);
    const cleanDataset = removeThing(dataset, entity.url);
    const finalDataset = setThing(cleanDataset, newThing);
    await this.client.saveDataset(entity.url, finalDataset);
    return updated;
  }

  /**
   * Delete an entity by its pod resource URL.
   */
  async delete(resourceUrl: string): Promise<void> {
    await this.client.deleteResource(resourceUrl);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Extract the primary Thing from a dataset by its URL. */
  protected primaryThing(dataset: SolidDataset, url: string): Thing | null {
    return getThing(dataset, url);
  }

  /** Validate mapped RDF against the registered ShEx shape before writes. */
  protected validateRdf(thing: Thing): void {
    const issues = validateThingAgainstSchema(this.typeName, thing);
    if (issues.length > 0) {
      throw new ValidationError(`${this.typeName} RDF failed ShEx validation.`, issues);
    }
  }

  /**
   * Helper to add an optional string predicate only when the value is defined.
   */
  protected addOptionalString(
    builder: ReturnType<typeof buildThing>,
    predicate: string,
    value: string | undefined,
  ): ReturnType<typeof buildThing> {
    if (value !== undefined && value !== null && value !== '') {
      return builder.addStringNoLocale(predicate, value);
    }
    return builder;
  }

  /** Safely read an optional string predicate from a Thing. */
  protected readOptionalString(
    thing: Thing,
    predicate: string,
  ): string | undefined {
    const value = getStringNoLocale(thing, predicate);
    return value ?? undefined;
  }

  /** Safely read an optional URL predicate from a Thing. */
  protected readOptionalUrl(
    thing: Thing,
    predicate: string,
  ): string | undefined {
    const value = getUrl(thing, predicate);
    return value ?? undefined;
  }

  // Keep these in scope for child classes.
  protected readonly addStringNoLocale = addStringNoLocale;
  protected readonly addUrl = addUrl;
  protected readonly buildThing = buildThing;
  protected readonly createThing = createThing;
  protected readonly getStringNoLocale = getStringNoLocale;
  protected readonly getUrl = getUrl;
  protected readonly setThing = setThing;
  protected readonly NS = NS;
}

function isNotFound(error: unknown): boolean {
  const response = (error as { response?: { status?: number } } | undefined)?.response;
  if (response?.status === 404) return true;
  const status = (error as { status?: number; statusCode?: number } | undefined);
  return status?.status === 404 || status?.statusCode === 404;
}
