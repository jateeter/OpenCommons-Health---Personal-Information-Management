import type { PodClient } from './pod/podClient';
import type { PodActivityEvent } from './podActivity';
import type { MetricRegistry } from './integrations/healthkit/types';

const HEALTHKIT_OBSERVATIONS_CONTAINER = 'healthkit/observations';

export interface HealthKitMirrorStatus {
  source: 'HealthKitBridge';
  localhostMvp: true;
  status: 'ready' | 'attention';
  containerPath: string;
  observationCount: number | null;
  supportedResourceTypes: string[];
  acceptedObservationCodes: string[];
  lastObservedAt?: string;
  /**
   * Records mirrored from HealthKit, counted per pillar (counts only). Present
   * when the mirror service is configured.
   */
  pillars?: Record<string, number>;
  /** The owner's approved-metric set: generation and counts by state. */
  metrics?: { generation: number; active: number; proposed: number; locked: number; removed: number };
  recentEvents: Array<Pick<PodActivityEvent, 'id' | 'at' | 'kind' | 'status' | 'summary'>>;
  privacyBoundary: string;
  nextOwnerAction: string;
}

export async function createHealthKitMirrorStatus(options: {
  pod?: PodClient;
  activityEvents?: PodActivityEvent[];
  /** Mirror counts and registry, when the mirror service is configured. */
  mirror?: { counts: Record<string, number>; registry: MetricRegistry };
}): Promise<HealthKitMirrorStatus> {
  const recentEvents = (options.activityEvents ?? [])
    .filter((event) => event.kind === 'healthkit-status-verified' || event.source === 'owner-ui')
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      at: event.at,
      kind: event.kind,
      status: event.status,
      summary: event.summary,
    }));

  if (options.mirror) {
    // The mirror writes to the pillar containers and to vital-signs, not to
    // healthkit/observations/, so counting that container would always say 0.
    const { counts, registry } = options.mirror;
    const states = Object.values(registry.metrics).map((m) => m.state);
    const count = (state: string) => states.filter((s) => s === state).length;
    const observationCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return {
      source: 'HealthKitBridge',
      localhostMvp: true,
      status: 'ready',
      containerPath: 'health-pim/healthkit/',
      observationCount,
      supportedResourceTypes: ['Observation'],
      acceptedObservationCodes: Object.values(registry.metrics).filter((m) => m.state === 'active').map((m) => m.metric).sort(),
      lastObservedAt: recentEvents[0]?.at,
      pillars: counts,
      metrics: { generation: registry.generation, active: count('active'), proposed: count('proposed'), locked: count('locked'), removed: count('removed') },
      recentEvents,
      privacyBoundary: 'HealthKit-originated observations remain in the authenticated owner Pod; this status surface exposes counts and sync metadata only.',
      nextOwnerAction: count('proposed') > 0
        ? `${count('proposed')} declared HealthKit metric(s) await owner approval before they can be mirrored.`
        : observationCount === 0
          ? 'No HealthKit observations have been mirrored to the owner Pod yet.'
          : 'Review mirrored observations through owner-facing PIM workflows before any external release.',
    };
  }

  try {
    let observationCount: number | null = null;
    if (options.pod) {
      const containerUrl = await options.pod.ensureContainerPath(HEALTHKIT_OBSERVATIONS_CONTAINER);
      observationCount = (await options.pod.listResources(containerUrl)).length;
    }
    return {
      source: 'HealthKitBridge',
      localhostMvp: true,
      status: 'ready',
      containerPath: 'health-pim/healthkit/observations/',
      observationCount,
      supportedResourceTypes: ['Observation'],
      acceptedObservationCodes: [
        'heart-rate',
        'body-weight',
        'body-height',
        'blood-pressure',
        'body-temperature',
        'oxygen-saturation',
        'blood-glucose',
      ],
      lastObservedAt: recentEvents[0]?.at,
      recentEvents,
      privacyBoundary: 'HealthKit-originated observations remain in the authenticated owner Pod; this status surface exposes counts and sync metadata only.',
      nextOwnerAction: observationCount === 0
        ? 'No mirrored HealthKit observations are currently visible in the local Pod container.'
        : 'Review mirrored observations through owner-facing PIM workflows before any external release.',
    };
  } catch (error) {
    return {
      source: 'HealthKitBridge',
      localhostMvp: true,
      status: 'attention',
      containerPath: 'health-pim/healthkit/observations/',
      observationCount: null,
      supportedResourceTypes: ['Observation'],
      acceptedObservationCodes: [],
      recentEvents,
      privacyBoundary: 'HealthKit-originated observations remain in the authenticated owner Pod; this status surface exposes counts and sync metadata only.',
      nextOwnerAction: error instanceof Error ? error.message : 'Unable to verify the HealthKit observations container.',
    };
  }
}
