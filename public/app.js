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
};

let activeDomain = 'conditions';
let records = [];
let editing = null;
let applicationReady = false;
let epicStatus = { enabled: false, status: 'disabled' };
let epicPreview = null;
let epicSelectedDomains = new Set();
const $ = (id) => document.getElementById(id);

function initializeNavigation() {
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

async function checkStatus() {
  try {
    const response = await fetch('/api/status');
    const status = await response.json();
    const ready = response.ok && status.ok;
    applicationReady = ready;
    $('connection').className = `connection ${ready ? '' : 'offline'}`;
    $('connection').innerHTML = `<span></span>${ready ? 'Pod connected' : 'Pod setup needed'}`;
    $('pod-state').textContent = ready ? 'Connected' : 'Unavailable';
    $('setup-warning').classList.toggle('hidden', ready);
    $('setup-message').textContent = ready ? '' : (status.error || 'Configure the Solid server, pod URL, client ID, and client secret for this deployment.');
    $('add-button').disabled = !ready;
    renderEpicStatus(status.epic || { enabled: false, status: 'disabled' }, ready);
    return ready;
  } catch {
    applicationReady = false;
    $('connection').className = 'connection offline';
    $('connection').innerHTML = '<span></span>Application offline';
    $('pod-state').textContent = 'Unavailable';
    $('add-button').disabled = true;
    renderEpicStatus({ enabled: false, status: 'disabled' }, false);
    return false;
  }
}

function renderEpicStatus(status, ready = applicationReady) {
  epicStatus = status;
  const enabled = Boolean(status.enabled);
  const connected = status.status === 'connected';
  $('epic-summary').textContent = enabled
    ? `Mode: ${status.mode}. Status: ${status.status}${status.lastSyncAt ? `. Last sync: ${formatDate(status.lastSyncAt)}` : ''}.`
    : 'Epic integration is disabled for this local deployment. Set EPIC_ENABLED=true and use EPIC_MODE=mock for local MVP review.';
  $('epic-connect').disabled = !ready || !enabled || connected;
  $('epic-preview').disabled = !ready || !enabled || !connected;
  $('epic-apply').disabled = !ready || !enabled || !connected || !epicPreview || epicSelectedDomains.size === 0;
}

async function selectDomain(key) {
  activeDomain = key;
  const config = domains[key];
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
  summary.textContent = `${epicPreview.changes.length} mapped FHIR resources are ready for owner review before pod write. Review each section and choose what to apply.`;
  list.append(summary);

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
      const display = document.createElement('span');
      display.textContent = change.display;
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

function renderEpicSelectionSummary() {
  const summary = $('epic-selection-summary');
  if (!summary || !epicPreview) return;
  const selectedChanges = epicPreview.changes.filter((change) => epicSelectedDomains.has(change.domain));
  summary.textContent = `${selectedChanges.length} selected candidate${selectedChanges.length === 1 ? '' : 's'} will be applied from ${epicSelectedDomains.size} owner-reviewed section${epicSelectedDomains.size === 1 ? '' : 's'}.`;
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
$('epic-preview').addEventListener('click', previewEpicImport);
$('epic-apply').addEventListener('click', applyEpicImport);
initializeNavigation();
checkStatus().then(() => selectDomain(activeDomain));
