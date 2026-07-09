import {
  buildThing,
  createThing,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { InsurancePolicy } from '../types/health';
import { ValidationError, type ValidationIssue } from '../errors';
import { BaseRepository } from './baseRepository';

const VALID_TYPES = new Set(['medical', 'dental', 'vision', 'pharmacy', 'other']);

/** Repository for health insurance policies stored in the user's pod. */
export class InsuranceRepository extends BaseRepository<InsurancePolicy> {
  constructor(client: PodClient) {
    super(client, 'InsurancePolicy');
  }

  protected override validate(entity: InsurancePolicy): void {
    const issues: ValidationIssue[] = [];
    if (!VALID_TYPES.has(entity.type)) {
      issues.push({ field: 'type', reason: 'type must be medical, dental, vision, pharmacy, or other', value: entity.type });
    }
    if (!entity.insurerName?.trim()) {
      issues.push({ field: 'insurerName', reason: 'insurerName is required', value: entity.insurerName });
    }
    if (!entity.memberId?.trim()) {
      issues.push({ field: 'memberId', reason: 'memberId is required', value: entity.memberId });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entity.effectiveDate ?? '')) {
      issues.push({ field: 'effectiveDate', reason: 'effectiveDate must use YYYY-MM-DD', value: entity.effectiveDate });
    }
    if (issues.length > 0) {
      throw new ValidationError('InsurancePolicy validation failed.', issues);
    }
  }

  protected toThing(entity: InsurancePolicy, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;
    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}InsurancePolicy`)
      .addUrl(`${health}insuranceType`, `${health}Ins${capitalise(entity.type)}`)
      .addStringNoLocale(`${schema}name`, entity.insurerName)
      .addStringNoLocale(`${health}memberId`, entity.memberId)
      .addStringNoLocale(`${health}effectiveDate`, entity.effectiveDate);

    if (entity.planName) builder = builder.addStringNoLocale(`${health}planName`, entity.planName);
    if (entity.groupNumber) builder = builder.addStringNoLocale(`${health}groupNumber`, entity.groupNumber);
    if (entity.expirationDate) builder = builder.addStringNoLocale(`${health}expirationDate`, entity.expirationDate);
    if (entity.policyHolder) builder = builder.addStringNoLocale(`${health}policyHolder`, entity.policyHolder);
    if (entity.notes) builder = builder.addStringNoLocale(`${schema}description`, entity.notes);
    if (entity.createdAt) builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    if (entity.updatedAt) builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);
    for (const contact of entity.telecom ?? []) {
      if (contact.system === 'phone') builder = builder.addStringNoLocale(`${schema}telephone`, contact.value);
      if (contact.system === 'email') builder = builder.addStringNoLocale(`${schema}email`, contact.value);
    }
    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): InsurancePolicy {
    const { schema, health } = this.NS;
    const typeUrl = getUrl(thing, `${health}insuranceType`) ?? '';
    const type = typeUrl.replace(`${health}Ins`, '').toLowerCase() as InsurancePolicy['type'];
    return {
      url: resourceUrl,
      type: type || 'other',
      insurerName: getStringNoLocale(thing, `${schema}name`) ?? '',
      planName: getStringNoLocale(thing, `${health}planName`) ?? undefined,
      memberId: getStringNoLocale(thing, `${health}memberId`) ?? '',
      groupNumber: getStringNoLocale(thing, `${health}groupNumber`) ?? undefined,
      effectiveDate: getStringNoLocale(thing, `${health}effectiveDate`) ?? '',
      expirationDate: getStringNoLocale(thing, `${health}expirationDate`) ?? undefined,
      policyHolder: getStringNoLocale(thing, `${health}policyHolder`) ?? undefined,
      notes: getStringNoLocale(thing, `${schema}description`) ?? undefined,
      createdAt: getStringNoLocale(thing, `${schema}dateCreated`) ?? undefined,
      updatedAt: getStringNoLocale(thing, `${schema}dateModified`) ?? undefined,
    };
  }
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
