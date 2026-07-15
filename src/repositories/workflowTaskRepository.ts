import {
  buildThing,
  createThing,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { WorkflowTask } from '../types/health';
import { ValidationError, type ValidationIssue } from '../errors';
import { BaseRepository } from './baseRepository';

const VALID_STATUSES = new Set(['draft', 'requested', 'received', 'accepted', 'in-progress', 'completed', 'cancelled']);
const VALID_INTENTS = new Set(['proposal', 'plan', 'order', 'option']);

/** Repository for FHIR Task-style workflow and message status metadata. */
export class WorkflowTaskRepository extends BaseRepository<WorkflowTask> {
  constructor(client: PodClient) {
    super(client, 'WorkflowTask');
  }

  protected override validate(entity: WorkflowTask): void {
    const issues: ValidationIssue[] = [];
    if (!entity.taskType?.system || !entity.taskType?.code) {
      issues.push({ field: 'taskType', reason: 'taskType.system and taskType.code are required', value: entity.taskType });
    }
    if (!VALID_STATUSES.has(entity.status)) {
      issues.push({ field: 'status', reason: 'status must be a supported workflow task status', value: entity.status });
    }
    if (!VALID_INTENTS.has(entity.intent)) {
      issues.push({ field: 'intent', reason: 'intent must be proposal, plan, order, or option', value: entity.intent });
    }
    if (!entity.description?.trim()) {
      issues.push({ field: 'description', reason: 'description is required', value: entity.description });
    }
    if (entity.authoredDate && Number.isNaN(Date.parse(entity.authoredDate))) {
      issues.push({ field: 'authoredDate', reason: 'authoredDate must be an ISO-8601 datetime', value: entity.authoredDate });
    }
    if (entity.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(entity.dueDate)) {
      issues.push({ field: 'dueDate', reason: 'dueDate must use YYYY-MM-DD', value: entity.dueDate });
    }
    if (entity.relatedDocumentUrl && !isHttpUrl(entity.relatedDocumentUrl)) {
      issues.push({ field: 'relatedDocumentUrl', reason: 'must be an absolute http(s) URL', value: entity.relatedDocumentUrl });
    }
    if (issues.length > 0) {
      throw new ValidationError('WorkflowTask validation failed.', issues);
    }
  }

  protected toThing(entity: WorkflowTask, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;
    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${health}WorkflowTask`)
      .addUrl(`${health}codingSystem`, entity.taskType.system)
      .addStringNoLocale(`${health}codingCode`, entity.taskType.code)
      .addUrl(`${health}taskStatus`, `${health}TaskStatus${this.camel(entity.status)}`)
      .addUrl(`${health}taskIntent`, `${health}TaskIntent${this.camel(entity.intent)}`)
      .addStringNoLocale(`${schema}description`, entity.description);

    if (entity.taskType.display) builder = builder.addStringNoLocale(`${health}codingDisplay`, entity.taskType.display);
    if (entity.authoredDate) builder = builder.addStringNoLocale(`${health}authoredDate`, entity.authoredDate);
    if (entity.dueDate) builder = builder.addStringNoLocale(`${health}dueDate`, entity.dueDate);
    if (entity.requester) builder = builder.addStringNoLocale(`${health}requester`, entity.requester);
    if (entity.owner) builder = builder.addStringNoLocale(`${health}owner`, entity.owner);
    if (entity.relatedDocumentUrl) builder = builder.addUrl(`${health}relatedDocumentUrl`, entity.relatedDocumentUrl);
    if (entity.notes) builder = builder.addStringNoLocale(`${health}notes`, entity.notes);
    if (entity.createdAt) builder = builder.addStringNoLocale(`${schema}dateCreated`, entity.createdAt);
    if (entity.updatedAt) builder = builder.addStringNoLocale(`${schema}dateModified`, entity.updatedAt);
    return builder.build();
  }

  protected fromThing(thing: Thing, resourceUrl: string): WorkflowTask {
    const { schema, health } = this.NS;
    const statusUrl = getUrl(thing, `${health}taskStatus`) ?? '';
    const intentUrl = getUrl(thing, `${health}taskIntent`) ?? '';
    const status = this.fromCamel(statusUrl.replace(`${health}TaskStatus`, '')) as WorkflowTask['status'];
    const intent = this.fromCamel(intentUrl.replace(`${health}TaskIntent`, '')) as WorkflowTask['intent'];
    return {
      url: resourceUrl,
      taskType: {
        system: getUrl(thing, `${health}codingSystem`) ?? '',
        code: getStringNoLocale(thing, `${health}codingCode`) ?? '',
        display: getStringNoLocale(thing, `${health}codingDisplay`) ?? undefined,
      },
      status: status || 'requested',
      intent: intent || 'plan',
      description: getStringNoLocale(thing, `${schema}description`) ?? '',
      authoredDate: getStringNoLocale(thing, `${health}authoredDate`) ?? undefined,
      dueDate: getStringNoLocale(thing, `${health}dueDate`) ?? undefined,
      requester: getStringNoLocale(thing, `${health}requester`) ?? undefined,
      owner: getStringNoLocale(thing, `${health}owner`) ?? undefined,
      relatedDocumentUrl: getUrl(thing, `${health}relatedDocumentUrl`) ?? undefined,
      notes: getStringNoLocale(thing, `${health}notes`) ?? undefined,
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
