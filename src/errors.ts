/**
 * Typed error classes for the OpenCommons Health PIM.
 *
 * Every error thrown at the repository boundary extends one of these classes,
 * making it straightforward for callers to distinguish validation failures from
 * infrastructure errors and handle each appropriately.
 */

// ─── Validation ───────────────────────────────────────────────────────────────

/** A single field-level validation failure. */
export interface ValidationIssue {
  /** Dot-separated path to the offending field (e.g. "code.system"). */
  field: string;
  /** Human-readable description of the constraint that was violated. */
  reason: string;
  /** The value that failed validation, for diagnostic purposes. */
  value?: unknown;
}

/**
 * Thrown when a domain object fails shape/schema validation before being
 * written to the pod.
 *
 * The `issues` array contains one entry per failing field so callers can
 * surface actionable messages to end-users.
 */
export class ValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// ─── Not Found ────────────────────────────────────────────────────────────────

/**
 * Thrown when a requested pod resource does not exist (HTTP 404 equivalent).
 */
export class NotFoundError extends Error {
  /** The pod resource URL that could not be found. */
  readonly url: string;

  constructor(url: string) {
    super(`Resource not found: ${url}`);
    this.name = 'NotFoundError';
    this.url = url;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

// ─── Auth / Session ───────────────────────────────────────────────────────────

/**
 * Thrown when an operation fails because the session is not authenticated or
 * the credentials are insufficient (HTTP 401/403 equivalent).
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

// ─── Write Conflict ───────────────────────────────────────────────────────────

/**
 * Thrown when a write to the pod fails due to a conflict (HTTP 409 equivalent),
 * for example when trying to create a resource that already exists or update a
 * stale copy.
 */
export class ConflictError extends Error {
  /** The pod resource URL where the conflict occurred. */
  readonly url: string;

  constructor(url: string, message: string) {
    super(message);
    this.name = 'ConflictError';
    this.url = url;
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
