import {
  buildThing,
  createThing,
  getInteger,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { Immunization } from '../types/health';
import { BaseRepository } from './baseRepository';

/**
 * Repository for managing {@link Immunization} records in the Solid pod.
 */
export class ImmunizationRepository extends BaseRepository<Immunization> {
  constructor(client: PodClient) {
    super(client, 'Immunization');
  }

  protected toThing(entity: Immunization, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;

    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}Immunization`)
      .addUrl(`${health}codingSystem`, entity.vaccineCode.system)
      .addStringNoLocale(`${health}codingCode`, entity.vaccineCode.code)
      .addUrl(`${health}immunizationStatus`, `${health}Imm${this.camel(entity.status)}`)
      .addStringNoLocale(`${health}occurrenceDate`, entity.occurrenceDate);

    if (entity.vaccineCode.display) {
      builder = builder.addStringNoLocale(`${health}codingDisplay`, entity.vaccineCode.display);
    }
    if (entity.doseNumber !== undefined) builder = builder.addInteger(`${health}doseNumber`, entity.doseNumber);
    if (entity.seriesDoses !== undefined) builder = builder.addInteger(`${health}seriesDoses`, entity.seriesDoses);
    if (entity.lotNumber) builder = builder.addStringNoLocale(`${health}lotNumber`, entity.lotNumber);
    if (entity.site) builder = builder.addStringNoLocale(`${health}site`, entity.site);
    if (entity.route) builder = builder.addStringNoLocale(`${health}route`, entity.route);
    if (entity.performer) builder = builder.addStringNoLocale(`${health}performer`, entity.performer);
    if (entity.notes) builder = builder.addStringNoLocale(`${schema}description`, entity.notes);
    if (entity.createdAt) builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    if (entity.updatedAt) builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);

    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): Immunization {
    const { schema, health } = this.NS;

    const system = getUrl(thing, `${health}codingSystem`) ?? '';
    const code = getStringNoLocale(thing, `${health}codingCode`) ?? '';
    const display = getStringNoLocale(thing, `${health}codingDisplay`) ?? undefined;
    const statusUrl = getUrl(thing, `${health}immunizationStatus`) ?? '';
    const status = statusUrl.replace(`${health}Imm`, '').toLowerCase() as Immunization['status'];
    const doseNumber = getInteger(thing, `${health}doseNumber`) ?? undefined;
    const seriesDoses = getInteger(thing, `${health}seriesDoses`) ?? undefined;

    return {
      url: resourceUrl,
      vaccineCode: { system, code, display },
      status: status || 'completed',
      occurrenceDate: getStringNoLocale(thing, `${health}occurrenceDate`) ?? '',
      doseNumber,
      seriesDoses,
      lotNumber: getStringNoLocale(thing, `${health}lotNumber`) ?? undefined,
      site: getStringNoLocale(thing, `${health}site`) ?? undefined,
      route: getStringNoLocale(thing, `${health}route`) ?? undefined,
      performer: getStringNoLocale(thing, `${health}performer`) ?? undefined,
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
