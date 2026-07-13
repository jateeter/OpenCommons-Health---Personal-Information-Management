import {
  buildThing,
  createThing,
  getDecimal,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { VitalSign } from '../types/health';
import { BaseRepository } from './baseRepository';

/**
 * Repository for managing {@link VitalSign} observations in the Solid pod.
 */
export class VitalSignsRepository extends BaseRepository<VitalSign> {
  constructor(client: PodClient) {
    super(client, 'VitalSign');
  }

  protected toThing(entity: VitalSign, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;
    const vitalIri = `${health}Vital${this.vitalCodeSuffix(entity.code)}`;

    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}VitalSign`)
      .addUrl(`${health}vitalSignCode`, vitalIri)
      .addStringNoLocale(`${health}unit`, entity.unit)
      .addStringNoLocale(`${health}effectiveDateTime`, entity.effectiveDateTime);

    if (typeof entity.value === 'number') {
      builder = builder.addDecimal(`${health}valueDecimal`, entity.value);
    } else {
      builder = builder
        .addDecimal(`${health}valueSystolic`, entity.value.systolic)
        .addDecimal(`${health}valueDiastolic`, entity.value.diastolic);
    }
    if (entity.notes) builder = builder.addStringNoLocale(`${schema}description`, entity.notes);
    if (entity.createdAt) builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    if (entity.updatedAt) builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);

    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): VitalSign {
    const { schema, health } = this.NS;

    const codeUrl = getUrl(thing, `${health}vitalSignCode`) ?? '';
    const code = this.vitalSuffixToCode(codeUrl.replace(`${health}Vital`, ''));

    const scalar = getDecimal(thing, `${health}valueDecimal`);
    const systolic = getDecimal(thing, `${health}valueSystolic`);
    const diastolic = getDecimal(thing, `${health}valueDiastolic`);

    const value: VitalSign['value'] =
      systolic !== null && diastolic !== null
        ? { systolic, diastolic }
        : (scalar ?? 0);

    return {
      url: resourceUrl,
      code,
      value,
      unit: getStringNoLocale(thing, `${health}unit`) ?? '',
      effectiveDateTime: getStringNoLocale(thing, `${health}effectiveDateTime`) ?? '',
      notes: getStringNoLocale(thing, `${schema}description`) ?? undefined,
      createdAt: getStringNoLocale(thing, `${schema}dateCreated`) ?? undefined,
      updatedAt: getStringNoLocale(thing, `${schema}dateModified`) ?? undefined,
    };
  }

  private vitalCodeSuffix(code: VitalSign['code']): string {
    const suffixes: Record<VitalSign['code'], string> = {
      'body-weight': 'BodyWeight',
      'body-height': 'BodyHeight',
      bmi: 'BMI',
      'blood-pressure': 'BloodPressure',
      'heart-rate': 'HeartRate',
      'respiratory-rate': 'RespiratoryRate',
      'body-temperature': 'BodyTemperature',
      'oxygen-saturation': 'OxygenSaturation',
      'blood-glucose': 'BloodGlucose',
    };
    return suffixes[code];
  }

  private vitalSuffixToCode(suffix: string): VitalSign['code'] {
    const codes: Record<string, VitalSign['code']> = {
      BodyWeight: 'body-weight',
      BodyHeight: 'body-height',
      BMI: 'bmi',
      BloodPressure: 'blood-pressure',
      HeartRate: 'heart-rate',
      RespiratoryRate: 'respiratory-rate',
      BodyTemperature: 'body-temperature',
      OxygenSaturation: 'oxygen-saturation',
      BloodGlucose: 'blood-glucose',
    };
    return codes[suffix] ?? 'heart-rate';
  }
}
