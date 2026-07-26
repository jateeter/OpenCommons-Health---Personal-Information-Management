import { createHealthKitMirrorStatus } from '../../src/healthkitStatus';

describe('HealthKit mirror status', () => {
  it('verifies the owner Pod observations container and exposes counts only', async () => {
    const pod = {
      ensureContainerPath: jest.fn(async () => 'http://pod/alice/health-pim/healthkit/observations/'),
      listResources: jest.fn(async () => [
        'http://pod/alice/health-pim/healthkit/observations/private-heart-rate.ttl',
      ]),
    };

    const status = await createHealthKitMirrorStatus({
      pod: pod as never,
      activityEvents: [{
        id: 'event-1',
        at: '2026-07-26T10:00:00.000Z',
        kind: 'healthkit-status-verified',
        status: 'ok',
        summary: 'HealthKit observations mirror container verified',
        source: 'api',
      }],
    });

    expect(status).toMatchObject({
      source: 'HealthKitBridge',
      localhostMvp: true,
      status: 'ready',
      containerPath: 'health-pim/healthkit/observations/',
      observationCount: 1,
      supportedResourceTypes: ['Observation'],
      lastObservedAt: '2026-07-26T10:00:00.000Z',
    });
    expect(JSON.stringify(status)).not.toContain('private-heart-rate.ttl');
    expect(status.privacyBoundary).toContain('metadata only');
    expect(pod.ensureContainerPath).toHaveBeenCalledWith('healthkit/observations');
  });

  it('reports attention when the mirror container cannot be verified', async () => {
    const status = await createHealthKitMirrorStatus({
      pod: {
        ensureContainerPath: jest.fn(async () => {
          throw new Error('Solid container unavailable');
        }),
      } as never,
    });

    expect(status).toMatchObject({
      status: 'attention',
      observationCount: null,
      nextOwnerAction: 'Solid container unavailable',
    });
  });
});
