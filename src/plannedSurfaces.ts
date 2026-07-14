export interface PlannedEpicResourceMapping {
  fhirResource: string;
  localSurface: string;
  ownerAction: string;
  storagePolicy: string;
  releasePolicy: string;
}

export interface PlannedEpicSurface {
  id: string;
  status: 'planned';
  localhostMvp: true;
  writeEnabled: false;
  piiRelease: false;
  summary: string;
  resources: PlannedEpicResourceMapping[];
  validation: string[];
  issue: string;
}

export const EPIC_DOCUMENTS_READONLY_PLAN: PlannedEpicSurface = {
  id: 'epic-documents-readonly',
  status: 'planned',
  localhostMvp: true,
  writeEnabled: false,
  piiRelease: false,
  issue: 'LHMVP-05',
  summary: 'Read-only Epic document metadata planning surface for future owner-reviewed document import.',
  resources: [
    {
      fhirResource: 'DocumentReference',
      localSurface: 'future /api/resources/documents',
      ownerAction: 'Preview document title, category, date, and source before choosing any pod import.',
      storagePolicy: 'Store owner-approved document metadata in the Solid pod; defer binary payload storage to a separate owner action.',
      releasePolicy: 'Exclude source document URLs, direct identifiers, full text, and binary payloads from anonymized releases by default.',
    },
    {
      fhirResource: 'Binary',
      localSurface: 'future pod document object storage',
      ownerAction: 'Require explicit patient/owner approval before fetching or persisting document bytes.',
      storagePolicy: 'No localhost MVP binary ingestion; future implementation must encrypt at rest through the pod storage workflow.',
      releasePolicy: 'Never release raw binary documents through anonymized APIs.',
    },
  ],
  validation: [
    'OpenAPI exposes the read-only planning surface.',
    'Localhost MVP documentation identifies document import as planned, not active.',
    'Automated tests assert no writeback or PII release is enabled for documents.',
  ],
};

export const EPIC_WORKFLOW_READONLY_PLAN: PlannedEpicSurface = {
  id: 'epic-workflow-readonly',
  status: 'planned',
  localhostMvp: true,
  writeEnabled: false,
  piiRelease: false,
  issue: 'LHMVP-05',
  summary: 'Read-only Epic workflow and messaging planning surface for future owner-reviewed care coordination context.',
  resources: [
    {
      fhirResource: 'Communication',
      localSurface: 'future /api/resources/messages',
      ownerAction: 'Review message metadata and care-team context without sending replies from the MVP.',
      storagePolicy: 'Store only owner-approved metadata and summary text; defer full message bodies until redaction rules are complete.',
      releasePolicy: 'Exclude message bodies, participant identifiers, and direct contact details from anonymized releases.',
    },
    {
      fhirResource: 'Task',
      localSurface: 'future /api/resources/workflow-tasks',
      ownerAction: 'Review patient to-dos, follow-ups, and document requests as read-only local context.',
      storagePolicy: 'Store owner-approved task metadata and local completion annotations without Epic writeback.',
      releasePolicy: 'Release only generalized task category/status after owner approval; exclude dates precise enough to re-identify care.',
    },
    {
      fhirResource: 'ServiceRequest',
      localSurface: 'future /api/resources/care-requests',
      ownerAction: 'Review ordered services and recommended follow-up actions.',
      storagePolicy: 'Store coded service metadata only after owner approval.',
      releasePolicy: 'Exclude ordering provider, source identifiers, and free text from anonymized releases.',
    },
    {
      fhirResource: 'QuestionnaireResponse',
      localSurface: 'future /api/resources/questionnaire-responses',
      ownerAction: 'Review wellness and intake responses before local use.',
      storagePolicy: 'Store structured answers only after owner approval and PHI schema validation.',
      releasePolicy: 'Exclude direct identifiers and free-text answers from anonymized releases by default.',
    },
  ],
  validation: [
    'OpenAPI exposes the read-only planning surface.',
    'Localhost MVP documentation keeps workflow/messaging writeback out of scope.',
    'Automated tests assert no writeback or PII release is enabled for workflow resources.',
  ],
};

export const EPIC_READONLY_PLANS = [
  EPIC_DOCUMENTS_READONLY_PLAN,
  EPIC_WORKFLOW_READONLY_PLAN,
] as const;
