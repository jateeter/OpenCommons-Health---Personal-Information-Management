import {
  buildThing,
  createThing,
  getDecimal,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { LabResult } from '../types/health';
import { BaseRepository } from './baseRepository';

/**
 * Repository for managing {@link LabResult} records in the Solid pod.
 */
export class LabResultRepository extends BaseRepository<LabResult> {
  constructor(client: PodClient) {
    super(client, 'LabResult');
  }

  protected toThing(entity: LabResult, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;

    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}LabResult`)
      .addUrl(`${health}codingSystem`, entity.code.system)
      .addStringNoLocale(`${health}codingCode`, entity.code.code)
      .addStringNoLocale(`${health}effectiveDateTime`, entity.effectiveDateTime);

    if (entity.code.display) builder = builder.addStringNoLocale(`${health}codingDisplay`, entity.code.display);
    if (typeof entity.value === 'number') builder = builder.addDecimal(`${health}valueDecimal`, entity.value);
    if (typeof entity.value === 'string') builder = builder.addStringNoLocale(`${health}valueString`, entity.value);
    if (entity.unit) builder = builder.addStringNoLocale(`${health}unit`, entity.unit);
    if (entity.interpretation) {
      builder = builder.addUrl(`${health}interpretation`, `${health}Interp${this.camel(entity.interpretation)}`);
    }
    if (entity.referenceRange) {
      if (entity.referenceRange.low !== undefined) builder = builder.addDecimal(`${health}referenceRangeLow`, entity.referenceRange.low);
      if (entity.referenceRange.high !== undefined) builder = builder.addDecimal(`${health}referenceRangeHigh`, entity.referenceRange.high);
      if (entity.referenceRange.text) builder = builder.addStringNoLocale(`${health}referenceRangeText`, entity.referenceRange.text);
    }
    if (entity.performer) builder = builder.addStringNoLocale(`${health}performer`, entity.performer);
    if (entity.specimen) builder = builder.addStringNoLocale(`${health}specimen`, entity.specimen);
    if (entity.notes) builder = builder.addStringNoLocale(`${schema}description`, entity.notes);
    if (entity.createdAt) builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    if (entity.updatedAt) builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);

    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): LabResult {
    const { schema, health } = this.NS;

    const system = getUrl(thing, `${health}codingSystem`) ?? '';
    const code = getStringNoLocale(thing, `${health}codingCode`) ?? '';
    const display = getStringNoLocale(thing, `${health}codingDisplay`) ?? undefined;

    const scalar = getDecimal(thing, `${health}valueDecimal`);
    const valueStr = getStringNoLocale(thing, `${health}valueString`);
    const value = scalar !== null ? scalar : (valueStr ?? undefined);

    const interpUrl = getUrl(thing, `${health}interpretation`);
    const interpretation = interpUrl
      ? (interpUrl.replace(`${health}Interp`, '').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '') as LabResult['interpretation'])
      : undefined;

    const refLow = getDecimal(thing, `${health}referenceRangeLow`) ?? undefined;
    const refHigh = getDecimal(thing, `${health}referenceRangeHigh`) ?? undefined;
    const refText = getStringNoLocale(thing, `${health}referenceRangeText`) ?? undefined;

    return {
      url: resourceUrl,
      code: { system, code, display },
      value,
      unit: getStringNoLocale(thing, `${health}unit`) ?? undefined,
      interpretation,
      referenceRange: refLow !== undefined || refHigh !== undefined || refText !== undefined
        ? { low: refLow, high: refHigh, text: refText }
        : undefined,
      effectiveDateTime: getStringNoLocale(thing, `${health}effectiveDateTime`) ?? '',
      performer: getStringNoLocale(thing, `${health}performer`) ?? undefined,
      specimen: getStringNoLocale(thing, `${health}specimen`) ?? undefined,
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
