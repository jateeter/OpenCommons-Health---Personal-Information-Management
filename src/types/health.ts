/**
 * Core TypeScript types for the OpenCommons Health PIM domain.
 *
 * All health entities correspond to RDF shapes defined in src/schemas/ and are
 * stored as Linked Data resources inside a local Solid Community Server pod.
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

/** ISO-8601 date string (YYYY-MM-DD). */
export type ISODate = string;

/** ISO-8601 datetime string (YYYY-MM-DDTHH:mm:ssZ). */
export type ISODateTime = string;

/** Absolute URL identifying a pod resource. */
export type ResourceUrl = string;

/** Generic coding from a terminology system (SNOMED CT, LOINC, RxNorm, etc.). */
export interface Coding {
  system: string;
  code: string;
  display?: string;
}

/** A human-readable name. */
export interface HumanName {
  family: string;
  given: string[];
  prefix?: string;
  suffix?: string;
}

/** A physical or postal address. */
export interface Address {
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** A contact point (phone, email, etc.). */
export interface ContactPoint {
  system: 'phone' | 'email' | 'url' | 'fax';
  value: string;
  use?: 'home' | 'work' | 'mobile' | 'temp';
}

// ─── Personal Profile ─────────────────────────────────────────────────────────

export type BiologicalSex = 'male' | 'female' | 'other' | 'unknown';

/** The owner's personal profile stored in the pod. */
export interface PersonProfile {
  /** Pod resource URL – assigned after creation. */
  url?: ResourceUrl;
  name: HumanName;
  birthDate: ISODate;
  biologicalSex: BiologicalSex;
  address?: Address;
  telecom?: ContactPoint[];
  photo?: string; // URL to photo in pod
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Medical Condition ────────────────────────────────────────────────────────

export type ConditionStatus =
  | 'active'
  | 'recurrence'
  | 'relapse'
  | 'inactive'
  | 'remission'
  | 'resolved';

export type ConditionSeverity = 'mild' | 'moderate' | 'severe';

/** A medical condition, problem, or diagnosis. */
export interface MedicalCondition {
  url?: ResourceUrl;
  code: Coding;
  status: ConditionStatus;
  severity?: ConditionSeverity;
  onsetDate?: ISODate;
  abatementDate?: ISODate;
  notes?: string;
  recordedBy?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Medication ───────────────────────────────────────────────────────────────

export type MedicationStatus = 'active' | 'completed' | 'stopped' | 'on-hold';

export interface Dosage {
  text?: string;
  timing?: string;
  route?: string;
  doseQuantity?: {
    value: number;
    unit: string;
  };
}

/** A medication statement. */
export interface Medication {
  url?: ResourceUrl;
  medicationCode: Coding; // RxNorm preferred
  status: MedicationStatus;
  dosage?: Dosage;
  startDate?: ISODate;
  endDate?: ISODate;
  prescriber?: string;
  reason?: string;
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Allergy / Intolerance ────────────────────────────────────────────────────

export type AllergyCategory = 'food' | 'medication' | 'environment' | 'biologic';
export type AllergyReactionSeverity = 'mild' | 'moderate' | 'severe';
export type AllergyStatus = 'active' | 'inactive' | 'resolved';

export interface AllergyReaction {
  substance?: Coding;
  manifestation: string[];
  severity?: AllergyReactionSeverity;
}

/** An allergy or intolerance entry. */
export interface AllergyIntolerance {
  url?: ResourceUrl;
  substance: Coding;
  category: AllergyCategory;
  status: AllergyStatus;
  reactions?: AllergyReaction[];
  onsetDate?: ISODate;
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Immunization ─────────────────────────────────────────────────────────────

export type ImmunizationStatus = 'completed' | 'not-done' | 'entered-in-error';

/** An immunization / vaccination record. */
export interface Immunization {
  url?: ResourceUrl;
  vaccineCode: Coding; // CVX preferred
  status: ImmunizationStatus;
  occurrenceDate: ISODate;
  doseNumber?: number;
  seriesDoses?: number;
  lotNumber?: string;
  site?: string;
  route?: string;
  performer?: string;
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Vital Signs ──────────────────────────────────────────────────────────────

export type VitalSignCode =
  | 'body-weight'
  | 'body-height'
  | 'bmi'
  | 'blood-pressure'
  | 'heart-rate'
  | 'respiratory-rate'
  | 'body-temperature'
  | 'oxygen-saturation'
  | 'blood-glucose';

/** A single vital sign observation. */
export interface VitalSign {
  url?: ResourceUrl;
  code: VitalSignCode;
  loincCode?: Coding;
  value: number | { systolic: number; diastolic: number };
  unit: string;
  effectiveDateTime: ISODateTime;
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Healthcare Provider ──────────────────────────────────────────────────────

export type ProviderRole =
  | 'primary-care'
  | 'specialist'
  | 'emergency'
  | 'pharmacy'
  | 'lab'
  | 'hospital'
  | 'other';

/** A healthcare provider or organisation. */
export interface HealthcareProvider {
  url?: ResourceUrl;
  name: string;
  role: ProviderRole;
  specialty?: string;
  npi?: string; // National Provider Identifier
  organization?: string;
  address?: Address;
  telecom?: ContactPoint[];
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Lab Result ───────────────────────────────────────────────────────────────

export type LabResultInterpretation =
  | 'normal'
  | 'high'
  | 'low'
  | 'critical-high'
  | 'critical-low'
  | 'abnormal';

export interface ReferenceRange {
  low?: number;
  high?: number;
  text?: string;
  unit?: string;
}

/** A laboratory observation / result. */
export interface LabResult {
  url?: ResourceUrl;
  code: Coding; // LOINC preferred
  value?: number | string;
  unit?: string;
  interpretation?: LabResultInterpretation;
  referenceRange?: ReferenceRange;
  effectiveDateTime: ISODateTime;
  performer?: string;
  specimen?: string;
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Insurance Policy ─────────────────────────────────────────────────────────

export type InsuranceType = 'medical' | 'dental' | 'vision' | 'pharmacy' | 'other';

/** A health insurance policy. */
export interface InsurancePolicy {
  url?: ResourceUrl;
  type: InsuranceType;
  insurerName: string;
  planName?: string;
  memberId: string;
  groupNumber?: string;
  effectiveDate: ISODate;
  expirationDate?: ISODate;
  policyHolder?: string;
  telecom?: ContactPoint[];
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Clinical Documents ──────────────────────────────────────────────────────

export type ClinicalDocumentStatus = 'current' | 'superseded' | 'entered-in-error';

/** Owner-held clinical document metadata for FHIR DocumentReference records. */
export interface ClinicalDocument {
  url?: ResourceUrl;
  documentType: Coding;
  status: ClinicalDocumentStatus;
  title: string;
  category?: Coding;
  authoredDate?: ISODateTime;
  sourceSystem?: string;
  sourceDocumentUrl?: ResourceUrl;
  binaryUrl?: ResourceUrl;
  custodian?: string;
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Workflow Tasks ──────────────────────────────────────────────────────────

export type WorkflowTaskStatus =
  | 'draft'
  | 'requested'
  | 'received'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export type WorkflowTaskIntent = 'proposal' | 'plan' | 'order' | 'option';

/** Owner-held workflow, task, and message status metadata for FHIR Task records. */
export interface WorkflowTask {
  url?: ResourceUrl;
  taskType: Coding;
  status: WorkflowTaskStatus;
  intent: WorkflowTaskIntent;
  description: string;
  authoredDate?: ISODateTime;
  dueDate?: ISODate;
  requester?: string;
  owner?: string;
  relatedDocumentUrl?: ResourceUrl;
  notes?: string;
  createdAt?: ISODateTime;
  updatedAt?: ISODateTime;
}

// ─── Pod configuration ────────────────────────────────────────────────────────

/** Runtime configuration loaded from config/. */
export interface AppConfig {
  solid: {
    podServerUrl: string;
    oidcIssuer: string;
    podPath: string;
  };
  auth: {
    clientName: string;
    clientId?: string;
    clientSecret?: string;
    redirectUrl: string;
    tokenStoragePath: string;
  };
  app: {
    port: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}
