import {
  buildThing,
  createThing,
  getDecimal,
  getStringNoLocale,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { PillarObservation } from '../types/health';
import { ValidationError } from '../errors';
import { BaseRepository } from './baseRepository';

/** Pod-relative root under which pillar containers are created on first use. */
export const PILLAR_ROOT = 'healthkit';

/** A pillar slug is a single safe path segment, e.g. `sleep`, `body-measurements`. */
export function isPillarSlug(value: string): boolean {
  return /^[a-z][a-z0-9-]{0,62}$/.test(value);
}

/**
 * {@link PillarObservation}s for one pillar, in `healthkit/<pillar>/`. One
 * repository per pillar, created when a metric of that pillar is first
 * mirrored: a pillar nobody uses gets no container.
 */
export class PillarObservationRepository extends BaseRepository<PillarObservation> {
  readonly pillar: string;

  constructor(client: PodClient, pillar: string) {
    if (!isPillarSlug(pillar)) {
      throw new ValidationError('Invalid pillar.', [{ field: 'pillar', reason: 'must be a lowercase slug' }]);
    }
    super(client, 'PillarObservation', `${PILLAR_ROOT}/${pillar}`);
    this.pillar = pillar;
  }

  protected validate(entity: PillarObservation): void {
    if (entity.pillar !== this.pillar) {
      throw new ValidationError('Observation pillar does not match its container.', [
        { field: 'pillar', reason: `expected ${this.pillar}` },
      ]);
    }
  }

  protected toThing(entity: PillarObservation, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;
    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}PillarObservation`)
      .addStringNoLocale(`${health}pillar`, entity.pillar)
      .addStringNoLocale(`${health}metric`, entity.metric)
      .addStringNoLocale(`${health}appleCategory`, entity.appleCategory)
      .addStringNoLocale(`${health}effectiveStart`, entity.effectiveStart)
      .addStringNoLocale(`${health}sourceSystem`, entity.source.system);
    const optional: Array<[string, string | undefined]> = [
      [`${health}fhirCategory`, entity.fhirCategory],
      [`${health}loincCode`, entity.loinc],
      [`${health}valueCategory`, entity.valueCategory],
      [`${health}unit`, entity.unit],
      [`${health}effectiveEnd`, entity.effectiveEnd],
      [`${health}sourceIdentifier`, entity.source.identifier],
      [`${health}sourceDevice`, entity.source.device],
      [`${health}componentsJson`, entity.components ? JSON.stringify(entity.components) : undefined],
      [`${schema}dateCreated`, entity.createdAt],
      [`${schema}dateModified`, entity.updatedAt],
    ];
    for (const [predicate, value] of optional) {
      if (value !== undefined && value !== '') builder = builder.addStringNoLocale(predicate, value);
    }
    if (typeof entity.value === 'number') builder = builder.addDecimal(`${health}valueDecimal`, entity.value);
    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): PillarObservation {
    const { schema, health } = this.NS;
    const str = (p: string) => getStringNoLocale(thing, p) ?? undefined;
    const componentsJson = str(`${health}componentsJson`);
    const value = getDecimal(thing, `${health}valueDecimal`);
    return {
      url: resourceUrl,
      pillar: str(`${health}pillar`) ?? this.pillar,
      metric: str(`${health}metric`) ?? '',
      appleCategory: str(`${health}appleCategory`) ?? '',
      fhirCategory: str(`${health}fhirCategory`),
      loinc: str(`${health}loincCode`),
      ...(value !== null ? { value } : {}),
      valueCategory: str(`${health}valueCategory`),
      ...(componentsJson ? { components: JSON.parse(componentsJson) as Record<string, number> } : {}),
      unit: str(`${health}unit`),
      effectiveStart: str(`${health}effectiveStart`) ?? '',
      effectiveEnd: str(`${health}effectiveEnd`),
      source: {
        system: str(`${health}sourceSystem`) ?? '',
        identifier: str(`${health}sourceIdentifier`),
        device: str(`${health}sourceDevice`),
      },
      createdAt: str(`${schema}dateCreated`),
      updatedAt: str(`${schema}dateModified`),
    };
  }
}
