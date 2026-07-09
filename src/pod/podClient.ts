import {
  createContainerAt,
  getContainedResourceUrlAll,
  getSolidDataset,
  saveSolidDatasetAt,
  createSolidDataset,
  deleteFile,
  type SolidDataset,
} from '@inrupt/solid-client';
import type { SolidAuthService } from '../auth/solidAuth';
import { containerUrl } from '../utils/rdfUtils';

/**
 * Configuration for the PodClient.
 */
export interface PodClientConfig {
  /** Base URL of the user's pod (e.g. http://localhost:3000/alice/). */
  podBaseUrl: string;
  /** Sub-path within the pod reserved for the health PIM (e.g. /health-pim/). */
  podPath: string;
}

/**
 * PodClient provides low-level CRUD operations on Solid datasets within the
 * user's pod, using the Inrupt `@inrupt/solid-client` library.
 *
 * All operations go through the authenticated fetch provided by
 * {@link SolidAuthService}.
 */
export class PodClient {
  private readonly config: PodClientConfig;
  private readonly auth: SolidAuthService;

  constructor(config: PodClientConfig, auth: SolidAuthService) {
    this.config = config;
    this.auth = auth;
  }

  // ─── Container management ────────────────────────────────────────────────

  /**
   * Ensure the root health-PIM container and a named sub-container exist
   * in the pod. Idempotent – safe to call multiple times.
   *
   * @param typeName - Resource type name (e.g. "MedicalCondition").
   */
  async ensureContainer(typeName: string): Promise<string> {
    const url = containerUrl(
      this.config.podBaseUrl,
      this.config.podPath,
      typeName,
    );
    try {
      await getSolidDataset(url, {
        fetch: this.auth.authenticatedFetch,
      });
      return url;
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }

    try {
      await createContainerAt(url, {
        fetch: this.auth.authenticatedFetch,
      });
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
    return url;
  }

  /** Perform a read-only authenticated probe against the configured pod root. */
  async verifyPodAccess(): Promise<void> {
    await getSolidDataset(this.config.podBaseUrl, {
      fetch: this.auth.authenticatedFetch,
    });
  }

  // ─── Dataset CRUD ────────────────────────────────────────────────────────

  /**
   * Fetch a SolidDataset from the pod by URL.
   *
   * @param resourceUrl - Absolute URL of the pod resource.
   */
  async getDataset(resourceUrl: string): Promise<SolidDataset> {
    return getSolidDataset(resourceUrl, {
      fetch: this.auth.authenticatedFetch,
    });
  }

  /**
   * Save (create or update) a SolidDataset at a given URL.
   *
   * @param resourceUrl - Absolute URL to save to.
   * @param dataset     - The SolidDataset to persist.
   */
  async saveDataset(
    resourceUrl: string,
    dataset: SolidDataset,
  ): Promise<SolidDataset> {
    return saveSolidDatasetAt(resourceUrl, dataset, {
      fetch: this.auth.authenticatedFetch,
    });
  }

  /**
   * Create a new, empty SolidDataset ready for population.
   */
  createEmptyDataset(): SolidDataset {
    return createSolidDataset();
  }

  /**
   * Delete a resource from the pod.
   *
   * @param resourceUrl - Absolute URL of the resource to delete.
   */
  async deleteResource(resourceUrl: string): Promise<void> {
    await deleteFile(resourceUrl, {
      fetch: this.auth.authenticatedFetch,
    });
  }

  /**
   * List all resource URLs inside a container.
   *
   * @param containerUrl - Absolute URL of the container.
   */
  async listResources(containerUrl: string): Promise<string[]> {
    const dataset = await getSolidDataset(containerUrl, {
      fetch: this.auth.authenticatedFetch,
    });
    return getContainedResourceUrlAll(dataset);
  }

  // ─── Accessors ───────────────────────────────────────────────────────────

  /** Constructs the container URL for a given resource type. */
  containerUrlFor(typeName: string): string {
    return containerUrl(
      this.config.podBaseUrl,
      this.config.podPath,
      typeName,
    );
  }
}

function isConflict(error: unknown): boolean {
  const response = (error as { response?: { status?: number } } | undefined)?.response;
  if (response?.status === 409) return true;
  const status = (error as { status?: number; statusCode?: number } | undefined);
  return status?.status === 409 || status?.statusCode === 409;
}

function isNotFound(error: unknown): boolean {
  const response = (error as { response?: { status?: number } } | undefined)?.response;
  if (response?.status === 404) return true;
  const status = (error as { status?: number; statusCode?: number } | undefined);
  return status?.status === 404 || status?.statusCode === 404;
}
