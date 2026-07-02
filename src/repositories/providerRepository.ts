import {
  buildThing,
  createThing,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { HealthcareProvider } from '../types/health';
import { BaseRepository } from './baseRepository';

/**
 * Repository for managing {@link HealthcareProvider} records in the Solid pod.
 */
export class ProviderRepository extends BaseRepository<HealthcareProvider> {
  constructor(client: PodClient) {
    super(client, 'HealthcareProvider');
  }

  protected toThing(entity: HealthcareProvider, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;

    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}HealthcareProvider`)
      .addStringNoLocale(`${schema}name`, entity.name)
      .addUrl(`${health}providerRole`, `${health}Provider${this.camel(entity.role)}`);

    if (entity.specialty) builder = builder.addStringNoLocale(`${health}specialty`, entity.specialty);
    if (entity.npi) builder = builder.addStringNoLocale(`${health}npi`, entity.npi);
    if (entity.organization) builder = builder.addStringNoLocale(`${schema}memberOf`, entity.organization);
    if (entity.notes) builder = builder.addStringNoLocale(`${schema}description`, entity.notes);
    if (entity.createdAt) builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    if (entity.updatedAt) builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);

    if (entity.telecom) {
      for (const tc of entity.telecom) {
        if (tc.system === 'phone') builder = builder.addStringNoLocale(`${schema}telephone`, tc.value);
        if (tc.system === 'email') builder = builder.addStringNoLocale(`${schema}email`, tc.value);
      }
    }

    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): HealthcareProvider {
    const { schema, health } = this.NS;

    const roleUrl = getUrl(thing, `${health}providerRole`) ?? '';
    const role = roleUrl.replace(`${health}Provider`, '').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '') as HealthcareProvider['role'];

    return {
      url: resourceUrl,
      name: getStringNoLocale(thing, `${schema}name`) ?? '',
      role: role || 'other',
      specialty: getStringNoLocale(thing, `${health}specialty`) ?? undefined,
      npi: getStringNoLocale(thing, `${health}npi`) ?? undefined,
      organization: getStringNoLocale(thing, `${schema}memberOf`) ?? undefined,
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
