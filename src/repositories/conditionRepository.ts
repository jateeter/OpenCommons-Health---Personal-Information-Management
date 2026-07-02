import {
  buildThing,
  createThing,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { MedicalCondition } from '../types/health';
import { BaseRepository } from './baseRepository';

/**
 * Repository for managing {@link MedicalCondition} records in the Solid pod.
 */
export class ConditionRepository extends BaseRepository<MedicalCondition> {
  constructor(client: PodClient) {
    super(client, 'MedicalCondition');
  }

  protected toThing(entity: MedicalCondition, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;

    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${schema}MedicalCondition`)
      .addUrl(`${health}codingSystem`, entity.code.system)
      .addStringNoLocale(`${health}codingCode`, entity.code.code)
      .addUrl(`${health}conditionStatus`, `${health}Condition${this.camel(entity.status)}`);

    if (entity.code.display) {
      builder = builder.addStringNoLocale(`${health}codingDisplay`, entity.code.display);
    }
    if (entity.severity) {
      builder = builder.addUrl(`${health}severity`, `${health}Severity${this.camel(entity.severity)}`);
    }
    if (entity.onsetDate) {
      builder = builder.addStringNoLocale(`${health}onsetDate`, entity.onsetDate);
    }
    if (entity.abatementDate) {
      builder = builder.addStringNoLocale(`${health}abatementDate`, entity.abatementDate);
    }
    if (entity.notes) {
      builder = builder.addStringNoLocale(`${schema}description`, entity.notes);
    }
    if (entity.recordedBy) {
      builder = builder.addStringNoLocale(`${health}recordedBy`, entity.recordedBy);
    }
    if (entity.createdAt) {
      builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    }
    if (entity.updatedAt) {
      builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);
    }

    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): MedicalCondition {
    const { schema, health } = this.NS;

    const system = getUrl(thing, `${health}codingSystem`) ?? '';
    const code = getStringNoLocale(thing, `${health}codingCode`) ?? '';
    const display = getStringNoLocale(thing, `${health}codingDisplay`) ?? undefined;
    const statusUrl = getUrl(thing, `${health}conditionStatus`) ?? '';
    const status = statusUrl
      .replace(`${health}Condition`, '')
      .toLowerCase() as MedicalCondition['status'];
    const severityUrl = getUrl(thing, `${health}severity`);
    const severity = severityUrl
      ? (severityUrl.replace(`${health}Severity`, '').toLowerCase() as MedicalCondition['severity'])
      : undefined;

    return {
      url: resourceUrl,
      code: { system, code, display },
      status: status || 'active',
      severity,
      onsetDate: getStringNoLocale(thing, `${health}onsetDate`) ?? undefined,
      abatementDate: getStringNoLocale(thing, `${health}abatementDate`) ?? undefined,
      notes: getStringNoLocale(thing, `${schema}description`) ?? undefined,
      recordedBy: getStringNoLocale(thing, `${health}recordedBy`) ?? undefined,
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
