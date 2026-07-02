import {
  buildThing,
  createThing,
  getDecimal,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { Medication } from '../types/health';
import { BaseRepository } from './baseRepository';

/**
 * Repository for managing {@link Medication} records in the Solid pod.
 */
export class MedicationRepository extends BaseRepository<Medication> {
  constructor(client: PodClient) {
    super(client, 'Medication');
  }

  protected toThing(entity: Medication, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;

    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${schema}Drug`)
      .addUrl(`${health}codingSystem`, entity.medicationCode.system)
      .addStringNoLocale(`${health}codingCode`, entity.medicationCode.code)
      .addUrl(`${health}medicationStatus`, `${health}Med${this.camel(entity.status)}`);

    if (entity.medicationCode.display) {
      builder = builder.addStringNoLocale(`${health}codingDisplay`, entity.medicationCode.display);
    }
    if (entity.dosage) {
      if (entity.dosage.text) builder = builder.addStringNoLocale(`${health}dosageText`, entity.dosage.text);
      if (entity.dosage.timing) builder = builder.addStringNoLocale(`${health}dosageTiming`, entity.dosage.timing);
      if (entity.dosage.route) builder = builder.addStringNoLocale(`${health}dosageRoute`, entity.dosage.route);
      if (entity.dosage.doseQuantity) {
        builder = builder.addDecimal(`${health}doseValue`, entity.dosage.doseQuantity.value);
        builder = builder.addStringNoLocale(`${health}doseUnit`, entity.dosage.doseQuantity.unit);
      }
    }
    if (entity.startDate) builder = builder.addStringNoLocale(`${health}startDate`, entity.startDate);
    if (entity.endDate) builder = builder.addStringNoLocale(`${health}endDate`, entity.endDate);
    if (entity.prescriber) builder = builder.addStringNoLocale(`${health}prescriber`, entity.prescriber);
    if (entity.reason) builder = builder.addStringNoLocale(`${health}reason`, entity.reason);
    if (entity.notes) builder = builder.addStringNoLocale(`${schema}description`, entity.notes);
    if (entity.createdAt) builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    if (entity.updatedAt) builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);

    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): Medication {
    const { schema, health } = this.NS;

    const system = getUrl(thing, `${health}codingSystem`) ?? '';
    const code = getStringNoLocale(thing, `${health}codingCode`) ?? '';
    const display = getStringNoLocale(thing, `${health}codingDisplay`) ?? undefined;
    const statusUrl = getUrl(thing, `${health}medicationStatus`) ?? '';
    const status = statusUrl.replace(`${health}Med`, '').toLowerCase() as Medication['status'];
    const doseValue = getDecimal(thing, `${health}doseValue`);
    const doseUnit = getStringNoLocale(thing, `${health}doseUnit`);

    return {
      url: resourceUrl,
      medicationCode: { system, code, display },
      status: status || 'active',
      dosage: {
        text: getStringNoLocale(thing, `${health}dosageText`) ?? undefined,
        timing: getStringNoLocale(thing, `${health}dosageTiming`) ?? undefined,
        route: getStringNoLocale(thing, `${health}dosageRoute`) ?? undefined,
        doseQuantity:
          doseValue !== null && doseUnit !== null
            ? { value: doseValue, unit: doseUnit }
            : undefined,
      },
      startDate: getStringNoLocale(thing, `${health}startDate`) ?? undefined,
      endDate: getStringNoLocale(thing, `${health}endDate`) ?? undefined,
      prescriber: getStringNoLocale(thing, `${health}prescriber`) ?? undefined,
      reason: getStringNoLocale(thing, `${health}reason`) ?? undefined,
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
