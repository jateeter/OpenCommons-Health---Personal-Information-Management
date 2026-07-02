import {
  buildThing,
  createThing,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { AllergyIntolerance } from '../types/health';
import { BaseRepository } from './baseRepository';

/**
 * Repository for managing {@link AllergyIntolerance} records in the Solid pod.
 */
export class AllergyRepository extends BaseRepository<AllergyIntolerance> {
  constructor(client: PodClient) {
    super(client, 'AllergyIntolerance');
  }

  protected toThing(entity: AllergyIntolerance, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;

    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}AllergyIntolerance`)
      .addUrl(`${health}codingSystem`, entity.substance.system)
      .addStringNoLocale(`${health}codingCode`, entity.substance.code)
      .addUrl(`${health}allergyCategory`, `${health}Allergy${this.camel(entity.category)}`)
      .addUrl(`${health}allergyStatus`, `${health}Allergy${this.camel(entity.status)}`);

    if (entity.substance.display) {
      builder = builder.addStringNoLocale(`${health}codingDisplay`, entity.substance.display);
    }
    if (entity.onsetDate) builder = builder.addStringNoLocale(`${health}onsetDate`, entity.onsetDate);
    if (entity.notes) builder = builder.addStringNoLocale(`${schema}description`, entity.notes);
    if (entity.createdAt) builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    if (entity.updatedAt) builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);

    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): AllergyIntolerance {
    const { schema, health } = this.NS;

    const system = getUrl(thing, `${health}codingSystem`) ?? '';
    const code = getStringNoLocale(thing, `${health}codingCode`) ?? '';
    const display = getStringNoLocale(thing, `${health}codingDisplay`) ?? undefined;

    const categoryUrl = getUrl(thing, `${health}allergyCategory`) ?? '';
    const category = categoryUrl.replace(`${health}Allergy`, '').toLowerCase() as AllergyIntolerance['category'];

    const statusUrl = getUrl(thing, `${health}allergyStatus`) ?? '';
    const status = statusUrl.replace(`${health}Allergy`, '').toLowerCase() as AllergyIntolerance['status'];

    return {
      url: resourceUrl,
      substance: { system, code, display },
      category: category || 'medication',
      status: status || 'active',
      onsetDate: getStringNoLocale(thing, `${health}onsetDate`) ?? undefined,
      notes: getStringNoLocale(thing, `${schema}description`) ?? undefined,
      createdAt: getStringNoLocale(thing, `${schema}dateCreated`) ?? undefined,
      updatedAt: getStringNoLocale(thing, `${schema}dateModified`) ?? undefined,
    };
  }

  private camel(s: string): string {
    return s
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }
}
