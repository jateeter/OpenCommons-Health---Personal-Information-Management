import {
  buildThing,
  createThing,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { PersonProfile } from '../types/health';
import { BaseRepository } from './baseRepository';

/**
 * Repository for managing the user's {@link PersonProfile} in their Solid pod.
 *
 * Each profile is stored as a Turtle document at:
 *   <podBase>/<podPath>/personprofiles/<slug>
 */
export class ProfileRepository extends BaseRepository<PersonProfile> {
  constructor(client: PodClient) {
    super(client, 'PersonProfile');
  }

  protected toThing(entity: PersonProfile, resourceUrl: string): Thing {
    const { schema, health } = this.NS;

    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${this.NS.rdf}type`, `${schema}Person`)
      .addStringNoLocale(`${schema}familyName`, entity.name.family)
      .addStringNoLocale(`${schema}birthDate`, entity.birthDate)
      .addUrl(`${health}biologicalSex`, `${health}${this.capitalise(entity.biologicalSex)}`);

    for (const given of entity.name.given) {
      builder = builder.addStringNoLocale(`${schema}givenName`, given);
    }
    if (entity.name.prefix) {
      builder = builder.addStringNoLocale(`${schema}honorificPrefix`, entity.name.prefix);
    }
    if (entity.name.suffix) {
      builder = builder.addStringNoLocale(`${schema}honorificSuffix`, entity.name.suffix);
    }
    if (entity.photo) {
      builder = builder.addUrl(`${schema}image`, entity.photo);
    }
    if (entity.createdAt) {
      builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    }
    if (entity.updatedAt) {
      builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);
    }

    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): PersonProfile {
    const { schema, health } = this.NS;

    const family = getStringNoLocale(thing, `${schema}familyName`) ?? '';
    const givenRaw = getStringNoLocale(thing, `${schema}givenName`);
    const given = givenRaw ? [givenRaw] : [];
    const prefix = getStringNoLocale(thing, `${schema}honorificPrefix`) ?? undefined;
    const suffix = getStringNoLocale(thing, `${schema}honorificSuffix`) ?? undefined;
    const birthDate = getStringNoLocale(thing, `${schema}birthDate`) ?? '';
    const bioSexUrl = getUrl(thing, `${health}biologicalSex`);
    const biologicalSex = bioSexUrl
      ? (bioSexUrl.replace(health, '').toLowerCase() as PersonProfile['biologicalSex'])
      : 'unknown';

    return {
      url: resourceUrl,
      name: { family, given, prefix, suffix },
      birthDate,
      biologicalSex,
      photo: getUrl(thing, `${schema}image`) ?? undefined,
      createdAt: getStringNoLocale(thing, `${schema}dateCreated`) ?? undefined,
      updatedAt: getStringNoLocale(thing, `${schema}dateModified`) ?? undefined,
    };
  }

  private capitalise(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
