const SNOMED_CT_SYSTEM = 'http://snomed.info/sct';
const SNOMED_CT_HELP = 'SNOMED CT is designated by NLM as a standard for electronic exchange of clinical health information. Pick a common code/name or enter another SNOMED CT concept manually.';

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

const snomedPreset = (label, prefix, options) => ({
  name: `${prefix}.snomedPreset`,
  label,
  type: 'coding-preset',
  prefix,
  system: SNOMED_CT_SYSTEM,
  options,
  wide: true,
  help: SNOMED_CT_HELP,
});

const coding = (label, prefix = 'code') => [
  { name: `${prefix}.system`, label: `${label} system`, required: true, placeholder: 'https://…', help: label === 'SNOMED CT' ? SNOMED_CT_HELP : '' },
  { name: `${prefix}.code`, label: `${label} code`, required: true, help: label === 'SNOMED CT' ? 'Use the numeric SNOMED CT concept identifier.' : '' },
  { name: `${prefix}.display`, label: `${label} name`, help: label === 'SNOMED CT' ? 'Use the human-readable SNOMED CT preferred name or synonym.' : '' },
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
    fields: [snomedPreset('SNOMED CT condition quick pick', 'code', snomedConditionPresets), ...coding('SNOMED CT'), { name: 'status', label: 'Status', type: 'select', options: ['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved'], required: true }, { name: 'severity', label: 'Severity', type: 'select', options: ['', 'mild', 'moderate', 'severe'] }, { name: 'onsetDate', label: 'Onset date', type: 'date' }, { name: 'abatementDate', label: 'Resolved date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.code?.display || x.code?.code || 'Condition',
    detail: (x) => [x.status, x.severity, x.onsetDate].filter(Boolean).join(' · '),
  },
  medications: {
    label: 'Medication', plural: 'Medications', icon: '✣',
    description: 'Current and historical medicines, doses, and prescribers.',
    fields: [...coding('RxNorm', 'medicationCode'), { name: 'status', label: 'Status', type: 'select', options: ['active', 'completed', 'stopped', 'on-hold'], required: true }, { name: 'dosage.text', label: 'Dosage instructions' }, { name: 'startDate', label: 'Start date', type: 'date' }, { name: 'endDate', label: 'End date', type: 'date' }, { name: 'prescriber', label: 'Prescriber' }, { name: 'reason', label: 'Reason' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.medicationCode?.display || x.medicationCode?.code || 'Medication',
    detail: (x) => [x.status, x.dosage?.text, x.startDate].filter(Boolean).join(' · '),
  },
  allergies: {
    label: 'Allergy', plural: 'Allergies', icon: '△',
    description: 'Allergies and intolerances that matter to your care.',
    fields: [snomedPreset('SNOMED CT allergy quick pick', 'substance', snomedAllergyPresets), ...coding('SNOMED CT', 'substance'), { name: 'category', label: 'Category', type: 'select', options: ['food', 'medication', 'environment', 'biologic'], required: true }, { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'resolved'], required: true }, { name: 'onsetDate', label: 'Onset date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
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
    fields: [{ name: 'code', label: 'Measurement', type: 'select', options: ['body-weight', 'body-height', 'bmi', 'heart-rate', 'respiratory-rate', 'body-temperature', 'oxygen-saturation', 'blood-glucose'], required: true }, { name: 'value', label: 'Value', type: 'number', required: true }, { name: 'unit', label: 'Unit', required: true }, { name: 'effectiveDateTime', label: 'Measured at', type: 'datetime-local', required: true }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
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
    fields: [...coding('LOINC'), { name: 'value', label: 'Result', required: true }, { name: 'unit', label: 'Unit' }, { name: 'interpretation', label: 'Interpretation', type: 'select', options: ['', 'normal', 'high', 'low', 'critical-high', 'critical-low', 'abnormal'] }, { name: 'effectiveDateTime', label: 'Observed at', type: 'datetime-local', required: true }, { name: 'performer', label: 'Performer' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
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
    return ready;
  } catch {
    applicationReady = false;
    $('connection').className = 'connection offline';
    $('connection').innerHTML = '<span></span>Application offline';
    $('pod-state').textContent = 'Unavailable';
    $('add-button').disabled = true;
    return false;
  }
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
  if (field.type === 'coding-preset') {
    input = createCodingPreset(field, record);
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
  }
  input.id = `field-${field.name}`;
  input.name = field.name;
  input.required = Boolean(field.required);
  input.placeholder = field.placeholder || '';
  const current = getPath(record || {}, field.name);
  if (field.type !== 'coding-preset') {
    input.value = field.list && Array.isArray(current) ? current.join(', ') : normalizeInputValue(current, field.type);
  }
  wrapper.append(label, input);
  if (field.help) {
    const help = document.createElement('small');
    help.className = 'field-help';
    help.textContent = field.help;
    wrapper.append(help);
  }
  return wrapper;
}

function createCodingPreset(field, record) {
  const input = document.createElement('select');
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = 'Choose a common SNOMED CT concept…';
  input.append(empty);
  for (const option of field.options) {
    const element = document.createElement('option');
    element.value = option.code;
    element.textContent = `${option.code} — ${option.display}`;
    element.dataset.system = field.system;
    element.dataset.display = option.display;
    input.append(element);
  }
  const currentCode = getPath(record || {}, `${field.prefix}.code`);
  if (currentCode && field.options.some((option) => option.code === currentCode)) input.value = currentCode;
  input.addEventListener('change', () => applyCodingPreset(field, input));
  return input;
}

function applyCodingPreset(field, input) {
  const selected = input.selectedOptions[0];
  if (!selected || !selected.value) return;
  setInputValue(`${field.prefix}.system`, selected.dataset.system || field.system);
  setInputValue(`${field.prefix}.code`, selected.value);
  setInputValue(`${field.prefix}.display`, selected.dataset.display || selected.textContent);
}

function setInputValue(name, value) {
  const input = document.getElementById(`field-${name}`);
  if (input) input.value = value;
}

async function saveRecord(event) {
  event.preventDefault();
  const entity = editing ? structuredClone(editing) : {};
  for (const field of domains[activeDomain].fields) {
    if (field.type === 'coding-preset') continue;
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
initializeNavigation();
checkStatus().then(() => selectDomain(activeDomain));
