import {
  buildThing,
  createThing,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { ClinicalDocument } from '../types/health';
import { ValidationError, type ValidationIssue } from '../errors';
import { BaseRepository } from './baseRepository';

const VALID_STATUSES = new Set(['current', 'superseded', 'entered-in-error']);

/** Repository for FHIR DocumentReference-style clinical document metadata. */
export class DocumentRepository extends BaseRepository<ClinicalDocument> {
  constructor(client: PodClient) {
    super(client, 'ClinicalDocument');
  }

  protected override validate(entity: ClinicalDocument): void {
    const issues: ValidationIssue[] = [];
    if (!entity.documentType?.system || !entity.documentType?.code) {
      issues.push({ field: 'documentType', reason: 'documentType.system and documentType.code are required', value: entity.documentType });
    }
    if (!VALID_STATUSES.has(entity.status)) {
      issues.push({ field: 'status', reason: 'status must be current, superseded, or entered-in-error', value: entity.status });
    }
    if (!entity.title?.trim()) {
      issues.push({ field: 'title', reason: 'title is required', value: entity.title });
    }
    if (entity.authoredDate && Number.isNaN(Date.parse(entity.authoredDate))) {
      issues.push({ field: 'authoredDate', reason: 'authoredDate must be an ISO-8601 datetime', value: entity.authoredDate });
    }
    for (const [field, value] of Object.entries({
      sourceDocumentUrl: entity.sourceDocumentUrl,
      binaryUrl: entity.binaryUrl,
    })) {
      if (value && !isHttpUrl(value)) {
        issues.push({ field, reason: 'must be an absolute http(s) URL', value });
      }
    }
    if (issues.length > 0) {
      throw new ValidationError('ClinicalDocument validation failed.', issues);
    }
  }

  protected toThing(entity: ClinicalDocument, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;
    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}ClinicalDocument`)
      .addUrl(`${health}codingSystem`, entity.documentType.system)
      .addStringNoLocale(`${health}codingCode`, entity.documentType.code)
      .addUrl(`${health}documentStatus`, `${health}DocStatus${this.camel(entity.status)}`)
      .addStringNoLocale(`${schema}name`, entity.title);

    if (entity.documentType.display) builder = builder.addStringNoLocale(`${health}codingDisplay`, entity.documentType.display);
    if (entity.category) {
      builder = builder
        .addUrl(`${health}categorySystem`, entity.category.system)
        .addStringNoLocale(`${health}categoryCode`, entity.category.code);
      if (entity.category.display) builder = builder.addStringNoLocale(`${health}categoryDisplay`, entity.category.display);
    }
    if (entity.authoredDate) builder = builder.addStringNoLocale(`${health}authoredDate`, entity.authoredDate);
    if (entity.sourceSystem) builder = builder.addStringNoLocale(`${health}sourceSystem`, entity.sourceSystem);
    if (entity.sourceDocumentUrl) builder = builder.addUrl(`${health}sourceDocumentUrl`, entity.sourceDocumentUrl);
    if (entity.binaryUrl) builder = builder.addUrl(`${health}binaryUrl`, entity.binaryUrl);
    if (entity.custodian) builder = builder.addStringNoLocale(`${health}custodian`, entity.custodian);
    if (entity.notes) builder = builder.addStringNoLocale(`${schema}description`, entity.notes);
    if (entity.createdAt) builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    if (entity.updatedAt) builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);
    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): ClinicalDocument {
    const { schema, health } = this.NS;
    const statusUrl = getUrl(thing, `${health}documentStatus`) ?? '';
    const status = this.fromCamel(statusUrl.replace(`${health}DocStatus`, '')) as ClinicalDocument['status'];
    const categorySystem = getUrl(thing, `${health}categorySystem`);
    const categoryCode = getStringNoLocale(thing, `${health}categoryCode`);
    return {
      url: resourceUrl,
      documentType: {
        system: getUrl(thing, `${health}codingSystem`) ?? '',
        code: getStringNoLocale(thing, `${health}codingCode`) ?? '',
        display: getStringNoLocale(thing, `${health}codingDisplay`) ?? undefined,
      },
      status: status || 'current',
      title: getStringNoLocale(thing, `${schema}name`) ?? '',
      category: categorySystem && categoryCode
        ? {
            system: categorySystem,
            code: categoryCode,
            display: getStringNoLocale(thing, `${health}categoryDisplay`) ?? undefined,
          }
        : undefined,
      authoredDate: getStringNoLocale(thing, `${health}authoredDate`) ?? undefined,
      sourceSystem: getStringNoLocale(thing, `${health}sourceSystem`) ?? undefined,
      sourceDocumentUrl: getUrl(thing, `${health}sourceDocumentUrl`) ?? undefined,
      binaryUrl: getUrl(thing, `${health}binaryUrl`) ?? undefined,
      custodian: getStringNoLocale(thing, `${health}custodian`) ?? undefined,
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

  private fromCamel(s: string): string {
    return s.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
