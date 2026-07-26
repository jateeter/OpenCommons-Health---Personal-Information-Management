import type { PodClient } from './pod/podClient';
import type { PodActivityEvent } from './podActivity';

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
  recentEvents: Array<Pick<PodActivityEvent, 'id' | 'at' | 'kind' | 'status' | 'summary'>>;
  privacyBoundary: string;
  nextOwnerAction: string;
}

export async function createHealthKitMirrorStatus(options: {
  pod?: PodClient;
  activityEvents?: PodActivityEvent[];
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
