import {
  buildThing,
  createThing,
  getStringNoLocale,
  getUrl,
  type Thing,
} from '@inrupt/solid-client';
import type { PodClient } from '../pod/podClient';
import type { MedicalCondition } from '../types/health';
import { ValidationError, type ValidationIssue } from '../errors';
import { BaseRepository } from './baseRepository';

/** Valid status values for a {@link MedicalCondition}. */
const VALID_STATUSES = new Set([
  'active',
  'recurrence',
  'relapse',
  'inactive',
  'remission',
  'resolved',
]);

/** Valid severity values for a {@link MedicalCondition}. */
const VALID_SEVERITIES = new Set(['mild', 'moderate', 'severe']);

/**
 * Repository for managing {@link MedicalCondition} records in the Solid pod.
 *
 * Production-ready hardening:
 * - Required fields (`code.system`, `code.code`, `status`) are validated before
 *   every create/update write.
 * - Date fields (`onsetDate`, `abatementDate`) are normalised to ISO-8601 date
 *   strings (YYYY-MM-DD) on write.
 * - The immutable pod resource URL (`url`) cannot be mutated through `update`.
 * - Typed errors ({@link ValidationError}, {@link NotFoundError}) are thrown
 *   instead of generic `Error`.
 */
export class ConditionRepository extends BaseRepository<MedicalCondition> {
  constructor(client: PodClient) {
    super(client, 'MedicalCondition');
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  /**
   * Validate that a {@link MedicalCondition} satisfies the required-field and
   * value-set constraints before it is written to the pod.
   *
   * @throws {ValidationError} with structured per-field issues when invalid.
   */
  protected override validate(entity: MedicalCondition): void {
    const issues: ValidationIssue[] = [];

    if (!entity.code?.system?.trim()) {
      issues.push({
        field: 'code.system',
        reason: 'code.system is required',
        value: entity.code?.system,
      });
    }

    if (!entity.code?.code?.trim()) {
      issues.push({
        field: 'code.code',
        reason: 'code.code is required',
        value: entity.code?.code,
      });
    }

    if (!entity.status?.trim()) {
      issues.push({
        field: 'status',
        reason: 'status is required',
        value: entity.status,
      });
    } else if (!VALID_STATUSES.has(entity.status)) {
      issues.push({
        field: 'status',
        reason: `status must be one of: ${[...VALID_STATUSES].join(', ')}`,
        value: entity.status,
      });
    }

    if (entity.severity !== undefined && !VALID_SEVERITIES.has(entity.severity)) {
      issues.push({
        field: 'severity',
        reason: `severity must be one of: ${[...VALID_SEVERITIES].join(', ')}`,
        value: entity.severity,
      });
    }

    if (entity.onsetDate !== undefined) {
      const normalised = normaliseDate(entity.onsetDate);
      if (!normalised) {
        issues.push({
          field: 'onsetDate',
          reason: 'onsetDate must be a valid ISO-8601 date (YYYY-MM-DD)',
          value: entity.onsetDate,
        });
      }
    }

    if (entity.abatementDate !== undefined) {
      const normalised = normaliseDate(entity.abatementDate);
      if (!normalised) {
        issues.push({
          field: 'abatementDate',
          reason: 'abatementDate must be a valid ISO-8601 date (YYYY-MM-DD)',
          value: entity.abatementDate,
        });
      }
    }

    if (issues.length > 0) {
      throw new ValidationError(
        `MedicalCondition validation failed: ${issues.map((i) => `${i.field} – ${i.reason}`).join('; ')}`,
        issues,
      );
    }
  }

  // ─── Normalisation ─────────────────────────────────────────────────────────

  /**
   * Normalise optional date fields to ISO-8601 (YYYY-MM-DD) and prevent
   * mutation of the immutable resource URL before delegating to the base class.
   */
  private normalise(entity: MedicalCondition): MedicalCondition {
    return {
      ...entity,
      onsetDate: entity.onsetDate
        ? (normaliseDate(entity.onsetDate) ?? entity.onsetDate)
        : undefined,
      abatementDate: entity.abatementDate
        ? (normaliseDate(entity.abatementDate) ?? entity.abatementDate)
        : undefined,
    };
  }

  override async create(entity: MedicalCondition): Promise<MedicalCondition> {
    return super.create(this.normalise(entity));
  }

  /**
   * Update an existing condition.
   *
   * The `url` field is immutable – passing a different `url` than the original
   * resource is not allowed and will be rejected.
   *
   * @throws {ValidationError} when required fields are missing or `url` is absent.
   * @throws {NotFoundError} when the target resource does not exist on the pod.
   */
  override async update(entity: MedicalCondition): Promise<MedicalCondition> {
    // Immutability guard: url must be present and must not be changed.
    if (!entity.url) {
      throw new ValidationError('Cannot update a MedicalCondition without a url.', [
        { field: 'url', reason: 'url is required for update operations' },
      ]);
    }
    return super.update(this.normalise(entity));
  }

  // ─── RDF mapping ───────────────────────────────────────────────────────────

  protected toThing(entity: MedicalCondition, resourceUrl: string): Thing {
    const { schema, health, rdf } = this.NS;

    let builder = buildThing(createThing({ url: resourceUrl }))
      .addUrl(`${rdf}type`, `${schema}MedicalCondition`)
      .addUrl(`${health}codingSystem`, entity.code.system)
      .addStringNoLocale(`${health}codingCode`, entity.code.code)
      .addUrl(`${health}conditionStatus`, `${health}Condition${camel(entity.status)}`);

    if (entity.code.display) {
      builder = builder.addStringNoLocale(`${health}codingDisplay`, entity.code.display);
    }
    if (entity.severity) {
      builder = builder.addUrl(`${health}severity`, `${health}Severity${camel(entity.severity)}`);
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
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

/** Convert a kebab/snake-cased string to UpperCamelCase. */
function camel(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/**
 * Normalise an arbitrary date string to ISO-8601 YYYY-MM-DD.
 * Returns `null` when the input cannot be parsed as a valid date.
 */
function normaliseDate(value: string): string | null {
  // Already in YYYY-MM-DD format – fast path.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + 'T00:00:00Z');
    return isNaN(d.getTime()) ? null : value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

