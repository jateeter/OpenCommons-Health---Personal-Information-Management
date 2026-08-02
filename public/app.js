const SNOMED_CT_SYSTEM = 'http://snomed.info/sct';
const LOINC_SYSTEM = 'http://loinc.org';
const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm';
const RXTERMS_SYSTEM = 'https://www.nlm.nih.gov/research/umls/rxnorm/rxterms';
const MEDRT_SYSTEM = 'https://www.nlm.nih.gov/research/umls/sourcereleasedocs/current/MED-RT';

const TERMINOLOGY_HELP = {
  'SNOMED CT': 'SNOMED CT is designated by NLM as a standard for electronic exchange of clinical health information. Pick a common code/name or enter another SNOMED CT concept manually.',
  LOINC: 'LOINC provides common identifiers, names, and codes for health measurements, observations, labs, and documents. Required FHIR Coding parameters are system and code; display/name is recommended.',
  RxNorm: 'RxNorm provides normalized clinical drug names and links across drug vocabularies. Required FHIR Coding parameters are system and code; display/name is recommended.',
  RxTerms: 'RxTerms is an NLM drug interface terminology derived from RxNorm for easier medication name selection.',
  'MED-RT': 'MED-RT provides medication reference terminology such as therapeutic class and mechanism concepts. Use when a class-level medication concept is more appropriate than a product code.',
};

const REQUIRED_CODING_HELP = 'Required FHIR Coding parameters: terminology system URI and code. Display/name is stored when supplied for review and interoperability.';

const snomedConditionPresets = [
  { code: '38341003', display: 'Hypertensive disorder, systemic arterial' },
  { code: '44054006', display: 'Type 2 diabetes mellitus' },
  { code: '195967001', display: 'Asthma' },
  { code: '13645005', display: 'Chronic obstructive lung disease' },
  { code: '53741008', display: 'Coronary arteriosclerosis' },
  { code: '84114007', display: 'Heart failure' },
  { code: '431855005', display: 'Chronic kidney disease stage 3' },
  { code: '35489007', display: 'Depressive disorder' },
  { code: '40930008', display: 'Hypothyroidism' },
  { code: '55822004', display: 'Hyperlipidemia' },
];

const snomedAllergyPresets = [
  { code: '294954005', display: 'Allergy to penicillin' },
  { code: '91936005', display: 'Allergy to peanuts' },
  { code: '300913006', display: 'Shellfish allergy' },
  { code: '91934008', display: 'Allergy to sulfonamide' },
  { code: '293586001', display: 'Allergy to aspirin' },
  { code: '419199007', display: 'Allergy to substance' },
];

const loincVitalPresets = [
  { code: '8302-2', display: 'Body height', domainCode: 'body-height', unit: 'cm' },
  { code: '29463-7', display: 'Body weight', domainCode: 'body-weight', unit: 'kg' },
  { code: '39156-5', display: 'Body mass index (BMI)', domainCode: 'bmi', unit: 'kg/m2' },
  { code: '85354-9', display: 'Blood pressure panel with all children optional', domainCode: 'blood-pressure', unit: 'mmHg' },
  { code: '8867-4', display: 'Heart rate', domainCode: 'heart-rate', unit: 'beats/min' },
  { code: '9279-1', display: 'Respiratory rate', domainCode: 'respiratory-rate', unit: 'breaths/min' },
  { code: '8310-5', display: 'Body temperature', domainCode: 'body-temperature', unit: 'Cel' },
  { code: '59408-5', display: 'Oxygen saturation in arterial blood by pulse oximetry', domainCode: 'oxygen-saturation', unit: '%' },
  { code: '2339-0', display: 'Glucose mass/volume in blood', domainCode: 'blood-glucose', unit: 'mg/dL' },
];

const loincLabPresets = [
  { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  { code: '718-7', display: 'Hemoglobin mass/volume in Blood' },
  { code: '6690-2', display: 'Leukocytes number/volume in Blood' },
  { code: '777-3', display: 'Platelets number/volume in Blood' },
  { code: '2951-2', display: 'Sodium moles/volume in Serum or Plasma' },
  { code: '2823-3', display: 'Potassium moles/volume in Serum or Plasma' },
  { code: '2160-0', display: 'Creatinine mass/volume in Serum or Plasma' },
  { code: '2345-7', display: 'Glucose mass/volume in Serum or Plasma' },
  { code: '2093-3', display: 'Cholesterol mass/volume in Serum or Plasma' },
  { code: '2085-9', display: 'Cholesterol in HDL mass/volume in Serum or Plasma' },
  { code: '2089-1', display: 'Cholesterol in LDL mass/volume in Serum or Plasma' },
  { code: '2571-8', display: 'Triglyceride mass/volume in Serum or Plasma' },
];

const loincDocumentPresets = [
  { code: '34133-9', display: 'Summary of episode note' },
  { code: '18842-5', display: 'Discharge summary' },
  { code: '11488-4', display: 'Consult note' },
  { code: '11506-3', display: 'Progress note' },
  { code: '51847-2', display: 'Evaluation + Plan note' },
  { code: '81218-0', display: 'Care plan' },
  { code: '11502-2', display: 'Laboratory report' },
  { code: '18748-4', display: 'Diagnostic imaging study' },
];

const loincDocumentCategoryPresets = [
  { code: 'LP173421-1', display: 'Report' },
  { code: 'LP7839-6', display: 'Note' },
  { code: 'LP29684-5', display: 'Plan' },
];

const snomedWorkflowPresets = [
  { code: '386053000', display: 'Evaluation procedure' },
  { code: '71388002', display: 'Procedure' },
  { code: '225358003', display: 'Wound care education' },
  { code: '710824005', display: 'Assessment of health and social care needs' },
  { code: '183452005', display: 'Review of medication' },
  { code: '409073007', display: 'Education' },
  { code: '410223002', display: 'Follow-up encounter' },
];

const medicationTerminologyPresets = [
  { source: 'RxNorm', system: RXNORM_SYSTEM, code: '860975', display: 'Metformin hydrochloride 500 MG Oral Tablet' },
  { source: 'RxNorm', system: RXNORM_SYSTEM, code: '617314', display: 'Atorvastatin 20 MG Oral Tablet' },
  { source: 'RxNorm', system: RXNORM_SYSTEM, code: '197361', display: 'Amlodipine 5 MG Oral Tablet' },
  { source: 'RxNorm', system: RXNORM_SYSTEM, code: '198440', display: 'Lisinopril 10 MG Oral Tablet' },
  { source: 'RxNorm', system: RXNORM_SYSTEM, code: '313782', display: 'Acetaminophen 325 MG Oral Tablet' },
  { source: 'RxTerms', system: RXTERMS_SYSTEM, code: '860975', display: 'metformin 500 mg tablet' },
  { source: 'RxTerms', system: RXTERMS_SYSTEM, code: '617314', display: 'atorvastatin 20 mg tablet' },
  { source: 'RxTerms', system: RXTERMS_SYSTEM, code: '197361', display: 'amlodipine 5 mg tablet' },
  { source: 'MED-RT', system: MEDRT_SYSTEM, code: 'N0000175503', display: 'Antihyperglycemic agent' },
  { source: 'MED-RT', system: MEDRT_SYSTEM, code: 'N0000175443', display: 'Antihypertensive agent' },
  { source: 'MED-RT', system: MEDRT_SYSTEM, code: 'N0000175622', display: 'Lipid lowering agent' },
];

const withSystem = (system, source, options) => options.map((option) => ({ ...option, system, source }));
const sortTerms = (options) => [...options].sort((a, b) => a.display.localeCompare(b.display) || a.code.localeCompare(b.code));

const terminologySearch = (label, prefix, source, options, extra = {}) => ({
  name: `${prefix}.terminologySearch`,
  label,
  type: 'terminology-search',
  prefix,
  options: sortTerms(options),
  source,
  wide: true,
  help: extra.help || TERMINOLOGY_HELP[source] || REQUIRED_CODING_HELP,
  apply: extra.apply || {},
});

const codingHelp = (label, part) => {
  if (part === 'system') return `${REQUIRED_CODING_HELP} ${TERMINOLOGY_HELP[label] || ''}`.trim();
  if (part === 'code') return `Required ${label} code or concept identifier.`;
  return `${label} display/name for human review and FHIR Coding.display.`;
};

const coding = (label, prefix = 'code', options = {}) => [
  { name: `${prefix}.system`, label: `${label} system`, required: options.required !== false, placeholder: 'https://…', help: codingHelp(label, 'system') },
  { name: `${prefix}.code`, label: `${label} code`, required: options.required !== false, help: codingHelp(label, 'code') },
  { name: `${prefix}.display`, label: `${label} name`, help: codingHelp(label, 'display') },
];

const domains = {
  profiles: {
    label: 'Profile', plural: 'Profiles', icon: '◎',
    description: 'Identity and demographic information held in your pod.',
    fields: [
      { name: 'name.family', label: 'Family name', required: true },
      { name: 'name.given', label: 'Given names', required: true, list: true },
      { name: 'birthDate', label: 'Birth date', type: 'date', required: true },
      { name: 'biologicalSex', label: 'Biological sex', type: 'select', options: ['female', 'male', 'other', 'unknown'], required: true },
      { name: 'photo', label: 'Photo URL' },
    ],
    title: (x) => [...(x.name?.given || []), x.name?.family].filter(Boolean).join(' ') || 'Profile',
    detail: (x) => [x.birthDate, x.biologicalSex].filter(Boolean).join(' · '),
  },
  conditions: {
    label: 'Condition', plural: 'Conditions', icon: '◇',
    description: 'Diagnoses, ongoing conditions, and resolved health concerns.',
    fields: [terminologySearch('SNOMED CT condition search', 'code', 'SNOMED CT', withSystem(SNOMED_CT_SYSTEM, 'SNOMED CT', snomedConditionPresets)), ...coding('SNOMED CT'), { name: 'status', label: 'Status', type: 'select', options: ['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved'], required: true }, { name: 'severity', label: 'Severity', type: 'select', options: ['', 'mild', 'moderate', 'severe'] }, { name: 'onsetDate', label: 'Onset date', type: 'date' }, { name: 'abatementDate', label: 'Resolved date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.code?.display || x.code?.code || 'Condition',
    detail: (x) => [x.status, x.severity, x.onsetDate].filter(Boolean).join(' · '),
  },
  medications: {
    label: 'Medication', plural: 'Medications', icon: '✣',
    description: 'Current and historical medicines, doses, and prescribers.',
    fields: [terminologySearch('RxNorm / RxTerms / MED-RT medication search', 'medicationCode', 'RxNorm', medicationTerminologyPresets, { help: `${TERMINOLOGY_HELP.RxNorm} ${TERMINOLOGY_HELP.RxTerms} ${TERMINOLOGY_HELP['MED-RT']}` }), ...coding('RxNorm', 'medicationCode'), { name: 'status', label: 'Status', type: 'select', options: ['active', 'completed', 'stopped', 'on-hold'], required: true }, { name: 'dosage.text', label: 'Dosage instructions' }, { name: 'startDate', label: 'Start date', type: 'date' }, { name: 'endDate', label: 'End date', type: 'date' }, { name: 'prescriber', label: 'Prescriber' }, { name: 'reason', label: 'Reason' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.medicationCode?.display || x.medicationCode?.code || 'Medication',
    detail: (x) => [x.status, x.dosage?.text, x.startDate].filter(Boolean).join(' · '),
  },
  allergies: {
    label: 'Allergy', plural: 'Allergies', icon: '△',
    description: 'Allergies and intolerances that matter to your care.',
    fields: [terminologySearch('SNOMED CT allergy/substance search', 'substance', 'SNOMED CT', withSystem(SNOMED_CT_SYSTEM, 'SNOMED CT', snomedAllergyPresets)), ...coding('SNOMED CT', 'substance'), { name: 'category', label: 'Category', type: 'select', options: ['food', 'medication', 'environment', 'biologic'], required: true }, { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'resolved'], required: true }, { name: 'onsetDate', label: 'Onset date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.substance?.display || x.substance?.code || 'Allergy',
    detail: (x) => [x.category, x.status, x.onsetDate].filter(Boolean).join(' · '),
  },
  immunizations: {
    label: 'Immunization', plural: 'Immunizations', icon: '✦',
    description: 'Vaccinations, dose history, and administration details.',
    fields: [...coding('CVX', 'vaccineCode'), { name: 'status', label: 'Status', type: 'select', options: ['completed', 'not-done', 'entered-in-error'], required: true }, { name: 'occurrenceDate', label: 'Date', type: 'date', required: true }, { name: 'doseNumber', label: 'Dose number', type: 'number' }, { name: 'lotNumber', label: 'Lot number' }, { name: 'performer', label: 'Performer' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.vaccineCode?.display || x.vaccineCode?.code || 'Immunization',
    detail: (x) => [x.status, x.occurrenceDate, x.doseNumber ? `Dose ${x.doseNumber}` : ''].filter(Boolean).join(' · '),
  },
  'vital-signs': {
    label: 'Vital sign', plural: 'Vital signs', icon: '⌁',
    description: 'Measurements and observations that track your health over time.',
    fields: [terminologySearch('LOINC vital sign search', 'loincCode', 'LOINC', withSystem(LOINC_SYSTEM, 'LOINC', loincVitalPresets), { apply: { code: 'domainCode', unit: 'unit' } }), { name: 'code', label: 'Measurement', type: 'select', options: ['body-weight', 'body-height', 'bmi', 'blood-pressure', 'heart-rate', 'respiratory-rate', 'body-temperature', 'oxygen-saturation', 'blood-glucose'], required: true }, ...coding('LOINC', 'loincCode', { required: false }), { name: 'value', label: 'Value', type: 'number', required: true }, { name: 'unit', label: 'Unit', required: true }, { name: 'effectiveDateTime', label: 'Measured at', type: 'datetime-local', required: true }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => String(x.code || 'Vital sign').replaceAll('-', ' '),
    detail: (x) => `${typeof x.value === 'object' ? JSON.stringify(x.value) : x.value} ${x.unit || ''} · ${formatDate(x.effectiveDateTime)}`,
  },
  providers: {
    label: 'Provider', plural: 'Providers', icon: '✚',
    description: 'Clinicians, pharmacies, laboratories, and care organizations.',
    fields: [{ name: 'name', label: 'Name', required: true }, { name: 'role', label: 'Role', type: 'select', options: ['primary-care', 'specialist', 'emergency', 'pharmacy', 'lab', 'hospital', 'other'], required: true }, { name: 'specialty', label: 'Specialty' }, { name: 'npi', label: 'NPI' }, { name: 'organization', label: 'Organization' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.name || 'Provider',
    detail: (x) => [x.role, x.specialty, x.organization].filter(Boolean).join(' · '),
  },
  'lab-results': {
    label: 'Lab result', plural: 'Lab results', icon: '◉',
    description: 'Laboratory observations, values, and reference ranges.',
    fields: [terminologySearch('LOINC lab result search', 'code', 'LOINC', withSystem(LOINC_SYSTEM, 'LOINC', loincLabPresets)), ...coding('LOINC'), { name: 'value', label: 'Result', required: true }, { name: 'unit', label: 'Unit' }, { name: 'interpretation', label: 'Interpretation', type: 'select', options: ['', 'normal', 'high', 'low', 'critical-high', 'critical-low', 'abnormal'] }, { name: 'effectiveDateTime', label: 'Observed at', type: 'datetime-local', required: true }, { name: 'performer', label: 'Performer' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.code?.display || x.code?.code || 'Lab result',
    detail: (x) => [x.value !== undefined ? `${x.value} ${x.unit || ''}` : '', x.interpretation, formatDate(x.effectiveDateTime)].filter(Boolean).join(' · '),
  },
  'insurance-policies': {
    label: 'Insurance', plural: 'Insurance', icon: '▣',
    description: 'Coverage and plan details available when you need them.',
    fields: [{ name: 'type', label: 'Coverage type', type: 'select', options: ['medical', 'dental', 'vision', 'pharmacy', 'other'], required: true }, { name: 'insurerName', label: 'Insurer', required: true }, { name: 'planName', label: 'Plan name' }, { name: 'memberId', label: 'Member ID', required: true }, { name: 'groupNumber', label: 'Group number' }, { name: 'effectiveDate', label: 'Effective date', type: 'date', required: true }, { name: 'expirationDate', label: 'Expiration date', type: 'date' }, { name: 'policyHolder', label: 'Policy holder' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.planName || x.insurerName || 'Insurance policy',
    detail: (x) => [x.type, x.memberId, x.effectiveDate].filter(Boolean).join(' · '),
  },
  documents: {
    label: 'Document', plural: 'Documents', icon: '▤',
    description: 'Owner-held clinical document metadata such as visit summaries, reports, and care plans.',
    fields: [
      terminologySearch('LOINC document type search', 'documentType', 'LOINC', withSystem(LOINC_SYSTEM, 'LOINC', loincDocumentPresets)),
      ...coding('LOINC document', 'documentType'),
      { name: 'status', label: 'Status', type: 'select', options: ['current', 'superseded', 'entered-in-error'], required: true },
      { name: 'title', label: 'Document title', required: true, help: 'Use the owner-visible title. Avoid adding unnecessary identifiers or full clinical text here.' },
      terminologySearch('LOINC document category search', 'category', 'LOINC', withSystem(LOINC_SYSTEM, 'LOINC', loincDocumentCategoryPresets), { required: false }),
      ...coding('LOINC category', 'category', { required: false }),
      { name: 'authoredDate', label: 'Authored at', type: 'datetime-local' },
      { name: 'sourceSystem', label: 'Source system', placeholder: 'Epic, paper scan, clinic portal…' },
      { name: 'sourceDocumentUrl', label: 'Source document URL' },
      { name: 'binaryUrl', label: 'Pod binary URL' },
      { name: 'custodian', label: 'Custodian' },
      { name: 'notes', label: 'Owner notes', type: 'textarea', wide: true },
    ],
    title: (x) => x.title || x.documentType?.display || x.documentType?.code || 'Document',
    detail: (x) => [x.status, x.documentType?.display || x.documentType?.code, formatDate(x.authoredDate)].filter(Boolean).join(' · '),
  },
  'workflow-tasks': {
    label: 'Workflow task', plural: 'Workflow tasks', icon: '☑',
    description: 'Care tasks, follow-ups, and review steps the pod owner can track without sending outbound messages.',
    fields: [
      terminologySearch('SNOMED CT workflow task search', 'taskType', 'SNOMED CT', withSystem(SNOMED_CT_SYSTEM, 'SNOMED CT', snomedWorkflowPresets)),
      ...coding('SNOMED CT workflow', 'taskType'),
      { name: 'status', label: 'Status', type: 'select', options: ['draft', 'requested', 'received', 'accepted', 'in-progress', 'completed', 'cancelled'], required: true },
      { name: 'intent', label: 'Intent', type: 'select', options: ['proposal', 'plan', 'order', 'option'], required: true },
      { name: 'description', label: 'Task description', type: 'textarea', wide: true, required: true, help: 'Keep this owner-facing and concise. Outbound Epic task updates remain out of MVP scope.' },
      { name: 'authoredDate', label: 'Authored at', type: 'datetime-local' },
      { name: 'dueDate', label: 'Due date', type: 'date' },
      { name: 'requester', label: 'Requester' },
      { name: 'owner', label: 'Owner / responsible party' },
      { name: 'relatedDocumentUrl', label: 'Related document URL' },
      { name: 'notes', label: 'Owner notes', type: 'textarea', wide: true },
    ],
    title: (x) => x.description || x.taskType?.display || x.taskType?.code || 'Workflow task',
    detail: (x) => [x.status, x.intent, x.dueDate ? `Due ${x.dueDate}` : '', x.taskType?.display || x.taskType?.code].filter(Boolean).join(' · '),
  },
};

// ── Wellness landing configuration (issue #32) ───────────────────────────────
// Axis domains are the wellness-meaningful ones plotted as spider-graph vectors.
// Browse domains are reference/administrative records reached from the nav area.
const WELLNESS_AXIS_DOMAINS = ['vital-signs', 'lab-results', 'medications', 'conditions', 'allergies', 'immunizations'];
const WELLNESS_BROWSE_DOMAINS = ['profiles', 'providers', 'insurance-policies', 'documents', 'workflow-tasks'];

// One colour per domain, shared by graph vectors and browse tiles.
const DOMAIN_COLORS = {
  'vital-signs': '#0f8a8d',
  'lab-results': '#2f6bd8',
  medications: '#7a5bd0',
  conditions: '#c2557a',
  allergies: '#d1762f',
  immunizations: '#3f9142',
  profiles: '#176c5c',
  providers: '#4a7fa5',
  'insurance-policies': '#8a7a3d',
  documents: '#5f6f8a',
  'workflow-tasks': '#6b8f5a',
};

const STATUS_COLORS = { green: '#2b9a73', yellow: '#d9a441', red: '#cf5240', empty: '#a9b6b1' };
const STATUS_LABELS = { green: 'On track', yellow: 'Watch', red: 'Attention', empty: 'No data' };

let activeView = 'wellness';
let wellnessSummary = null;
let activeDomain = 'conditions';
let records = [];
let editing = null;
let applicationReady = false;
let epicStatus = { enabled: false, status: 'disabled' };
let epicDiagnostics = null;
let epicPreview = null;
let epicSelectedDomains = new Set();
const $ = (id) => document.getElementById(id);

const PRIMARY_TABS = ['wellness', 'records', 'status'];

function initializeNavigation() {
  // Primary tabs own the top-level destinations. The sidebar below is only a
  // domain selector for the Records tab — Wellness and Connections are no
  // longer buried in it.
  for (const view of PRIMARY_TABS) {
    const tab = $(`tab-${view}`);
    tab.addEventListener('click', () => showView(view));
    tab.addEventListener('keydown', (event) => {
      const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!offset) return;
      event.preventDefault();
      const next = PRIMARY_TABS[(PRIMARY_TABS.indexOf(view) + offset + PRIMARY_TABS.length) % PRIMARY_TABS.length];
      showView(next);
      $(`tab-${next}`).focus();
    });
  }

  const nav = $('domain-nav');
  const label = document.createElement('p');
  label.className = 'nav-label';
  label.textContent = 'Health records';
  nav.append(label);
  for (const [key, config] of Object.entries(domains)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.domain = key;
    button.innerHTML = `<span class="nav-icon">${config.icon}</span>${config.plural}`;
    button.addEventListener('click', () => selectDomain(key));
    nav.append(button);
  }
}

/** Switches the single-page view. 'wellness' is the landing view. */
function showView(view) {
  activeView = view;
  for (const name of PRIMARY_TABS) {
    $(`view-${name}`).classList.toggle('hidden', name !== view);
    const tab = $(`tab-${name}`);
    const selected = name === view;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    // Roving tabindex: only the selected tab is in the tab order.
    tab.tabIndex = selected ? 0 : -1;
  }
  // The domain sidebar is a selector for the Records tab only.
  $('domain-nav').classList.toggle('hidden', view !== 'records');
  document.querySelectorAll('.domain-nav button').forEach((button) => {
    button.classList.toggle('active', view === 'records' && button.dataset.domain === activeDomain);
  });
  if (view === 'wellness') void refreshWellness();
}

async function refreshWellness(ready = applicationReady) {
  if (!ready) {
    renderWellness(null);
    return;
  }
  try {
    const response = await fetch('/api/wellness/summary');
    const payload = await response.json();
    if (!response.ok) throw new Error(formatApiError(payload));
    wellnessSummary = payload.data;
    renderWellness(wellnessSummary);
  } catch (error) {
    renderWellness({ error: error.message });
  }
}

function renderWellness(summary) {
  const target = $('wellness-graph');
  target.replaceChildren();
  if (!summary || summary.error) {
    const message = document.createElement('p');
    message.className = 'wellness-loading';
    message.textContent = summary?.error
      || 'Your wellness overview appears once the pod connection is ready. Open Pod status for details.';
    target.append(message);
    renderBrowseNav(null);
    return;
  }
  target.append(createSpiderGraph(summary.axes));
  renderBrowseNav(summary.browse);
}

/**
 * Draws the wellness spider graph: one colour-coded vector per axis domain with
 * the owner's current normalized value plotted as a red/yellow/green point.
 */
function createSpiderGraph(axes) {
  const size = 320;
  const center = size / 2;
  const radius = center - 46;
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'spider');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Wellness spider graph across ${axes.length} health domains`);

  const node = (name, attributes) => {
    const element = document.createElementNS(svgNs, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  };
  const point = (index, fraction) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    return [center + Math.cos(angle) * radius * fraction, center + Math.sin(angle) * radius * fraction];
  };

  for (const ring of [0.25, 0.5, 0.75, 1]) {
    const outline = axes.map((_, index) => point(index, ring).join(',')).join(' ');
    svg.append(node('polygon', { points: outline, class: 'spider-ring' }));
  }

  const plotted = axes.map((axis, index) => point(index, Math.max((axis.score ?? 0) / 100, 0.04)));
  svg.append(node('polygon', { points: plotted.map((pair) => pair.join(',')).join(' '), class: 'spider-area' }));

  axes.forEach((axis, index) => {
    const [ax, ay] = point(index, 1);
    const color = DOMAIN_COLORS[axis.domain] || '#176c5c';
    svg.append(node('line', { x1: center, y1: center, x2: ax, y2: ay, stroke: color, 'stroke-width': 2, 'stroke-opacity': .55 }));

    const [px, py] = plotted[index];
    const marker = node('circle', {
      cx: px, cy: py, r: 7,
      fill: STATUS_COLORS[axis.status] || STATUS_COLORS.empty,
      stroke: '#fffdf7', 'stroke-width': 2,
      class: 'spider-point', tabindex: '0', role: 'button',
      // Addressable by domain so a point can be identified without parsing
      // its label — used by the browser E2E to prove the tapped vector opens
      // that same domain's records.
      'data-domain': axis.domain,
      'aria-label': `${axis.label}: ${STATUS_LABELS[axis.status]}${axis.score === null ? '' : `, score ${axis.score}`}. ${axis.summary}`,
    });
    const tip = node('title', {});
    tip.textContent = `${axis.label} — ${STATUS_LABELS[axis.status]}${axis.score === null ? '' : ` (${axis.score}/100)`}\n${axis.summary}`;
    marker.append(tip);
    marker.addEventListener('click', () => selectDomain(axis.domain));
    marker.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectDomain(axis.domain); }
    });
    svg.append(marker);

    const [lx, ly] = point(index, 1.2);
    const label = node('text', {
      x: lx, y: ly, fill: color, class: 'spider-label',
      'text-anchor': lx > center + 4 ? 'start' : lx < center - 4 ? 'end' : 'middle',
      'dominant-baseline': ly > center ? 'hanging' : ly < center ? 'auto' : 'middle',
    });
    label.textContent = axis.label;
    label.addEventListener('click', () => selectDomain(axis.domain));
    svg.append(label);
  });

  return svg;
}

/** Non-graph domains: a browse/exploration row with per-domain record counts. */
function renderBrowseNav(browse) {
  const nav = $('browse-nav');
  nav.replaceChildren();
  const entries = browse || WELLNESS_BROWSE_DOMAINS.map((domain) => ({ domain, count: null }));
  for (const entry of entries) {
    const config = domains[entry.domain];
    if (!config) continue;
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'browse-tile';
    tile.style.setProperty('--tile-color', DOMAIN_COLORS[entry.domain] || '#176c5c');
    tile.setAttribute('aria-label', `Browse ${config.plural}${Number.isInteger(entry.count) ? `, ${entry.count} record${entry.count === 1 ? '' : 's'}` : ''}`);
    tile.innerHTML = `<span class="browse-icon">${config.icon}</span><span class="browse-label">${config.plural}</span><span class="browse-count">${Number.isInteger(entry.count) ? entry.count : '—'}</span>`;
    tile.addEventListener('click', () => selectDomain(entry.domain));
    nav.append(tile);
  }
}

/**
 * The masthead pill is the only pod-connectivity signal on the landing view and
 * the way into the full status page. On narrow screens it collapses to its dot,
 * so the label lives in the accessible name as well as the visible text.
 */
function setConnectionIndicator(state, label) {
  const indicator = $('connection');
  indicator.className = `connection ${state}`;
  indicator.setAttribute('aria-label', `Pod connection: ${label}. Open pod connection status.`);
  indicator.replaceChildren();
  const dot = document.createElement('span');
  dot.className = 'connection-dot';
  const text = document.createElement('span');
  text.className = 'connection-label';
  text.textContent = label;
  indicator.append(dot, text);
}

async function checkStatus() {
  try {
    const response = await fetch('/api/status');
    const status = await response.json();
    const ready = response.ok && status.ok;
    applicationReady = ready;
    setConnectionIndicator(ready ? '' : 'offline', ready ? 'Pod connected' : 'Pod setup needed');
    $('pod-state').textContent = ready ? 'Connected' : 'Unavailable';
    $('setup-warning').classList.toggle('hidden', ready);
    $('setup-message').textContent = ready ? '' : (status.error || 'Configure the Solid server, pod URL, client ID, and client secret for this deployment.');
    $('add-button').disabled = !ready;
    renderPodManagement(status, ready);
    await refreshPodActivity(ready);
    await refreshHealthKitStatus(ready);
    renderEpicStatus(status.epic || { enabled: false, status: 'disabled' }, ready);
    await refreshEpicDiagnostics(ready, false, status.epic || { enabled: false, status: 'disabled' });
    await refreshWellness(ready);
    return ready;
  } catch {
    applicationReady = false;
    setConnectionIndicator('offline', 'Application offline');
    $('pod-state').textContent = 'Unavailable';
    $('add-button').disabled = true;
    renderPodManagement({ error: 'Application offline' }, false);
    renderPodActivity(null);
    renderHealthKitStatus(null);
    renderEpicStatus({ enabled: false, status: 'disabled' }, false);
    renderEpicReadiness(null);
    renderWellness(null);
    return false;
  }
}

async function refreshPodActivity(ready = applicationReady) {
  if (!ready) {
    renderPodActivity(null);
    return;
  }
  try {
    const response = await fetch('/api/pod/activity?limit=8');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Pod activity is not available');
    renderPodActivity(payload.data);
  } catch (error) {
    renderPodActivity({ error: error.message });
  }
}

async function refreshHealthKitStatus(ready = applicationReady) {
  if (!ready) {
    renderHealthKitStatus(null);
    return;
  }
  try {
    const response = await fetch('/api/pod/healthkit/status');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'HealthKit mirror status is not available');
    renderHealthKitStatus(payload.data);
  } catch (error) {
    renderHealthKitStatus({ error: error.message });
  }
}

function renderPodManagement(status, ready = applicationReady) {
  const domainNames = Array.isArray(status.domains) && status.domains.length > 0
    ? status.domains
    : Object.keys(domains);
  $('pod-management-summary').textContent = ready
    ? 'Authenticated owner access is active; records are read from and written to the configured Solid Pod.'
    : (status.error || 'Pod access is not ready. Start local CSS, provision credentials, and verify the configured Pod root.');
  $('pod-access-state').textContent = ready ? 'Connected' : 'Needs attention';
  $('pod-domain-count').textContent = `${domainNames.length} domain${domainNames.length === 1 ? '' : 's'}`;
  $('pod-server-url').textContent = status.podServerUrl || 'Not configured';
  $('pod-base-url').textContent = status.podBaseUrl || 'Not configured';
  $('pod-release-state').textContent = 'Identifiable PHI stays in the authenticated owner Pod. External release uses anonymized endpoints only after owner approval and a declared purpose.';

  const list = $('pod-domain-list');
  list.replaceChildren();
  for (const name of domainNames) {
    const tag = document.createElement('span');
    tag.textContent = domains[name]?.plural || name;
    list.append(tag);
  }
}

function renderPodActivity(activity) {
  const containerList = $('pod-container-list');
  const activityList = $('pod-activity-list');
  const healthKitStatus = $('healthkit-status');
  containerList.replaceChildren();
  activityList.replaceChildren();

  if (!activity || activity.error) {
    const empty = document.createElement('p');
    empty.textContent = activity?.error || 'Pod activity appears here after the owner performs local Pod actions.';
    activityList.append(empty);
    if (healthKitStatus) renderHealthKitStatus(null);
    return;
  }

  for (const container of activity.summary.containers || []) {
    const row = document.createElement('article');
    row.innerHTML = `<strong>${container.label}</strong><span>${container.relativePath}</span><small>${container.status} · ${container.purpose}</small>`;
    containerList.append(row);
  }
  if (activity.summary.auditPersistence) {
    const audit = document.createElement('article');
    const status = activity.summary.auditPersistence;
    audit.innerHTML = `<strong>Audit persistence</strong><span>${status.resourcePath}</span><small>${status.status}${Number.isInteger(status.eventCount) ? ` · ${status.eventCount} event${status.eventCount === 1 ? '' : 's'}` : ''}</small>`;
    audit.className = `pod-activity-${status.status === 'attention' ? 'attention' : status.status === 'active' ? 'ok' : 'info'}`;
    containerList.append(audit);
  }

  const counts = activity.summary.domainCounts || {};
  for (const tag of $('pod-domain-list').querySelectorAll('span')) {
    const domain = Object.entries(domains).find(([, config]) => config.plural === tag.textContent)?.[0];
    if (domain && Number.isInteger(counts[domain])) tag.textContent = `${tag.textContent}: ${counts[domain]}`;
  }

  if (!activity.events?.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No owner activity has been recorded in this local process yet.';
    activityList.append(empty);
    return;
  }

  for (const event of activity.events) {
    const row = document.createElement('article');
    const when = formatDate(event.at);
    row.innerHTML = `<strong>${event.summary}</strong><span>${event.kind}${event.domain ? ` · ${event.domain}` : ''}</span><small>${when}${event.resourcePath ? ` · ${event.resourcePath}` : ''}</small>`;
    row.className = `pod-activity-${event.status}`;
    activityList.append(row);
  }
}

function renderHealthKitStatus(status) {
  const target = $('healthkit-status');
  if (!target) return;
  target.replaceChildren();
  if (!status || status.error) {
    const empty = document.createElement('p');
    empty.textContent = status?.error || 'HealthKit mirror status appears after authenticated Pod access is ready.';
    target.append(empty);
    return;
  }
  const summary = document.createElement('article');
  summary.className = `pod-activity-${status.status === 'attention' ? 'attention' : 'ok'}`;
  summary.innerHTML = `<strong>${status.source} · ${status.status}</strong><span>${status.containerPath}</span><small>${Number.isInteger(status.observationCount) ? `${status.observationCount} mirrored observation${status.observationCount === 1 ? '' : 's'}` : 'Observation count unavailable'}</small>`;
  const boundary = document.createElement('p');
  boundary.textContent = status.privacyBoundary;
  const action = document.createElement('small');
  action.textContent = status.nextOwnerAction;
  target.append(summary, boundary, action);
}

function renderEpicStatus(status, ready = applicationReady) {
  epicStatus = status;
  const enabled = Boolean(status.enabled);
  const connected = status.status === 'connected';
  $('epic-summary').textContent = enabled
    ? `Mode: ${status.mode}. Status: ${status.status}${status.lastSyncAt ? `. Last sync: ${formatDate(status.lastSyncAt)}` : ''}.`
    : 'Epic integration is disabled for this local deployment. Set EPIC_ENABLED=true and use EPIC_MODE=mock for local MVP review.';
  $('epic-diagnostics').disabled = !ready || !enabled || status.mode === 'mock';
  $('epic-diagnostics').title = status.mode === 'mock'
    ? 'Mock mode does not perform live Epic SMART/FHIR checks.'
    : 'Run explicit live SMART discovery and FHIR CapabilityStatement checks.';
  $('epic-connect').disabled = !ready || !enabled || connected;
  $('epic-preview').disabled = !ready || !enabled || !connected;
  $('epic-apply').disabled = !ready || !enabled || !connected || !epicPreview || epicSelectedDomains.size === 0;
}

async function refreshEpicDiagnostics(ready = applicationReady, live = false, status = epicStatus) {
  if (!ready || !status?.enabled) {
    epicDiagnostics = null;
    renderEpicReadiness(null);
    return;
  }
  try {
    const response = await fetch(`/api/integrations/epic/diagnostics${live ? '?live=true' : ''}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(formatApiError(payload));
    epicDiagnostics = payload.data;
    renderEpicReadiness(epicDiagnostics);
  } catch (error) {
    renderEpicReadiness({ error: error.message });
  }
}

function renderEpicReadiness(diagnostics) {
  const target = $('epic-readiness');
  if (!target) return;
  target.replaceChildren();
  if (!diagnostics || diagnostics.error) {
    const empty = document.createElement('p');
    empty.textContent = diagnostics?.error || 'Epic registration readiness appears after the local connector status is available.';
    target.append(empty);
    return;
  }

  const registration = diagnostics.registration || {};
  const configured = registration.configured || {};
  const summary = document.createElement('article');
  summary.className = `epic-readiness-card epic-readiness-${diagnostics.readiness}`;
  const title = document.createElement('strong');
  title.textContent = `Registration readiness: ${diagnostics.readiness}`;
  const detail = document.createElement('span');
  detail.textContent = diagnostics.live
    ? `Live Epic discovery checked. SMART/FHIR readiness: ${registration.liveDiscoveryReadiness}.`
    : `Local configuration checked. Live Epic discovery: ${registration.liveDiscoveryReadiness}.`;
  summary.append(title, detail);

  const checklist = document.createElement('dl');
  checklist.className = 'epic-readiness-grid';
  for (const [label, value] of [
    ['Mode', registration.mode || diagnostics.mode],
    ['FHIR host', configured.fhirBaseUrlHost || (configured.fhirBaseUrl ? 'configured' : 'not configured')],
    ['Redirect URI', configured.redirectUriPath ? `${configured.redirectUriHost}${configured.redirectUriPath}` : configured.redirectUri ? 'configured' : 'not configured'],
    ['Client ID', configured.clientId ? 'configured' : 'not configured'],
    ['Client secret', configured.clientSecret ? 'configured' : 'not configured'],
    ['Grant encryption', configured.grantEncryptionKey ? 'configured' : 'not configured'],
    ['Scopes', `${registration.scopeCount || 0} requested`],
  ]) {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    checklist.append(term, description);
  }

  const support = document.createElement('div');
  support.className = 'epic-resource-support';
  const supported = (diagnostics.resourceSupport || []).filter((item) => item.capability === 'supported').length;
  const notChecked = (diagnostics.resourceSupport || []).filter((item) => item.capability === 'not-checked').length;
  const missingScopes = (diagnostics.resourceSupport || []).filter((item) => !item.configuredScopePresent).length;
  support.textContent = diagnostics.live
    ? `${supported} Epic resource families are listed by live metadata; ${missingScopes} roadmap families still lack configured patient read scopes.`
    : `${notChecked} Epic resource families await explicit live metadata checking; ${missingScopes} roadmap families lack configured patient read scopes.`;

  const exportNote = document.createElement('small');
  exportNote.textContent = 'Safe diagnostics export is available from /api/integrations/epic/diagnostics and omits secrets, tokens, authorization codes, patient identifiers, raw PHI, and document URLs.';
  target.append(summary, checklist, support, exportNote);
}

async function selectDomain(key) {
  activeDomain = key;
  const config = domains[key];
  activeView = 'records';
  for (const name of ['wellness', 'records', 'status']) {
    $(`view-${name}`).classList.toggle('hidden', name !== 'records');
  }
  document.querySelectorAll('.domain-nav button').forEach((button) => button.classList.toggle('active', button.dataset.domain === key));
  $('page-title').textContent = config.plural;
  $('page-description').textContent = config.description;
  $('table-title').textContent = config.plural;
  $('search').value = '';
  if (!applicationReady) {
    records = [];
    $('record-count').textContent = '0';
    $('loading').textContent = 'Records will appear here after the Solid pod connection is configured.';
    $('loading').classList.remove('hidden');
    $('empty').classList.add('hidden');
    $('record-list').replaceChildren();
    return;
  }
  await loadRecords();
}

async function loadRecords() {
  $('loading').classList.remove('hidden');
  $('empty').classList.add('hidden');
  $('record-list').replaceChildren();
  try {
    const response = await fetch(`/api/resources/${activeDomain}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load records');
    records = payload.data;
    renderRecords();
  } catch (error) {
    records = [];
    $('loading').textContent = error.message;
  }
}

function renderRecords() {
  const query = $('search').value.trim().toLowerCase();
  const config = domains[activeDomain];
  const visible = records.filter((record) => JSON.stringify(record).toLowerCase().includes(query));
  $('loading').classList.add('hidden');
  $('empty').classList.toggle('hidden', records.length !== 0);
  $('record-count').textContent = records.length;
  const list = $('record-list');
  list.replaceChildren();
  for (const record of visible) {
    const node = $('record-template').content.cloneNode(true);
    node.querySelector('.record-icon').textContent = config.icon;
    node.querySelector('h3').textContent = config.title(record);
    node.querySelector('p').textContent = config.detail(record) || 'No additional details';
    node.querySelector('small').textContent = record.updatedAt ? `Updated ${formatDate(record.updatedAt)}` : 'Stored in your Solid pod';
    node.querySelector('.edit').addEventListener('click', () => openForm(record));
    node.querySelector('.delete').addEventListener('click', () => deleteRecord(record));
    list.append(node);
  }
}

function openForm(record = null) {
  editing = record;
  const config = domains[activeDomain];
  $('form-eyebrow').textContent = record ? 'Update record' : 'New record';
  $('form-title').textContent = `${record ? 'Edit' : 'Add'} ${config.label.toLowerCase()}`;
  $('form-error').classList.add('hidden');
  const fields = $('form-fields');
  fields.replaceChildren();
  for (const field of config.fields) fields.append(createField(field, record));
  $('record-dialog').showModal();
}

function createField(field, record) {
  const wrapper = document.createElement('div');
  wrapper.className = `field ${field.wide ? 'wide' : ''}`;
  const label = document.createElement('label');
  label.htmlFor = `field-${field.name}`;
  label.innerHTML = `${field.label}${field.required ? ' <span class="required">*</span>' : ''}${field.help ? ' <span class="tooltip" aria-label="Help" title=""></span>' : ''}`;
  if (field.help) {
    label.title = field.help;
    label.querySelector('.tooltip').title = field.help;
  }
  let input;
  if (field.type === 'terminology-search') {
    input = createTerminologySearch(field, record);
  } else if (field.type === 'select') {
    input = document.createElement('select');
    for (const option of field.options) {
      const element = document.createElement('option');
      element.value = option;
      element.textContent = option ? option.replaceAll('-', ' ') : 'Not specified';
      input.append(element);
    }
  } else if (field.type === 'textarea') {
    input = document.createElement('textarea');
  } else {
    input = document.createElement('input');
    input.type = field.type || 'text';
    if (field.type === 'number') input.step = 'any';
  }
  input.id = `field-${field.name}`;
  input.name = field.name;
  input.required = Boolean(field.required);
  input.placeholder = field.placeholder || '';
  const current = getPath(record || {}, field.name);
  if (field.type !== 'terminology-search') {
    input.value = field.list && Array.isArray(current) ? current.join(', ') : normalizeInputValue(current, field.type);
  }
  wrapper.append(label, input);
  if (input._terminologyList) wrapper.append(input._terminologyList);
  if (field.help) {
    const help = document.createElement('small');
    help.className = 'field-help';
    help.textContent = field.help;
    wrapper.append(help);
  }
  return wrapper;
}

function createTerminologySearch(field, record) {
  const input = document.createElement('input');
  const listId = `list-${field.name.replaceAll('.', '-')}`;
  input.type = 'search';
  input.setAttribute('list', listId);
  input.autocomplete = 'off';
  input.placeholder = 'Start typing a name or code…';

  const list = document.createElement('datalist');
  list.id = listId;
  for (const option of field.options) {
    const element = document.createElement('option');
    element.value = terminologyOptionValue(option);
    element.label = `${option.code} · ${option.source || field.source}`;
    list.append(element);
  }

  const currentCode = getPath(record || {}, `${field.prefix}.code`);
  const current = field.options.find((option) => option.code === currentCode);
  if (current) input.value = terminologyOptionValue(current);
  input.addEventListener('input', () => applyTerminologySearch(field, input));
  input.addEventListener('change', () => applyTerminologySearch(field, input));
  input._terminologyList = list;
  return input;
}

function terminologyOptionValue(option) {
  return `${option.display} — ${option.code} [${option.source || 'terminology'}]`;
}

function applyTerminologySearch(field, input) {
  const typed = input.value.trim().toLowerCase();
  if (!typed) return;
  const selected = field.options.find((option) => {
    const value = terminologyOptionValue(option).toLowerCase();
    return value === typed || option.code.toLowerCase() === typed || option.display.toLowerCase() === typed;
  });
  if (!selected) return;
  setInputValue(`${field.prefix}.system`, selected.system);
  setInputValue(`${field.prefix}.code`, selected.code);
  setInputValue(`${field.prefix}.display`, selected.display);
  for (const [fieldName, selectedKey] of Object.entries(field.apply || {})) {
    setInputValue(fieldName, selected[selectedKey]);
  }
}

function setInputValue(name, value) {
  const input = document.getElementById(`field-${name}`);
  if (input) input.value = value;
}

async function saveRecord(event) {
  event.preventDefault();
  const entity = editing ? structuredClone(editing) : {};
  for (const field of domains[activeDomain].fields) {
    if (field.type === 'terminology-search') continue;
    const input = event.currentTarget.elements.namedItem(field.name);
    if (!input.value && !field.required) continue;
    let value = input.value;
    if (field.type === 'number') value = Number(value);
    if (field.list) value = value.split(',').map((item) => item.trim()).filter(Boolean);
    if (field.type === 'datetime-local' && value) value = new Date(value).toISOString();
    setPath(entity, field.name, value);
  }
  try {
    const response = await fetch(`/api/resources/${activeDomain}`, {
      method: editing ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entity),
    });
    const payload = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(formatApiError(payload));
    $('record-dialog').close();
    await loadRecords();
    await refreshWellness();
  } catch (error) {
    $('form-error').textContent = error.message;
    $('form-error').classList.remove('hidden');
  }
}

async function deleteRecord(record) {
  if (!confirm(`Delete “${domains[activeDomain].title(record)}” from your pod?`)) return;
  const response = await fetch(`/api/resources/${activeDomain}?url=${encodeURIComponent(record.url)}`, { method: 'DELETE' });
  if (!response.ok) {
    const payload = await response.json();
    alert(formatApiError(payload));
    return;
  }
  await loadRecords();
  await refreshWellness();
}

async function connectEpic() {
  try {
    const startResponse = await fetch('/api/integrations/epic/connect/start', { method: 'POST' });
    const startPayload = await startResponse.json();
    if (!startResponse.ok) throw new Error(formatApiError(startPayload));
    const authorizationUrl = startPayload.data.authorizationUrl;
    if (epicStatus.mode === 'mock' || authorizationUrl.startsWith('/')) {
      const callbackResponse = await fetch(authorizationUrl);
      const callbackPayload = await callbackResponse.json();
      if (!callbackResponse.ok) throw new Error(formatApiError(callbackPayload));
      renderEpicStatus(callbackPayload.data);
      epicPreview = null;
      epicSelectedDomains = new Set();
      renderEpicPreview();
      return;
    }
    window.location.href = authorizationUrl;
  } catch (error) {
    alert(error.message);
  }
}

async function previewEpicImport() {
  try {
    const response = await fetch('/api/integrations/epic/sync/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflow: 'annual-medicare-wellness' }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(formatApiError(payload));
    epicPreview = payload.data;
    epicSelectedDomains = new Set(epicPreview.changes.map((change) => change.domain));
    renderEpicPreview();
    renderEpicStatus(epicStatus);
  } catch (error) {
    alert(error.message);
  }
}

async function applyEpicImport() {
  if (!epicPreview) return;
  const selectedDomains = [...epicSelectedDomains];
  const selectedChanges = epicPreview.changes.filter((change) => epicSelectedDomains.has(change.domain));
  if (selectedDomains.length === 0) {
    alert('Select at least one import section before applying Epic records to your pod.');
    return;
  }
  if (!confirm(`Apply ${selectedChanges.length} owner-reviewed Epic import candidates across ${selectedDomains.length} section(s) to your Solid pod?`)) return;
  try {
    const response = await fetch('/api/integrations/epic/sync/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ importJobId: epicPreview.importJobId, domains: selectedDomains }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(formatApiError(payload));
    epicPreview = null;
    epicSelectedDomains = new Set();
    renderEpicPreview(payload.data);
    await checkStatus();
    await loadRecords();
  } catch (error) {
    alert(error.message);
  }
}

function renderEpicPreview(applyResult = null) {
  const list = $('epic-preview-list');
  list.replaceChildren();
  if (applyResult) {
    list.classList.remove('hidden');
    const message = document.createElement('p');
    message.textContent = `Applied ${applyResult.resources.length} records to the Solid pod from import ${applyResult.importJobId}.`;
    list.append(message);
    return;
  }
  if (!epicPreview) {
    list.classList.add('hidden');
    return;
  }
  list.classList.remove('hidden');
  const summary = document.createElement('p');
  const grouped = groupEpicChangesByDomain(epicPreview.changes);
  summary.textContent = `${epicPreview.changes.length} mapped FHIR resources are ready for owner review before pod write. ${formatEpicActionCounts(epicPreview.changes)} Review each section and choose what to apply.`;
  list.append(summary);
  list.append(renderReconciliationReview(epicPreview));

  const checklist = document.createElement('div');
  checklist.className = 'epic-review-checklist';
  for (const [domain, changes] of grouped) {
    const id = `epic-section-${domain}`;
    const row = document.createElement('label');
    row.className = 'epic-review-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = epicSelectedDomains.has(domain);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) epicSelectedDomains.add(domain);
      else epicSelectedDomains.delete(domain);
      renderEpicStatus(epicStatus);
      renderEpicSelectionSummary();
    });
    const text = document.createElement('span');
    text.textContent = `${domains[domain]?.plural || domain}: ${changes.length} candidate${changes.length === 1 ? '' : 's'}`;
    row.append(checkbox, text);
    checklist.append(row);
  }
  list.append(checklist);

  const selection = document.createElement('p');
  selection.id = 'epic-selection-summary';
  selection.className = 'epic-selection-summary';
  list.append(selection);
  renderEpicSelectionSummary();

  for (const [domain, changes] of grouped) {
    const section = document.createElement('section');
    section.className = 'epic-domain-section';
    const heading = document.createElement('h3');
    heading.textContent = domains[domain]?.plural || domain;
    section.append(heading);
    for (const change of changes) {
      const item = document.createElement('article');
      const domainLabel = document.createElement('strong');
      domainLabel.textContent = change.action;
      domainLabel.className = `epic-action epic-action-${change.action}`;
      const display = document.createElement('span');
      display.textContent = change.reconciliation?.detail ? `${change.display} — ${change.reconciliation.detail}` : change.display;
      const source = document.createElement('small');
      source.textContent = `${change.provenance.sourceResourceType}/${change.provenance.sourceResourceId}`;
      item.append(domainLabel, display, source);
      section.append(item);
    }
    list.append(section);
  }
}

function groupEpicChangesByDomain(changes) {
  const grouped = new Map();
  for (const change of changes) {
    grouped.set(change.domain, [...(grouped.get(change.domain) || []), change]);
  }
  return [...grouped.entries()].sort(([a], [b]) => (domains[a]?.plural || a).localeCompare(domains[b]?.plural || b));
}

function renderReconciliationReview(preview) {
  const summary = preview.reconciliationSummary || summarizePreviewReconciliation(preview.changes);
  const panel = document.createElement('section');
  panel.className = `reconciliation-review ${summary.blocked > 0 ? 'has-conflicts' : ''}`;
  const heading = document.createElement('h3');
  heading.textContent = 'Owner reconciliation review';
  const guidance = document.createElement('p');
  guidance.textContent = summary.reviewRequired
    ? 'Review updates and conflicts before applying. Conflict candidates are skipped until the owner resolves them manually.'
    : 'No update conflicts are currently detected; create candidates can be applied by selected section.';
  panel.append(heading, guidance);

  const chips = document.createElement('div');
  chips.className = 'reconciliation-chips';
  for (const [label, value] of [
    ['Safe to apply', summary.safeToApply],
    ['Updates', summary.byAction.update],
    ['Conflicts', summary.byAction.conflict],
    ['Unchanged', summary.unchanged],
  ]) {
    const chip = document.createElement('span');
    chip.className = 'reconciliation-chip';
    chip.textContent = `${label}: ${value}`;
    chips.append(chip);
  }
  panel.append(chips);

  if (summary.advisories?.length) {
    const advisories = document.createElement('ul');
    advisories.className = 'reconciliation-advisories';
    for (const advisory of summary.advisories) {
      const item = document.createElement('li');
      item.textContent = advisory;
      advisories.append(item);
    }
    panel.append(advisories);
  }

  const conflicts = preview.changes.filter((change) => change.action === 'conflict');
  if (conflicts.length > 0) {
    const conflictList = document.createElement('div');
    conflictList.className = 'reconciliation-conflicts';
    for (const change of conflicts) {
      const item = document.createElement('article');
      const label = domains[change.domain]?.plural || change.domain;
      item.innerHTML = `<strong>${label}</strong><span></span><small></small>`;
      item.querySelector('span').textContent = change.display;
      item.querySelector('small').textContent = change.reconciliation?.detail || 'Manual owner review is required.';
      conflictList.append(item);
    }
    panel.append(conflictList);
  }

  return panel;
}

function summarizePreviewReconciliation(changes) {
  const byAction = { create: 0, update: 0, unchanged: 0, conflict: 0 };
  const byStatus = {};
  const byDomain = new Map();
  for (const change of changes) {
    byAction[change.action] += 1;
    if (change.reconciliation?.status) byStatus[change.reconciliation.status] = (byStatus[change.reconciliation.status] || 0) + 1;
    const domain = byDomain.get(change.domain) || { domain: change.domain, total: 0, create: 0, update: 0, unchanged: 0, conflict: 0, reviewRequired: false };
    domain.total += 1;
    domain[change.action] += 1;
    domain.reviewRequired = domain.reviewRequired || change.action === 'update' || change.action === 'conflict';
    byDomain.set(change.domain, domain);
  }
  const summary = {
    total: changes.length,
    safeToApply: byAction.create + byAction.update,
    blocked: byAction.conflict,
    unchanged: byAction.unchanged,
    reviewRequired: byAction.update > 0 || byAction.conflict > 0,
    byAction,
    byStatus,
    byDomain: [...byDomain.values()],
    advisories: [],
  };
  if (byAction.conflict > 0) summary.advisories.push('Resolve conflict candidates manually before applying those records to the owner Pod.');
  if (byAction.update > 0) summary.advisories.push('Review update candidates because matching local Pod records will be changed.');
  if (byAction.unchanged > 0) summary.advisories.push('Unchanged candidates are visible for provenance review and are skipped during apply.');
  return summary;
}

function renderEpicSelectionSummary() {
  const summary = $('epic-selection-summary');
  if (!summary || !epicPreview) return;
  const selectedChanges = epicPreview.changes.filter((change) => epicSelectedDomains.has(change.domain));
  summary.textContent = `${selectedChanges.length} selected candidate${selectedChanges.length === 1 ? '' : 's'} will be applied from ${epicSelectedDomains.size} owner-reviewed section${epicSelectedDomains.size === 1 ? '' : 's'}.`;
}

function formatEpicActionCounts(changes) {
  const counts = changes.reduce((acc, change) => {
    acc[change.action] = (acc[change.action] || 0) + 1;
    return acc;
  }, {});
  return ['create', 'update', 'unchanged', 'conflict']
    .filter((action) => counts[action])
    .map((action) => `${counts[action]} ${action}`)
    .join(' · ');
}

function getPath(object, dotted) {
  return dotted.split('.').reduce((value, key) => value?.[key], object);
}
function setPath(object, dotted, value) {
  const keys = dotted.split('.');
  const last = keys.pop();
  const target = keys.reduce((current, key) => current[key] ||= {}, object);
  target[last] = value;
}
function normalizeInputValue(value, type) {
  if (value === undefined || value === null) return '';
  if (type === 'datetime-local') return String(value).slice(0, 16);
  return String(value);
}
function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatApiError(payload) {
  if (payload.issues?.length) return payload.issues.map((issue) => `${issue.field}: ${issue.reason}`).join(' · ');
  return payload.error || 'The request could not be completed.';
}

$('add-button').addEventListener('click', () => openForm());
$('record-form').addEventListener('submit', saveRecord);
$('search').addEventListener('input', renderRecords);
$('epic-connect').addEventListener('click', connectEpic);
$('epic-diagnostics').addEventListener('click', () => refreshEpicDiagnostics(applicationReady, true, epicStatus));
$('epic-preview').addEventListener('click', previewEpicImport);
$('epic-apply').addEventListener('click', applyEpicImport);
$('connection').addEventListener('click', () => showView('status'));
document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  showView('wellness');
});
initializeNavigation();
showView('wellness');
checkStatus();
