import type {
  AllergyIntolerance,
  HealthcareProvider,
  Immunization,
  InsurancePolicy,
  LabResult,
  MedicalCondition,
  Medication,
  PersonProfile,
  VitalSign,
} from '../../types';

export type EpicConnectionStatus =
  | 'disabled'
  | 'not-connected'
  | 'authorization-started'
  | 'connected'
  | 'needs-reconnect'
  | 'disconnected';

export interface EpicGrant {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
}

export interface EpicConnectionRecord {
  status: EpicConnectionStatus;
  mode: 'mock' | 'sandbox' | 'production';
  fhirBaseUrl?: string;
  issuer?: string;
  patientId?: string;
  requestedScopes: string[];
  grantedScopes: string[];
  lastAuthorizationState?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastStartupAt?: string;
  lastSyncAt?: string;
  lastImportJobId?: string;
  lastError?: string;
  encryptedGrant?: string;
  audit: EpicAuditEvent[];
}

export interface EpicAuditEvent {
  at: string;
  action: string;
  status: 'ok' | 'failed' | 'info';
  detail?: string;
}

export interface EpicConnectionPublicStatus {
  enabled: boolean;
  mode: 'mock' | 'sandbox' | 'production';
  status: EpicConnectionStatus;
  fhirBaseUrl?: string;
  patientId?: string;
  requestedScopes: string[];
  grantedScopes: string[];
  connectedAt?: string;
  disconnectedAt?: string;
  lastStartupAt?: string;
  lastSyncAt?: string;
  lastImportJobId?: string;
  lastError?: string;
}

export interface EpicFhirResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
  [key: string]: unknown;
}

export interface EpicImportProvenance {
  sourceSystem: 'epic';
  sourceFhirBaseUrl: string;
  sourcePatientId: string;
  sourceResourceType: string;
  sourceResourceId: string;
  sourceVersion?: string;
  sourceLastUpdated?: string;
  importedAt?: string;
  authorizationGrantId?: string;
  mapperVersion: string;
}

export type EpicMvpDomain =
  | 'profiles'
  | 'conditions'
  | 'medications'
  | 'allergies'
  | 'immunizations'
  | 'vital-signs'
  | 'providers'
  | 'lab-results'
  | 'insurance-policies';

export type EpicDomainEntity =
  | PersonProfile
  | MedicalCondition
  | Medication
  | AllergyIntolerance
  | Immunization
  | VitalSign
  | HealthcareProvider
  | LabResult
  | InsurancePolicy;

export interface EpicImportCandidate {
  domain: EpicMvpDomain;
  action: 'create' | 'update' | 'unchanged' | 'conflict';
  display: string;
  entity: EpicDomainEntity;
  provenance: EpicImportProvenance;
}

export interface EpicImportPreview {
  importJobId: string;
  source: 'mock' | 'epic';
  generatedAt: string;
  patientId: string;
  changes: EpicImportCandidate[];
}

export interface EpicApplyResult {
  importJobId: string;
  appliedAt: string;
  created: Record<EpicMvpDomain, number>;
  resources: Array<{
    domain: EpicMvpDomain;
    url?: string;
    display: string;
    provenance: EpicImportProvenance;
  }>;
}

