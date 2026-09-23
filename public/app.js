const SNOMED_CT_SYSTEM = 'http://snomed.info/sct';
const LOINC_SYSTEM = 'http://loinc.org';
const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm';
const RXTERMS_SYSTEM = 'https://www.nlm.nih.gov/research/umls/rxnorm/rxterms';
const MEDRT_SYSTEM = 'https://www.nlm.nih.gov/research/umls/sourcereleasedocs/current/MED-RT';
const CVX_SYSTEM = 'http://hl7.org/fhir/sid/cvx';
const ADMINISTRATIVE_GENDER_SYSTEM = 'http://hl7.org/fhir/administrative-gender';

const TERMINOLOGY_HELP = {
  'SNOMED CT': 'SNOMED CT is designated by NLM as a standard for electronic exchange of clinical health information. Pick a common code/name or enter another SNOMED CT concept manually.',
  LOINC: 'LOINC provides common identifiers, names, and codes for health measurements, observations, labs, and documents. Required FHIR Coding parameters are system and code; display/name is recommended.',
  RxNorm: 'RxNorm provides normalized clinical drug names and links across drug vocabularies. Required FHIR Coding parameters are system and code; display/name is recommended.',
  RxTerms: 'RxTerms is an NLM drug interface terminology derived from RxNorm for easier medication name selection.',
  'MED-RT': 'MED-RT provides medication reference terminology such as therapeutic class and mechanism concepts. Use when a class-level medication concept is more appropriate than a product code.',
  CVX: 'CVX identifies vaccines for HL7/FHIR immunization exchange. Required FHIR Coding parameters are system and code; display/name is recommended.',
  AdministrativeGender: 'HL7 FHIR AdministrativeGender codes represent administrative sex/gender values used by Patient-style records.',
};

const REQUIRED_CODING_HELP = 'Required FHIR Coding parameters: terminology system URI and code. Display/name is stored when supplied for review and interoperability.';

const TERMINOLOGY_SYSTEMS = {
  'SNOMED CT': { source: 'SNOMED CT', system: SNOMED_CT_SYSTEM },
  LOINC: { source: 'LOINC', system: LOINC_SYSTEM },
  RxNorm: { source: 'RxNorm', system: RXNORM_SYSTEM },
  RxTerms: { source: 'RxTerms', system: RXTERMS_SYSTEM },
  'MED-RT': { source: 'MED-RT', system: MEDRT_SYSTEM },
  CVX: { source: 'CVX', system: CVX_SYSTEM },
  AdministrativeGender: { source: 'AdministrativeGender', system: ADMINISTRATIVE_GENDER_SYSTEM },
};

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

const sortTerms = (options) => [...options].sort((a, b) => a.display.localeCompare(b.display) || a.code.localeCompare(b.code));

const snomedConditionOptions = [
  { value: '', display: 'Choose SNOMED CT condition…', source: 'SNOMED CT', system: SNOMED_CT_SYSTEM },
  ...sortTerms(snomedConditionPresets).map((option) => ({
    value: option.code,
    code: option.code,
    display: option.display,
    source: 'SNOMED CT',
    system: SNOMED_CT_SYSTEM,
    apply: {
      'code.system': SNOMED_CT_SYSTEM,
      'code.code': option.code,
      'code.display': option.display,
    },
  })),
];

const snomedAllergyOptions = [
  { value: '', display: 'Choose SNOMED CT allergy/substance…', source: 'SNOMED CT', system: SNOMED_CT_SYSTEM },
  ...sortTerms(snomedAllergyPresets).map((option) => ({
    value: option.code,
    code: option.code,
    display: option.display,
    source: 'SNOMED CT',
    system: SNOMED_CT_SYSTEM,
    apply: {
      'substance.system': SNOMED_CT_SYSTEM,
      'substance.code': option.code,
      'substance.display': option.display,
    },
  })),
];

const vitalMeasurementOptions = [
  { value: '', display: 'Choose LOINC vital sign…', source: 'LOINC', system: LOINC_SYSTEM },
  ...sortTerms(loincVitalPresets).map((option) => ({
    value: option.domainCode,
    code: option.code,
    display: option.display,
    source: 'LOINC',
    system: LOINC_SYSTEM,
    apply: {
      'loincCode.system': LOINC_SYSTEM,
      'loincCode.code': option.code,
      'loincCode.display': option.display,
      unit: option.unit,
    },
  })),
];

const loincLabPresets = [
  { code: '1742-6', display: 'Alanine aminotransferase enzyme activity/volume in Serum or Plasma', unit: 'U/L' },
  { code: '1920-8', display: 'Aspartate aminotransferase enzyme activity/volume in Serum or Plasma', unit: 'U/L' },
  { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood', unit: '%' },
  { code: '718-7', display: 'Hemoglobin mass/volume in Blood', unit: 'g/dL' },
  { code: '6690-2', display: 'Leukocytes number/volume in Blood', unit: '10*3/uL' },
  { code: '777-3', display: 'Platelets number/volume in Blood', unit: '10*3/uL' },
  { code: '2951-2', display: 'Sodium moles/volume in Serum or Plasma', unit: 'mmol/L' },
  { code: '2823-3', display: 'Potassium moles/volume in Serum or Plasma', unit: 'mmol/L' },
  { code: '2160-0', display: 'Creatinine mass/volume in Serum or Plasma', unit: 'mg/dL' },
  { code: '2345-7', display: 'Glucose mass/volume in Serum or Plasma', unit: 'mg/dL' },
  { code: '2093-3', display: 'Cholesterol mass/volume in Serum or Plasma', unit: 'mg/dL' },
  { code: '2085-9', display: 'Cholesterol in HDL mass/volume in Serum or Plasma', unit: 'mg/dL' },
  { code: '2089-1', display: 'Cholesterol in LDL mass/volume in Serum or Plasma', unit: 'mg/dL' },
  { code: '2571-8', display: 'Triglyceride mass/volume in Serum or Plasma', unit: 'mg/dL' },
];

const loincLabResultOptions = [
  { value: '', display: 'Choose LOINC lab result…', source: 'LOINC', system: LOINC_SYSTEM },
  ...sortTerms(loincLabPresets).map((option) => ({
    value: option.code,
    code: option.code,
    display: option.display,
    source: 'LOINC',
    system: LOINC_SYSTEM,
    apply: {
      'code.system': LOINC_SYSTEM,
      'code.code': option.code,
      'code.display': option.display,
      unit: option.unit,
    },
  })),
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

const snomedWorkflowOptions = [
  { value: '', display: 'Choose SNOMED CT workflow task…', source: 'SNOMED CT', system: SNOMED_CT_SYSTEM },
  ...sortTerms(snomedWorkflowPresets).map((option) => ({
    value: option.code,
    code: option.code,
    display: option.display,
    source: 'SNOMED CT',
    system: SNOMED_CT_SYSTEM,
    apply: {
      'taskType.system': SNOMED_CT_SYSTEM,
      'taskType.code': option.code,
      'taskType.display': option.display,
    },
  })),
];

const cvxVaccinePresets = [
  { code: '158', display: 'Influenza, injectable, quadrivalent' },
  { code: '140', display: 'Influenza, seasonal, injectable, preservative free' },
  { code: '207', display: 'COVID-19, mRNA, LNP-S, PF, 100 mcg or 50 mcg dose' },
  { code: '208', display: 'COVID-19, mRNA, LNP-S, PF, 30 mcg dose' },
  { code: '115', display: 'Tdap' },
  { code: '133', display: 'Pneumococcal conjugate PCV 13' },
  { code: '121', display: 'Zoster vaccine, live' },
  { code: '03', display: 'Measles, mumps and rubella virus vaccine' },
  { code: '10', display: 'Poliovirus vaccine, inactivated' },
  { code: '21', display: 'Varicella virus vaccine' },
];

const cvxVaccineOptions = [
  { value: '', display: 'Choose CVX vaccine…', source: 'CVX', system: CVX_SYSTEM },
  ...sortTerms(cvxVaccinePresets).map((option) => ({
    value: option.code,
    code: option.code,
    display: option.display,
    source: 'CVX',
    system: CVX_SYSTEM,
    apply: {
      'vaccineCode.system': CVX_SYSTEM,
      'vaccineCode.code': option.code,
      'vaccineCode.display': option.display,
    },
  })),
];

const administrativeGenderOptions = [
  { value: 'female', code: 'female', display: 'Female', source: 'AdministrativeGender', system: ADMINISTRATIVE_GENDER_SYSTEM },
  { value: 'male', code: 'male', display: 'Male', source: 'AdministrativeGender', system: ADMINISTRATIVE_GENDER_SYSTEM },
  { value: 'other', code: 'other', display: 'Other', source: 'AdministrativeGender', system: ADMINISTRATIVE_GENDER_SYSTEM },
  { value: 'unknown', code: 'unknown', display: 'Unknown', source: 'AdministrativeGender', system: ADMINISTRATIVE_GENDER_SYSTEM },
];

const rxnormMedicationPresets = [
  { code: '861007', display: 'Metformin hydrochloride 500 MG Oral Tablet' },
  { code: '860975', display: '24 HR metformin hydrochloride 500 MG Extended Release Oral Tablet' },
  { code: '617310', display: 'Atorvastatin 20 MG Oral Tablet' },
  { code: '314076', display: 'Lisinopril 10 MG Oral Tablet' },
  { code: '197361', display: 'Amlodipine 5 MG Oral Tablet' },
  { code: '313782', display: 'Acetaminophen 325 MG Oral Tablet' },
];

const rxnormMedicationOptions = [
  { value: '', display: 'Choose RxNorm medication…', source: 'RxNorm', system: RXNORM_SYSTEM },
  ...rxnormMedicationPresets.map((option) => ({
    value: option.code,
    code: option.code,
    display: option.display,
    source: 'RxNorm',
    system: RXNORM_SYSTEM,
    apply: {
      'medicationCode.system': RXNORM_SYSTEM,
      'medicationCode.code': option.code,
      'medicationCode.display': option.display,
    },
  })),
];

const withSystem = (system, source, options) => options.map((option) => ({ ...option, system, source }));
const codingSystemForLabel = (label) => Object.values(TERMINOLOGY_SYSTEMS).find(({ source }) => label.includes(source));

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
  { name: `${prefix}.system`, label: `${label} system`, required: options.required !== false, placeholder: options.placeholder || codingSystemForLabel(label)?.system || 'https://…', help: codingHelp(label, 'system'), system: codingSystemForLabel(label)?.system, source: codingSystemForLabel(label)?.source },
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
      { name: 'biologicalSex', label: 'Biological sex', type: 'select', options: administrativeGenderOptions, source: 'AdministrativeGender', system: ADMINISTRATIVE_GENDER_SYSTEM, required: true, help: TERMINOLOGY_HELP.AdministrativeGender },
      { name: 'photo', label: 'Photo URL' },
    ],
    title: (x) => [...(x.name?.given || []), x.name?.family].filter(Boolean).join(' ') || 'Profile',
    detail: (x) => [x.birthDate, x.biologicalSex].filter(Boolean).join(' · '),
  },
  conditions: {
    label: 'Condition', plural: 'Conditions', icon: '◇',
    description: 'Diagnoses, ongoing conditions, and resolved health concerns.',
    fields: [{ name: 'code.snomedChoice', label: 'SNOMED CT condition', type: 'select', options: snomedConditionOptions, source: 'SNOMED CT', system: SNOMED_CT_SYSTEM, valueFrom: 'code.code', transient: true, required: true, help: 'Choose a SNOMED CT clinical finding or disorder concept. Selection pre-fills the FHIR Coding fields saved to your pod.' }, terminologySearch('SNOMED CT condition search', 'code', 'SNOMED CT', withSystem(SNOMED_CT_SYSTEM, 'SNOMED CT', snomedConditionPresets)), ...coding('SNOMED CT'), { name: 'status', label: 'Status', type: 'select', options: ['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved'], required: true }, { name: 'severity', label: 'Severity', type: 'select', options: ['', 'mild', 'moderate', 'severe'] }, { name: 'onsetDate', label: 'Onset date', type: 'date' }, { name: 'abatementDate', label: 'Resolved date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.code?.display || x.code?.code || 'Condition',
    detail: (x) => [x.status, x.severity, x.onsetDate].filter(Boolean).join(' · '),
  },
  medications: {
    label: 'Medication', plural: 'Medications', icon: '✣',
    description: 'Current and historical medicines, doses, and prescribers.',
    fields: [{ name: 'medicationCode.rxnormChoice', label: 'RxNorm medication', type: 'select', options: rxnormMedicationOptions, source: 'RxNorm', system: RXNORM_SYSTEM, valueFrom: 'medicationCode.code', transient: true, required: true, help: 'Choose an RxNorm normalized medication name. Selection pre-fills the FHIR Coding fields saved to your pod.' }, terminologySearch('RxNorm medication search', 'medicationCode', 'RxNorm', withSystem(RXNORM_SYSTEM, 'RxNorm', rxnormMedicationPresets)), ...coding('RxNorm', 'medicationCode'), { name: 'status', label: 'Status', type: 'select', options: ['active', 'completed', 'stopped', 'on-hold'], required: true }, { name: 'dosage.text', label: 'Dosage instructions' }, { name: 'startDate', label: 'Start date', type: 'date' }, { name: 'endDate', label: 'End date', type: 'date' }, { name: 'prescriber', label: 'Prescriber' }, { name: 'reason', label: 'Reason' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.medicationCode?.display || x.medicationCode?.code || 'Medication',
    detail: (x) => [x.status, x.dosage?.text, x.startDate].filter(Boolean).join(' · '),
  },
  allergies: {
    label: 'Allergy', plural: 'Allergies', icon: '△',
    description: 'Allergies and intolerances that matter to your care.',
    fields: [{ name: 'substance.snomedChoice', label: 'SNOMED CT allergy/substance', type: 'select', options: snomedAllergyOptions, source: 'SNOMED CT', system: SNOMED_CT_SYSTEM, valueFrom: 'substance.code', transient: true, required: true, help: 'Choose a SNOMED CT allergy or substance concept. Selection pre-fills the FHIR Coding fields saved to your pod.' }, terminologySearch('SNOMED CT allergy/substance search', 'substance', 'SNOMED CT', withSystem(SNOMED_CT_SYSTEM, 'SNOMED CT', snomedAllergyPresets)), ...coding('SNOMED CT', 'substance'), { name: 'category', label: 'Category', type: 'select', options: ['food', 'medication', 'environment', 'biologic'], required: true }, { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'resolved'], required: true }, { name: 'onsetDate', label: 'Onset date', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.substance?.display || x.substance?.code || 'Allergy',
    detail: (x) => [x.category, x.status, x.onsetDate].filter(Boolean).join(' · '),
  },
  immunizations: {
    label: 'Immunization', plural: 'Immunizations', icon: '✦',
    description: 'Vaccinations, dose history, and administration details.',
    fields: [{ name: 'vaccineCode.cvxChoice', label: 'CVX vaccine', type: 'select', options: cvxVaccineOptions, source: 'CVX', system: CVX_SYSTEM, valueFrom: 'vaccineCode.code', transient: true, required: true, help: 'Choose an approved CVX vaccine administered code. Selection pre-fills the FHIR Coding display/name fields saved to your pod.' }, terminologySearch('CVX vaccine search', 'vaccineCode', 'CVX', withSystem(CVX_SYSTEM, 'CVX', cvxVaccinePresets)), ...coding('CVX', 'vaccineCode'), { name: 'status', label: 'Status', type: 'select', options: ['completed', 'not-done', 'entered-in-error'], required: true }, { name: 'occurrenceDate', label: 'Date', type: 'date', required: true }, { name: 'doseNumber', label: 'Dose number', type: 'number' }, { name: 'lotNumber', label: 'Lot number' }, { name: 'performer', label: 'Performer' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
    title: (x) => x.vaccineCode?.display || x.vaccineCode?.code || 'Immunization',
    detail: (x) => [x.status, x.occurrenceDate, x.doseNumber ? `Dose ${x.doseNumber}` : ''].filter(Boolean).join(' · '),
  },
  'vital-signs': {
    label: 'Vital sign', plural: 'Vital signs', icon: '⌁',
    description: 'Measurements and observations that track your health over time.',
    fields: [{ name: 'code', label: 'LOINC vital sign', type: 'select', options: vitalMeasurementOptions, source: 'LOINC', system: LOINC_SYSTEM, required: true, help: 'Choose an approved LOINC vital-sign measurement. Selection pre-fills the FHIR Coding fields and suggested UCUM-style unit saved to your pod.' }, terminologySearch('LOINC vital sign search', 'loincCode', 'LOINC', withSystem(LOINC_SYSTEM, 'LOINC', loincVitalPresets), { apply: { code: 'domainCode', unit: 'unit' } }), ...coding('LOINC', 'loincCode', { required: false }), { name: 'value', label: 'Value', type: 'number', required: true }, { name: 'unit', label: 'Unit', required: true }, { name: 'effectiveDateTime', label: 'Measured at', type: 'datetime-local', required: true }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
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
    fields: [{ name: 'code.loincChoice', label: 'LOINC lab result', type: 'select', options: loincLabResultOptions, source: 'LOINC', system: LOINC_SYSTEM, valueFrom: 'code.code', transient: true, required: true, help: 'Choose an approved LOINC laboratory observation. Selection pre-fills the FHIR Coding fields and suggested UCUM-style unit saved to your pod.' }, terminologySearch('LOINC lab result search', 'code', 'LOINC', withSystem(LOINC_SYSTEM, 'LOINC', loincLabPresets)), ...coding('LOINC'), { name: 'value', label: 'Result', required: true }, { name: 'unit', label: 'Unit' }, { name: 'interpretation', label: 'Interpretation', type: 'select', options: ['', 'normal', 'high', 'low', 'critical-high', 'critical-low', 'abnormal'] }, { name: 'effectiveDateTime', label: 'Observed at', type: 'datetime-local', required: true }, { name: 'performer', label: 'Performer' }, { name: 'notes', label: 'Notes', type: 'textarea', wide: true }],
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
      { name: 'taskType.snomedChoice', label: 'SNOMED CT workflow task', type: 'select', options: snomedWorkflowOptions, source: 'SNOMED CT', system: SNOMED_CT_SYSTEM, valueFrom: 'taskType.code', transient: true, required: true, help: 'Choose a SNOMED CT procedure or activity concept for this owner-tracked workflow task. Selection pre-fills the FHIR Coding fields saved to your pod.' },
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

// Figma's owner-facing wellness model groups the existing clinical APIs into
// nine understandable pillars. Multiple pillars may draw from the same
// authoritative domain; navigation always resolves back to that real domain.
const WELLNESS_PILLARS = [
  { id: 'physical', label: 'Physical', domain: 'vital-signs' },
  { id: 'purpose', label: 'Purpose', domain: 'workflow-tasks' },
  { id: 'nutrition', label: 'Nutrition', domain: 'lab-results' },
  { id: 'environment', label: 'Environment', domain: 'allergies' },
  { id: 'sleep', label: 'Sleep', domain: 'vital-signs' },
  { id: 'social', label: 'Social', domain: 'providers' },
  { id: 'preventive', label: 'Preventive', domain: 'immunizations' },
  { id: 'emotional', label: 'Emotional', domain: 'conditions' },
  { id: 'medications', label: 'Medications', domain: 'medications' },
];

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

const DOMAIN_SEMANTIC_ELEMENTS = {
  profiles: [
    { id: 'identity', label: 'Identity', summary: 'Owner name and demographic basics.', prefill: {} },
    { id: 'birth-date', label: 'Birth date', summary: 'Date of birth used for owner-held health context.', prefill: {} },
    { id: 'biological-sex', label: 'Biological sex', summary: 'Administrative clinical sex value.', prefill: { biologicalSex: 'unknown' } },
    { id: 'photo', label: 'Photo', summary: 'Optional owner-selected profile image URL.', prefill: {} },
  ],
  conditions: [
    { id: 'active-condition', label: 'Active condition', summary: 'SNOMED CT-coded active diagnosis or concern.', prefill: { ...codingPrefill('code', SNOMED_CT_SYSTEM, '38341003', 'Hypertensive disorder'), status: 'active' }, match: (record) => record.status === 'active' },
    { id: 'severity', label: 'Severity', summary: 'Mild, moderate, or severe clinical impact.', prefill: { ...codingPrefill('code', SNOMED_CT_SYSTEM, '386661006', 'Fever'), status: 'active', severity: 'mild' }, match: (record) => Boolean(record.severity) },
    { id: 'onset', label: 'Onset', summary: 'When a condition began or was recognized.', prefill: { ...codingPrefill('code', SNOMED_CT_SYSTEM, '73211009', 'Diabetes mellitus'), status: 'active' }, match: (record) => Boolean(record.onsetDate) },
    { id: 'resolved', label: 'Resolved', summary: 'Conditions that are inactive, resolved, or in remission.', prefill: { ...codingPrefill('code', SNOMED_CT_SYSTEM, '195967001', 'Asthma'), status: 'resolved' }, match: (record) => ['inactive', 'remission', 'resolved'].includes(record.status) },
  ],
  medications: [
    { id: 'active-medication', label: 'Active medication', summary: 'RxNorm-coded medicine currently taken.', prefill: { ...codingPrefill('medicationCode', RXNORM_SYSTEM, '860975', 'Metformin 500 MG Oral Tablet'), status: 'active' }, match: (record) => record.status === 'active' },
    { id: 'dosage', label: 'Dosage', summary: 'Dose, route, and timing instructions.', prefill: { ...codingPrefill('medicationCode', RXNORM_SYSTEM, '617314', 'Atorvastatin 20 MG Oral Tablet'), status: 'active', dosage: { text: 'Take as directed' } }, match: (record) => Boolean(record.dosage?.text) },
    { id: 'prescriber', label: 'Prescriber', summary: 'Clinician or source associated with the medication.', prefill: { ...codingPrefill('medicationCode', RXNORM_SYSTEM, '197361', 'Lisinopril 10 MG Oral Tablet'), status: 'active' }, match: (record) => Boolean(record.prescriber) },
    { id: 'history', label: 'Medication history', summary: 'Stopped, completed, or historical medications.', prefill: { ...codingPrefill('medicationCode', RXNORM_SYSTEM, '198440', 'Acetaminophen 325 MG Oral Tablet'), status: 'completed' }, match: (record) => ['completed', 'stopped', 'on-hold'].includes(record.status) },
  ],
  allergies: [
    { id: 'substance', label: 'Substance', summary: 'SNOMED CT-coded allergen or intolerance.', prefill: { ...codingPrefill('substance', SNOMED_CT_SYSTEM, '91936005', 'Allergy to penicillin'), category: 'medication', status: 'active' }, match: (record) => Boolean(record.substance?.code) },
    { id: 'food', label: 'Food', summary: 'Food allergy or intolerance.', prefill: { ...codingPrefill('substance', SNOMED_CT_SYSTEM, '91935009', 'Allergy to peanuts'), category: 'food', status: 'active' }, match: (record) => record.category === 'food' },
    { id: 'medication', label: 'Medication', summary: 'Medication allergy or adverse sensitivity.', prefill: { ...codingPrefill('substance', SNOMED_CT_SYSTEM, '294954006', 'Aspirin allergy'), category: 'medication', status: 'active' }, match: (record) => record.category === 'medication' },
    { id: 'environment', label: 'Environment', summary: 'Environmental allergy or sensitivity.', prefill: { ...codingPrefill('substance', SNOMED_CT_SYSTEM, '300916003', 'Latex allergy'), category: 'environment', status: 'active' }, match: (record) => record.category === 'environment' },
  ],
  immunizations: [
    { id: 'vaccine', label: 'Vaccine', summary: 'CVX-coded vaccine record.', prefill: { ...codingPrefill('vaccineCode', CVX_SYSTEM, '141', 'Influenza, seasonal, injectable'), status: 'completed' }, match: (record) => Boolean(record.vaccineCode?.code) },
    { id: 'date', label: 'Administration date', summary: 'When the vaccine was given.', prefill: { ...codingPrefill('vaccineCode', CVX_SYSTEM, '207', 'COVID-19, mRNA, LNP-S, PF, 100 mcg/0.5 mL dose'), status: 'completed' }, match: (record) => Boolean(record.occurrenceDate) },
    { id: 'dose', label: 'Dose series', summary: 'Dose number within a vaccine series.', prefill: { ...codingPrefill('vaccineCode', CVX_SYSTEM, '208', 'COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3 mL dose'), status: 'completed', doseNumber: 1 }, match: (record) => Boolean(record.doseNumber) },
    { id: 'performer', label: 'Performer', summary: 'Clinic, pharmacy, or clinician administering the vaccine.', prefill: { ...codingPrefill('vaccineCode', CVX_SYSTEM, '140', 'Influenza, seasonal, injectable, preservative free'), status: 'completed' }, match: (record) => Boolean(record.performer) },
  ],
  'vital-signs': [
    { id: 'blood-pressure', label: 'Blood pressure', summary: 'LOINC blood pressure panel.', prefill: vitalPrefill('blood-pressure', '85354-9', 'Blood pressure panel with all children optional', 'mmHg'), match: (record) => record.code === 'blood-pressure' },
    { id: 'heart-rate', label: 'Heart rate', summary: 'LOINC heart rate observation.', prefill: vitalPrefill('heart-rate', '8867-4', 'Heart rate', 'beats/min'), match: (record) => record.code === 'heart-rate' },
    { id: 'body-temperature', label: 'Temperature', summary: 'LOINC body temperature observation.', prefill: vitalPrefill('body-temperature', '8310-5', 'Body temperature', 'Cel'), match: (record) => record.code === 'body-temperature' },
    { id: 'oxygen-saturation', label: 'Oxygen saturation', summary: 'LOINC pulse oximetry oxygen saturation.', prefill: vitalPrefill('oxygen-saturation', '59408-5', 'Oxygen saturation in arterial blood by pulse oximetry', '%'), match: (record) => record.code === 'oxygen-saturation' },
    { id: 'body-weight', label: 'Body weight', summary: 'LOINC body weight measurement.', prefill: vitalPrefill('body-weight', '29463-7', 'Body weight', 'kg'), match: (record) => record.code === 'body-weight' },
    { id: 'bmi', label: 'BMI', summary: 'LOINC body mass index measurement.', prefill: vitalPrefill('bmi', '39156-5', 'Body mass index (BMI)', 'kg/m2'), match: (record) => record.code === 'bmi' },
  ],
  providers: [
    { id: 'primary-care', label: 'Primary care', summary: 'Primary care clinician or practice.', prefill: { role: 'primary-care' }, match: (record) => record.role === 'primary-care' },
    { id: 'specialist', label: 'Specialist', summary: 'Specialty care clinician.', prefill: { role: 'specialist' }, match: (record) => record.role === 'specialist' },
    { id: 'pharmacy', label: 'Pharmacy', summary: 'Preferred or historical pharmacy.', prefill: { role: 'pharmacy' }, match: (record) => record.role === 'pharmacy' },
    { id: 'lab', label: 'Laboratory', summary: 'Laboratory or diagnostic service provider.', prefill: { role: 'lab' }, match: (record) => record.role === 'lab' },
  ],
  'lab-results': [
    { id: 'glucose', label: 'Glucose', summary: 'LOINC-coded glucose laboratory result.', prefill: { ...codingPrefill('code', LOINC_SYSTEM, '2339-0', 'Glucose mass/volume in blood'), unit: 'mg/dL' }, match: (record) => record.code?.code === '2339-0' },
    { id: 'hemoglobin-a1c', label: 'Hemoglobin A1c', summary: 'LOINC-coded A1c result.', prefill: { ...codingPrefill('code', LOINC_SYSTEM, '4548-4', 'Hemoglobin A1c/Hemoglobin.total in Blood'), unit: '%' }, match: (record) => record.code?.code === '4548-4' },
    { id: 'lipids', label: 'Lipids', summary: 'Cholesterol and lipid panel observations.', prefill: { ...codingPrefill('code', LOINC_SYSTEM, '24331-1', 'Lipid panel'), unit: 'mg/dL' }, match: (record) => ['24331-1', '2093-3', '2085-9', '2089-1'].includes(record.code?.code) },
    { id: 'interpretation', label: 'Interpretation', summary: 'Normal, abnormal, high, low, or critical result interpretation.', prefill: { ...codingPrefill('code', LOINC_SYSTEM, '718-7', 'Hemoglobin [Mass/volume] in Blood'), interpretation: 'normal' }, match: (record) => Boolean(record.interpretation) },
  ],
  'insurance-policies': [
    { id: 'medical', label: 'Medical', summary: 'Medical coverage policy.', prefill: { type: 'medical' }, match: (record) => record.type === 'medical' },
    { id: 'pharmacy', label: 'Pharmacy', summary: 'Prescription benefit coverage.', prefill: { type: 'pharmacy' }, match: (record) => record.type === 'pharmacy' },
    { id: 'member-id', label: 'Member ID', summary: 'Owner-held member identifier for the plan.', prefill: { type: 'medical' }, match: (record) => Boolean(record.memberId) },
    { id: 'effective-dates', label: 'Effective dates', summary: 'Coverage start and expiration dates.', prefill: { type: 'medical' }, match: (record) => Boolean(record.effectiveDate || record.expirationDate) },
  ],
  documents: [
    { id: 'summary', label: 'Visit summary', summary: 'LOINC-coded clinical or visit summary metadata.', prefill: { ...codingPrefill('documentType', LOINC_SYSTEM, '34133-9', 'Summary of episode note'), status: 'current' }, match: (record) => record.documentType?.code === '34133-9' },
    { id: 'lab-report', label: 'Lab report', summary: 'Laboratory report document metadata.', prefill: { ...codingPrefill('documentType', LOINC_SYSTEM, '11502-2', 'Laboratory report'), status: 'current' }, match: (record) => record.documentType?.code === '11502-2' },
    { id: 'care-plan', label: 'Care plan', summary: 'Plan of care or care coordination document.', prefill: { ...codingPrefill('documentType', LOINC_SYSTEM, '18776-5', 'Plan of care note'), status: 'current' }, match: (record) => record.documentType?.code === '18776-5' },
    { id: 'source', label: 'Source', summary: 'Source system, custodian, or pod binary link.', prefill: { status: 'current' }, match: (record) => Boolean(record.sourceSystem || record.sourceDocumentUrl || record.binaryUrl || record.custodian) },
  ],
  'workflow-tasks': [
    { id: 'review', label: 'Review', summary: 'Owner-tracked review task.', prefill: { ...codingPrefill('taskType', SNOMED_CT_SYSTEM, '183452005', 'Review of medication'), status: 'requested', intent: 'plan' }, match: (record) => record.taskType?.code === '183452005' },
    { id: 'follow-up', label: 'Follow-up', summary: 'Care follow-up or next-step task.', prefill: { ...codingPrefill('taskType', SNOMED_CT_SYSTEM, '185389009', 'Follow-up visit'), status: 'requested', intent: 'plan' }, match: (record) => /follow/i.test(record.description || record.taskType?.display || '') },
    { id: 'due-date', label: 'Due date', summary: 'Task with a planned due date.', prefill: { ...codingPrefill('taskType', SNOMED_CT_SYSTEM, '225358003', 'Wound care'), status: 'requested', intent: 'plan' }, match: (record) => Boolean(record.dueDate) },
    { id: 'completed', label: 'Completed', summary: 'Finished owner-held workflow task.', prefill: { ...codingPrefill('taskType', SNOMED_CT_SYSTEM, '308335008', 'Patient encounter procedure'), status: 'completed', intent: 'plan' }, match: (record) => record.status === 'completed' },
  ],
};

const STATUS_COLORS = { green: '#2b9a73', yellow: '#d9a441', red: '#cf5240', empty: '#a9b6b1' };
const STATUS_LABELS = { green: 'On track', yellow: 'Watch', red: 'Attention', empty: 'No data' };

let activeView = 'wellness';
let wellnessSummary = null;
let podActivity = null;
let activeDomain = 'conditions';
let records = [];
let editing = null;
let applicationReady = false;
let epicStatus = { enabled: false, status: 'disabled' };
let epicDiagnostics = null;
let epicPreview = null;
let epicSelectedDomains = new Set();
let epicDocumentRecords = [];
let selectedEpicDocument = null;
let recordFormSnapshot = '';
let activeReconcileDomain = 'conditions';
const reconciliationDecisions = new Map();
const $ = (id) => document.getElementById(id);

const PRIMARY_TABS = ['wellness', 'records', 'reconcile', 'status', 'pod'];

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

  $('profile-avatar').addEventListener('click', () => showView('pod'));
  const podContent = $('pod-view-content');
  for (const id of ['setup-warning', 'summary', 'pod-management-panel']) {
    const node = id === 'summary' ? document.querySelector('#view-status .summary') : $(id);
    if (node) podContent.append(node);
  }
  document.querySelector('.pod-details')?.setAttribute('id', 'pod-permissions');
  document.querySelector('.pod-observability > div:nth-child(2)')?.setAttribute('id', 'pod-audit');
  document.querySelector('#pod-domain-list')?.parentElement?.setAttribute('id', 'pod-inventory');
  document.querySelectorAll('[data-pod-target]').forEach((button) => {
    button.addEventListener('click', () => {
      $(button.dataset.podTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/** Switches the single-page view. 'wellness' is the landing view. */
function showView(view) {
  activeView = view;
  if (view === 'wellness') closePillarDetail();
  const recordsLayout = view === 'records';
  document.querySelector('.shell')?.classList.toggle('records-layout', recordsLayout);
  document.querySelector('.shell')?.classList.toggle('full-layout', !recordsLayout);
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
  $('domain-nav').classList.toggle('hidden', !recordsLayout);
  document.querySelectorAll('.domain-nav button').forEach((button) => {
    button.classList.toggle('active', recordsLayout && button.dataset.domain === activeDomain);
  });
  if (view === 'wellness') void refreshWellness();
  if (view === 'reconcile') renderReconcileWorkspace();
}

function reconciliationStatus(change) {
  if (change.action === 'conflict') return 'conflict';
  if (change.action === 'create') return 'new';
  if (change.action === 'update') return 'updated';
  return 'matched';
}

function reconcileChanges() {
  return epicPreview?.changes || [];
}

function renderReconcileWorkspace() {
  const changes = reconcileChanges();
  const counts = { matched: 0, conflict: 0, new: 0, updated: 0 };
  changes.forEach((change) => { counts[reconciliationStatus(change)] += 1; });
  $('reconcile-exact-count').textContent = counts.matched;
  $('reconcile-conflict-count').textContent = counts.conflict;
  $('reconcile-new-count').textContent = counts.new;
  $('reconcile-updated-count').textContent = counts.updated;
  const epicConnected = epicStatus.enabled && epicStatus.status === 'connected';
  $('reconcile-epic-state').innerHTML = `<i class="dot ${epicConnected ? 'dot-green' : ''}"></i>${epicConnected ? 'Epic connected' : 'Epic not connected'}`;

  const list = $('reconcile-domain-list');
  list.replaceChildren();
  for (const [domain, config] of Object.entries(domains)) {
    const domainChanges = changes.filter((change) => change.domain === domain);
    const domainCounts = { matched: 0, conflict: 0, new: 0, updated: 0 };
    domainChanges.forEach((change) => { domainCounts[reconciliationStatus(change)] += 1; });
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `reconcile-domain ${domain === activeReconcileDomain ? 'active' : ''}`;
    button.innerHTML = `<span class="nav-icon">${config.icon}</span><span><strong>${config.plural}</strong><small>${domainChanges.length ? `${domainChanges.length} compared` : 'No incoming changes'}</small></span><span class="reconcile-domain-badges"></span>`;
    const badges = button.querySelector('.reconcile-domain-badges');
    for (const [status, value] of Object.entries(domainCounts)) {
      if (!value) continue;
      const badge = document.createElement('i');
      badge.className = `reconcile-status status-${status}`;
      badge.textContent = `${value} ${status}`;
      badges.append(badge);
    }
    button.addEventListener('click', () => { activeReconcileDomain = domain; renderReconcileWorkspace(); });
    list.append(button);
  }
  renderReconcileDetail(changes.filter((change) => change.domain === activeReconcileDomain));

  const selected = changes.filter((change) => ['create', 'update'].includes(change.action) && epicSelectedDomains.has(change.domain));
  const conflicts = changes.filter((change) => change.action === 'conflict').length;
  $('reconcile-progress').textContent = changes.length
    ? `${selected.length} safe change${selected.length === 1 ? '' : 's'} selected · ${conflicts} conflict${conflicts === 1 ? '' : 's'} excluded`
    : 'Run a connected-record scan to begin';
  $('reconcile-approve').disabled = selected.length === 0;
}

function renderReconcileDetail(changes) {
  const detail = $('reconcile-detail');
  detail.replaceChildren();
  const config = domains[activeReconcileDomain];
  const heading = document.createElement('header');
  heading.innerHTML = `<p class="eyebrow">Record source comparison</p><h2>${config?.plural || activeReconcileDomain}</h2><p>Solid Pod remains authoritative. Incoming records are not written until owner approval.</p>`;
  detail.append(heading);
  if (!changes.length) {
    const empty = document.createElement('div');
    empty.className = 'reconcile-empty';
    empty.innerHTML = '<strong>No incoming differences</strong><p>This domain has no connected-source changes in the current scan.</p>';
    detail.append(empty);
    return;
  }
  for (const [index, change] of changes.entries()) {
    const status = reconciliationStatus(change);
    const card = document.createElement('article');
    card.className = `reconcile-change status-${status}`;
    const decisionKey = `${change.domain}:${index}:${change.display}`;
    const decision = reconciliationDecisions.get(decisionKey);
    card.innerHTML = `<div class="reconcile-change-heading"><span class="reconcile-status status-${status}">${status}</span><strong></strong></div><p></p><div class="reconcile-comparison"><span><small>Current Pod state</small><b>${status === 'new' ? 'No matching record' : 'Owner-held record'}</b></span><span><small>Incoming source</small><b>${change.fhirResourceType || 'FHIR record'}</b></span></div>`;
    card.querySelector('strong').textContent = change.display || 'Clinical record';
    card.querySelector('p').textContent = change.reconciliation?.detail || (status === 'new' ? 'New connected-source record ready for review.' : 'No material difference detected.');
    if (status === 'conflict') {
      const actions = document.createElement('div');
      actions.className = 'reconcile-actions';
      for (const [value, label] of [['pod', 'Keep Pod'], ['incoming', 'Use incoming'], ['merge', 'Review fields']]) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = decision === value ? 'secondary active' : 'secondary'; button.textContent = label;
        button.addEventListener('click', () => {
          reconciliationDecisions.set(decisionKey, value);
          if (value === 'merge') { activeDomain = change.domain; showView('records'); void selectDomain(change.domain); }
          else renderReconcileWorkspace();
        });
        actions.append(button);
      }
      const note = document.createElement('small');
      note.textContent = decision ? 'Decision saved locally; apply remains blocked until the record is reconciled through the Pod editor.' : 'Choose a disposition. Conflict records are never auto-applied.';
      actions.append(note); card.append(actions);
    }
    detail.append(card);
  }
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
  const priorities = $('wellness-priorities');
  target.replaceChildren();
  priorities.replaceChildren();
  if (!summary || summary.error) {
    const message = document.createElement('p');
    message.className = 'wellness-loading';
    message.textContent = summary?.error
      || 'Your wellness overview appears once the pod connection is ready. Open Pod status for details.';
    target.append(message);
    const empty = document.createElement('p');
    empty.className = 'wellness-loading';
    empty.textContent = 'Priorities appear when the wellness summary is available.';
    priorities.append(empty);
    renderWellnessStatusSummary([]);
    renderWellnessRecentActivity(podActivity);
    renderUtilityMenu(null);
    return;
  }
  const pillars = mapWellnessPillars(summary);
  target.append(createSpiderGraph(pillars));
  renderWellnessStatusSummary(pillars);
  renderWellnessPriorities(pillars);
  renderWellnessRecentActivity(podActivity);
  renderUtilityMenu(summary.browse);
}

function mapWellnessPillars(summary) {
  const sources = new Map([...(summary.axes || []), ...(summary.browse || [])].map((entry) => [entry.domain, entry]));
  return WELLNESS_PILLARS.map((pillar) => {
    const source = sources.get(pillar.domain) || {};
    const hasRecords = Number(source.recordCount ?? source.count ?? 0) > 0;
    return {
      ...source,
      ...pillar,
      score: Number.isFinite(source.score) ? source.score : (hasRecords ? 70 : null),
      status: source.status || (hasRecords ? 'green' : 'empty'),
      summary: source.summary || `${source.count || 0} owner-held ${domains[pillar.domain]?.plural?.toLowerCase() || 'records'}`,
    };
  });
}

function renderWellnessStatusSummary(pillars) {
  const target = $('wellness-status-summary');
  target.replaceChildren();
  for (const [status, label] of [['green', 'On track'], ['yellow', 'Watch'], ['red', 'Attention']]) {
    const card = document.createElement('article');
    card.className = `wellness-summary-card wellness-summary-${status}`;
    const count = pillars.filter((pillar) => pillar.status === status).length;
    card.innerHTML = `<small>${label}</small><strong>${count}</strong><span>pillars</span>`;
    target.append(card);
  }
}

function renderWellnessPriorities(axes) {
  const target = $('wellness-priorities');
  const weight = { red: 0, yellow: 1, empty: 2, green: 3 };
  const selected = [...axes]
    .sort((a, b) => (weight[a.status] ?? 4) - (weight[b.status] ?? 4) || (a.score ?? -1) - (b.score ?? -1))
    .slice(0, 3);
  for (const axis of selected) {
    const card = document.createElement('article');
    card.className = `wellness-priority-card wellness-priority-${axis.status}`;
    const status = document.createElement('small');
    status.textContent = STATUS_LABELS[axis.status] || axis.status;
    const title = document.createElement('strong');
    title.textContent = axis.label;
    const detail = document.createElement('p');
    detail.textContent = axis.summary;
    const action = document.createElement('button');
    action.type = 'button';
    action.textContent = 'Review records →';
    action.addEventListener('click', () => openPillarDetail(axis));
    card.append(status, title, detail, action);
    target.append(card);
  }
}

function renderWellnessRecentActivity(activity) {
  const target = $('wellness-recent-activity');
  target.replaceChildren();
  const events = activity?.events?.slice(0, 4) || [];
  if (!events.length) {
    const empty = document.createElement('p');
    empty.className = 'wellness-loading';
    empty.textContent = activity?.error || 'Recent owner-approved updates will appear here.';
    target.append(empty);
    return;
  }
  for (const event of events) {
    const row = document.createElement('article');
    row.className = `wellness-activity-row wellness-activity-${event.status}`;
    row.innerHTML = `<i aria-hidden="true"></i><div><strong>${event.summary}</strong><small>${event.domain ? `${domains[event.domain]?.plural || event.domain} · ` : ''}${formatDate(event.at)}</small></div>`;
    target.append(row);
  }
}

async function openPillarDetail(pillar) {
  const detail = $('pillar-detail');
  const status = STATUS_LABELS[pillar.status] || pillar.status;
  const config = domains[pillar.domain];
  detail.replaceChildren();
  detail.innerHTML = `
    <nav class="pillar-breadcrumb" aria-label="Breadcrumb"><button class="pillar-back" type="button">Wellness</button><span aria-hidden="true">›</span><strong>${pillar.label}</strong></nav>
    <div class="pillar-detail-grid">
      <section class="pillar-metric-card och-panel">
        <header class="pillar-title-area">
          <div><div class="pillar-title-line"><h1>${pillar.label}</h1><span class="och-chip status-${pillar.status === 'green' ? 'on-track' : pillar.status === 'yellow' ? 'watch' : 'attention'}">● ${status}</span></div><p>${pillar.summary}</p></div>
          <div class="pillar-score-block"><small>PILLAR SCORE</small><strong>${pillar.score ?? '—'}${pillar.score == null ? '' : '%'}</strong></div>
        </header>
        <div class="pillar-radar-stage" aria-live="polite"><p class="wellness-loading">Reading linked records…</p></div>
        <div class="pillar-legend"><span class="och-chip status-on-track">● On track</span><span class="och-chip status-watch">● Watch</span><span class="och-chip status-attention">● Attention</span></div>
      </section>
      <section class="pillar-records-card och-panel">
        <header><div><h2>Records</h2><p>Linked entries from your secure Pod</p></div><button class="primary pillar-add" type="button">+ Add record</button></header>
        <div class="pillar-record-filters" aria-label="Record filters"></div>
        <div class="pillar-record-list" aria-live="polite"><p class="wellness-loading">Reading ${config?.plural?.toLowerCase() || 'records'}…</p></div>
        <footer><button class="pillar-review" type="button">Show all records →</button><span class="pillar-record-count"></span></footer>
      </section>
    </div>`;
  document.querySelector('.wellness-dashboard').classList.add('hidden');
  detail.classList.remove('hidden');
  detail.querySelector('.pillar-back').addEventListener('click', closePillarDetail);
  detail.querySelector('.pillar-review').addEventListener('click', () => selectDomain(pillar.domain));
  detail.querySelector('.pillar-add').addEventListener('click', async () => {
    await selectDomain(pillar.domain);
    openForm();
  });
  await renderPillarWorkspace(pillar, detail);
}

async function renderPillarWorkspace(pillar, detail) {
  const config = domains[pillar.domain];
  let linkedRecords = [];
  try {
    const response = await fetch(`/api/resources/${pillar.domain}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load linked records');
    linkedRecords = Array.isArray(payload.data) ? payload.data : [];
  } catch (error) {
    const list = detail.querySelector('.pillar-record-list');
    list.innerHTML = `<p class="wellness-loading">${error.message}</p>`;
  }

  const elements = (DOMAIN_SEMANTIC_ELEMENTS[pillar.domain] || semanticElementsFromFields(config)).slice(0, 5);
  const radar = detail.querySelector('.pillar-radar-stage');
  radar.replaceChildren(createDomainSpiderGraph(pillar.domain, elements, linkedRecords, false));

  const filters = detail.querySelector('.pillar-record-filters');
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'active';
  all.textContent = 'All';
  filters.append(all);
  for (const element of elements) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = element.label;
    button.addEventListener('click', () => renderPillarRecordRows(detail, pillar, linkedRecords, element));
    filters.append(button);
  }
  all.addEventListener('click', () => renderPillarRecordRows(detail, pillar, linkedRecords));
  renderPillarRecordRows(detail, pillar, linkedRecords);
}

function renderPillarRecordRows(detail, pillar, linkedRecords, semanticElement = null) {
  const config = domains[pillar.domain];
  const visible = semanticElement ? recordsForSemanticElement(semanticElement, linkedRecords) : [...linkedRecords].sort((a, b) => recordTimestamp(b) - recordTimestamp(a));
  detail.querySelectorAll('.pillar-record-filters button').forEach((button) => button.classList.toggle('active', button.textContent === (semanticElement?.label || 'All')));
  const list = detail.querySelector('.pillar-record-list');
  list.replaceChildren();
  for (const record of visible.slice(0, 7)) {
    const row = document.createElement('article');
    const timestamp = recordTimestamp(record);
    row.innerHTML = `<i aria-hidden="true"></i><time>${timestamp ? formatDate(new Date(timestamp).toISOString()) : 'Pod record'}</time><span>${semanticElement?.label || config.label}</span><strong>${config.title(record)}</strong><button type="button">Edit</button>`;
    row.querySelector('button').addEventListener('click', async () => {
      await selectDomain(pillar.domain);
      openForm(record);
    });
    list.append(row);
  }
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'wellness-loading';
    empty.textContent = 'No linked records yet. Add the first owner-held entry when you are ready.';
    list.append(empty);
  }
  detail.querySelector('.pillar-record-count').textContent = `Showing ${Math.min(visible.length, 7)} of ${visible.length} entries`;
}

function closePillarDetail() {
  $('pillar-detail').classList.add('hidden');
  document.querySelector('.wellness-dashboard').classList.remove('hidden');
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

  // Two different radii per axis, deliberately:
  //
  //  - the shaded area uses the *true* value, so a domain with no data (or a
  //    zero score) does not get drawn as though it scored something;
  //  - the marker uses a floor, because markers are the tap targets and at a
  //    small radius they collide. Adjacent points on an n-axis chart are
  //    2·r·sin(π/n) apart, so the floor is whatever radius keeps that gap
  //    wider than a marker. Previously the floor was a flat 0.04 — about 4.6px
  //    of separation for 14px markers — so every empty axis stacked at the
  //    centre and only the topmost could be tapped (issue #40).
  const markerRadius = 7;
  const minGap = markerRadius * 2 + 3;
  const minMarkerFraction = Math.min(0.5, minGap / (2 * Math.sin(Math.PI / axes.length) * radius));

  const valueFraction = (axis) => Math.max((axis.score ?? 0) / 100, 0);
  const markerFraction = (axis) => Math.max(valueFraction(axis), minMarkerFraction);

  const area = axes.map((axis, index) => point(index, valueFraction(axis)));
  const plotted = axes.map((axis, index) => point(index, markerFraction(axis)));
  svg.append(node('polygon', { points: area.map((pair) => pair.join(',')).join(' '), class: 'spider-area' }));

  axes.forEach((axis, index) => {
    const [ax, ay] = point(index, 1);
    const color = DOMAIN_COLORS[axis.domain] || '#176c5c';
    svg.append(node('line', { x1: center, y1: center, x2: ax, y2: ay, stroke: color, 'stroke-width': 2, 'stroke-opacity': .55 }));

    const [px, py] = plotted[index];
    const halo = node('circle', {
      cx: px, cy: py, r: 12,
      fill: 'none',
      stroke: color,
      'stroke-width': 1.8,
      'stroke-dasharray': '3 3',
      class: 'spider-point-halo',
      'aria-hidden': 'true',
    });
    svg.append(halo);
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
    marker.addEventListener('click', () => openPillarDetail(axis));
    marker.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPillarDetail(axis); }
    });
    svg.append(marker);

    // The label is the second tap target for the same axis, and a far larger
    // one than a 7px circle. It is positioned at the axis tip, so labels never
    // collide with each other the way centre-clustered markers do.
    const [lx, ly] = point(index, 1.2);
    const label = node('text', {
      x: lx, y: ly, fill: color, class: 'spider-label',
      'text-anchor': lx > center + 4 ? 'start' : lx < center - 4 ? 'end' : 'middle',
      'dominant-baseline': ly > center ? 'hanging' : ly < center ? 'auto' : 'middle',
      tabindex: '0', role: 'button', 'data-domain': axis.domain,
      'aria-label': `${axis.label}: ${STATUS_LABELS[axis.status]}. Open ${axis.label} records.`,
    });
    label.textContent = axis.label;
    label.addEventListener('click', () => openPillarDetail(axis));
    label.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPillarDetail(axis); }
    });
    svg.append(label);
  });

  return svg;
}

function initializeUtilityMenu() {
  renderUtilityMenu(null);
  $('utility-menu-toggle').addEventListener('click', () => {
    setUtilityMenuOpen(!$('utility-menu').classList.contains('open'));
  });
  document.addEventListener('click', (event) => {
    if (!$('utility-menu').contains(event.target)) setUtilityMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setUtilityMenuOpen(false);
  });
}

function setUtilityMenuOpen(open) {
  $('utility-menu').classList.toggle('open', open);
  $('utility-menu-toggle').setAttribute('aria-expanded', String(open));
}

/** Non-graph domains: secondary navigation lives in the top-right hamburger. */
function renderUtilityMenu(browse) {
  const nav = $('utility-domain-menu');
  nav.replaceChildren();
  const entries = browse || WELLNESS_BROWSE_DOMAINS.map((domain) => ({ domain, count: null }));
  for (const entry of entries) {
    const config = domains[entry.domain];
    if (!config) continue;
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'utility-domain-item';
    tile.setAttribute('role', 'menuitem');
    tile.style.setProperty('--tile-color', DOMAIN_COLORS[entry.domain] || '#176c5c');
    tile.setAttribute('aria-label', `Browse ${config.plural}${Number.isInteger(entry.count) ? `, ${entry.count} record${entry.count === 1 ? '' : 's'}` : ''}`);
    tile.innerHTML = `<span class="utility-domain-icon" aria-hidden="true">${config.icon}</span><span class="utility-domain-label">${config.plural}</span><span class="utility-domain-count">${Number.isInteger(entry.count) ? entry.count : '—'}</span>`;
    tile.addEventListener('click', () => {
      void selectDomain(entry.domain);
      setUtilityMenuOpen(false);
    });
    nav.append(tile);
  }
}

function codingPrefill(prefix, system, code, display) {
  const record = {};
  setPath(record, `${prefix}.system`, system);
  setPath(record, `${prefix}.code`, code);
  setPath(record, `${prefix}.display`, display);
  return record;
}

function vitalPrefill(domainCode, loincCode, display, unit) {
  return {
    code: domainCode,
    ...codingPrefill('loincCode', LOINC_SYSTEM, loincCode, display),
    unit,
  };
}

function renderDomainGraph(domainKey = activeDomain, sourceRecords = records) {
  const config = domains[domainKey];
  const elements = DOMAIN_SEMANTIC_ELEMENTS[domainKey] || semanticElementsFromFields(config);
  $('domain-graph-title').textContent = `${config.plural} semantic map`;
  $('domain-graph-description').textContent = 'Hover or focus a node to inspect current data and add a focused record.';
  const graph = $('domain-graph');
  graph.replaceChildren();
  graph.append(createDomainSpiderGraph(domainKey, elements, sourceRecords));
  renderDomainNodeSummary(domainKey, elements[0], sourceRecords);
}

function semanticElementsFromFields(config) {
  return config.fields
    .filter((field) => !field.transient && field.type !== 'terminology-search')
    .slice(0, 6)
    .map((field) => ({
      id: field.name,
      label: field.label.replace(/\s*\*$/, ''),
      summary: field.help || `Owner-held ${field.label.toLowerCase()} value.`,
      prefill: {},
      match: (record) => getPath(record, field.name) !== undefined,
    }));
}

function createDomainSpiderGraph(domainKey, elements, sourceRecords, interactive = true) {
  const size = 320;
  const center = size / 2;
  const radius = center - 48;
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'spider domain-spider');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${domains[domainKey].plural} semantic spider graph with ${elements.length} nodes`);

  const node = (name, attributes) => {
    const element = document.createElementNS(svgNs, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  };
  const point = (index, fraction) => {
    const angle = (Math.PI * 2 * index) / elements.length - Math.PI / 2;
    return [center + Math.cos(angle) * radius * fraction, center + Math.sin(angle) * radius * fraction];
  };

  for (const ring of [0.25, 0.5, 0.75, 1]) {
    svg.append(node('polygon', { points: elements.map((_, index) => point(index, ring).join(',')).join(' '), class: 'spider-ring' }));
  }

  const fractions = elements.map((element) => {
    const count = recordsForSemanticElement(element, sourceRecords).length;
    return count > 0 ? Math.min(1, 0.35 + count * 0.18) : 0.18;
  });
  svg.append(node('polygon', { points: elements.map((_, index) => point(index, fractions[index]).join(',')).join(' '), class: 'spider-area' }));

  elements.forEach((element, index) => {
    const color = DOMAIN_COLORS[domainKey] || '#176c5c';
    const [ax, ay] = point(index, 1);
    svg.append(node('line', { x1: center, y1: center, x2: ax, y2: ay, stroke: color, 'stroke-width': 2, 'stroke-opacity': .5 }));
    const [px, py] = point(index, fractions[index]);
    const count = recordsForSemanticElement(element, sourceRecords).length;
    svg.append(node('circle', {
      cx: px, cy: py, r: 12, fill: 'none', stroke: color, 'stroke-width': 1.8,
      'stroke-dasharray': '3 3', class: 'spider-point-halo', 'aria-hidden': 'true',
    }));
    const marker = node('circle', {
      cx: px, cy: py, r: 7,
      fill: count > 0 ? color : STATUS_COLORS.empty,
      stroke: '#fffdf7', 'stroke-width': 2,
      class: 'spider-point', tabindex: '0', role: 'button',
      'data-domain': domainKey,
      'data-semantic-node': element.id,
      'aria-label': `${element.label}: ${count} current record${count === 1 ? '' : 's'}. Show summary and add ${domains[domainKey].label.toLowerCase()}.`,
    });
    if (interactive) {
      const showSummary = () => renderDomainNodeSummary(domainKey, element, sourceRecords);
      marker.addEventListener('mouseenter', showSummary);
      marker.addEventListener('focus', showSummary);
      marker.addEventListener('click', showSummary);
      marker.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showSummary(); }
      });
    }
    svg.append(marker);

    const [lx, ly] = point(index, 1.18);
    const label = node('text', {
      x: lx, y: ly, fill: color, class: 'spider-label',
      'text-anchor': lx > center + 4 ? 'start' : lx < center - 4 ? 'end' : 'middle',
      'dominant-baseline': ly > center ? 'hanging' : ly < center ? 'auto' : 'middle',
      tabindex: '0', role: 'button', 'data-domain': domainKey, 'data-semantic-node': element.id,
      'aria-label': `${element.label}: show ${domains[domainKey].plural} summary.`,
    });
    label.textContent = element.label;
    if (interactive) {
      const showSummary = () => renderDomainNodeSummary(domainKey, element, sourceRecords);
      label.addEventListener('mouseenter', showSummary);
      label.addEventListener('focus', showSummary);
      label.addEventListener('click', showSummary);
      label.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showSummary(); }
      });
    }
    svg.append(label);
  });

  return svg;
}

function renderDomainNodeSummary(domainKey, element, sourceRecords) {
  const target = $('domain-node-summary');
  target.replaceChildren();
  if (!element) {
    const empty = document.createElement('div');
    empty.className = 'domain-node-summary-empty';
    empty.textContent = 'Choose a graph node to inspect current records.';
    target.append(empty);
    return;
  }
  const matches = recordsForSemanticElement(element, sourceRecords);
  const latest = matches[0];
  const config = domains[domainKey];
  const heading = document.createElement('h3');
  heading.textContent = element.label;
  const summary = document.createElement('p');
  summary.textContent = element.summary;
  const table = document.createElement('table');
  table.append(
    summaryRow('Current records', String(matches.length)),
    summaryRow('Latest item', latest ? config.title(latest) : 'No current record'),
    summaryRow('Latest detail', latest ? (config.detail(latest) || 'Stored in your Solid pod') : 'Use Add to create the first entry'),
  );
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary';
  button.textContent = `Add ${config.label.toLowerCase()}`;
  button.addEventListener('click', () => openForm(null, structuredClone(element.prefill || {})));
  target.append(heading, summary, table, button);
}

function summaryRow(label, value) {
  const row = document.createElement('tr');
  const heading = document.createElement('th');
  heading.scope = 'row';
  heading.textContent = label;
  const cell = document.createElement('td');
  cell.textContent = value;
  row.append(heading, cell);
  return row;
}

function recordsForSemanticElement(element, sourceRecords) {
  const matches = (sourceRecords || []).filter((record) => {
    try {
      return element.match ? element.match(record) : true;
    } catch {
      return false;
    }
  });
  return matches.sort((a, b) => recordTimestamp(b) - recordTimestamp(a));
}

function recordTimestamp(record) {
  const candidates = [
    record.updatedAt,
    record.effectiveDateTime,
    record.authoredDate,
    record.occurrenceDate,
    record.effectiveDate,
    record.onsetDate,
    record.startDate,
    record.dueDate,
  ];
  for (const value of candidates) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
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
  podActivity = activity;
  renderWellnessRecentActivity(activity);
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
  $('epic-documents').disabled = !ready || !enabled || !connected;
  $('epic-apply').disabled = !ready || !enabled || !connected || !epicPreview || epicSelectedDomains.size === 0;
}

async function openEpicDocumentManager() {
  const dialog = $('epic-document-dialog');
  $('epic-document-connection').textContent = epicStatus.status === 'connected' ? 'Connected' : 'Not connected';
  try {
    const [recordsResponse, planResponse] = await Promise.all([
      fetch('/api/resources/documents'),
      fetch('/api/planned/epic/documents'),
    ]);
    const recordsPayload = await recordsResponse.json();
    const planPayload = await planResponse.json();
    epicDocumentRecords = Array.isArray(recordsPayload.data) ? recordsPayload.data : [];
    renderEpicDocumentCapabilities(planPayload.data);
  } catch (error) {
    epicDocumentRecords = [];
    renderEpicDocumentCapabilities({ error: error.message });
  }
  selectedEpicDocument = collectEpicDocuments()[0] || null;
  renderEpicDocumentManager();
  dialog.showModal();
}

function collectEpicDocuments() {
  const local = epicDocumentRecords.map((record) => ({ ...record, _source: 'pod', _action: 'local' }));
  const imported = (epicPreview?.changes || [])
    .filter((change) => change.domain === 'documents')
    .map((change) => ({ ...change.entity, _source: 'epic', _action: change.action, _provenance: change.provenance, _targetUrl: change.targetUrl }));
  return [...imported, ...local];
}

function renderEpicDocumentCapabilities(plan) {
  const target = $('epic-document-capabilities');
  target.replaceChildren();
  const copy = document.createElement('p');
  copy.textContent = plan?.error
    ? `Capability details unavailable: ${plan.error}`
    : 'Read and local Pod create are available. Epic create/update actions are staged for review; delete remains blocked by the current contract.';
  const chips = document.createElement('div');
  chips.className = 'capability-chips';
  for (const [text, className] of [
    ['READ', 'capability-read'],
    ['CREATE · STAGED', 'capability-read'],
    ['UPDATE · REVIEW', 'capability-review'],
    ['DELETE · BLOCKED', 'capability-blocked'],
  ]) {
    const chip = document.createElement('span');
    chip.className = `capability-chip ${className}`;
    chip.textContent = text;
    chips.append(chip);
  }
  target.append(copy, chips);
}

function documentDate(record) {
  return record.authoredDate || record.updatedAt || record._provenance?.sourceLastUpdated || '';
}

function documentTitle(record) {
  return record.title || record.documentType?.display || record.documentType?.code || 'Untitled document';
}

function documentDuplicateKey(record) {
  return `${documentTitle(record).toLowerCase().replace(/[^a-z0-9]/g, '')}:${String(documentDate(record)).slice(0, 10)}`;
}

function renderEpicDocumentManager() {
  const query = $('epic-document-search').value.trim().toLowerCase();
  const all = collectEpicDocuments();
  const duplicateCounts = all.reduce((map, record) => map.set(documentDuplicateKey(record), (map.get(documentDuplicateKey(record)) || 0) + 1), new Map());
  const visible = all.filter((record) => JSON.stringify(record).toLowerCase().includes(query));
  const list = $('epic-document-list');
  list.replaceChildren();
  const heading = document.createElement('div');
  heading.className = 'epic-document-list-heading';
  heading.innerHTML = '<span>All documents</span><span>Newest first</span>';
  list.append(heading);
  for (const record of visible) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `epic-document-row ${record === selectedEpicDocument ? 'active' : ''}`;
    const duplicate = duplicateCounts.get(documentDuplicateKey(record)) > 1;
    row.innerHTML = `<strong></strong><small></small><span class="capability-chip ${duplicate ? 'capability-review' : 'capability-read'}"></span>`;
    row.querySelector('strong').textContent = documentTitle(record);
    row.querySelector('small').textContent = `${formatDate(documentDate(record)) || 'Date unavailable'} · ${record.sourceSystem || record._source}`;
    row.querySelector('span').textContent = duplicate ? 'DUPLICATE' : record._source.toUpperCase();
    row.addEventListener('click', () => { selectedEpicDocument = record; renderEpicDocumentManager(); });
    list.append(row);
  }
  const duplicates = all.filter((record) => duplicateCounts.get(documentDuplicateKey(record)) > 1);
  $('epic-document-duplicates').textContent = `Potential duplicates: ${new Set(duplicates.map(documentDuplicateKey)).size}`;
  $('epic-document-summary').textContent = `${all.length} documents · ${duplicates.length} duplicate candidates · audit logging enabled`;
  renderEpicDocumentDetail(selectedEpicDocument, duplicates);
}

function renderEpicDocumentDetail(record, duplicates) {
  const detail = $('epic-document-detail');
  const actions = $('epic-document-actions');
  detail.replaceChildren();
  actions.replaceChildren();
  if (!record) {
    detail.innerHTML = '<h3>No documents available</h3><p>Preview an Epic import or add a document to your Solid pod.</p>';
    return;
  }
  const heading = document.createElement('h3');
  heading.textContent = documentTitle(record);
  const provenance = document.createElement('p');
  provenance.textContent = `${record._source === 'epic' ? 'Epic DocumentReference' : 'Owner Solid pod'} · ${formatDate(documentDate(record)) || 'Date unavailable'}`;
  const metadata = document.createElement('dl');
  metadata.className = 'epic-document-meta';
  for (const [label, value] of [
    ['Category', record.category?.display || record.documentType?.display || 'Not specified'],
    ['Clinical date', formatDate(documentDate(record)) || 'Not specified'],
    ['Status', record.status || 'Not specified'],
    ['Source', record.sourceSystem || record._source],
    ['Format', record.contentType || (record.binaryUrl ? 'Linked binary' : 'Metadata only')],
    ['LOINC', record.documentType?.code || 'Not specified'],
  ]) {
    const cell = document.createElement('div');
    cell.innerHTML = '<dt></dt><dd></dd>';
    cell.querySelector('dt').textContent = label;
    cell.querySelector('dd').textContent = value;
    metadata.append(cell);
  }
  detail.append(heading, provenance, metadata);
  const matches = duplicates.filter((candidate) => documentDuplicateKey(candidate) === documentDuplicateKey(record));
  if (matches.length > 1) {
    const duplicateHeading = document.createElement('h4');
    duplicateHeading.textContent = 'Duplicate review';
    const grid = document.createElement('div');
    grid.className = 'epic-duplicate-grid';
    matches.slice(0, 2).forEach((candidate, index) => {
      const card = document.createElement('article');
      card.className = `epic-duplicate-card ${index === 0 ? 'canonical' : ''}`;
      card.innerHTML = `<strong>${index === 0 ? '● Keep as canonical' : '○ Merge into canonical'}</strong><p></p><small></small>`;
      card.querySelector('p').textContent = documentTitle(candidate);
      card.querySelector('small').textContent = candidate._source === 'epic' ? 'Epic provenance and signed source' : 'Owner notes and Pod provenance';
      grid.append(card);
    });
    detail.append(duplicateHeading, grid);
  }

  const actionHeading = document.createElement('h3');
  actionHeading.textContent = 'Owner actions';
  const edit = document.createElement('button');
  edit.className = 'secondary'; edit.type = 'button'; edit.textContent = 'Edit local metadata';
  edit.disabled = record._source !== 'pod';
  edit.addEventListener('click', () => { $('epic-document-dialog').close(); activeDomain = 'documents'; openForm(record); });
  const stage = document.createElement('button');
  stage.className = 'primary'; stage.type = 'button'; stage.textContent = record._source === 'pod' ? 'Stage Epic update' : 'Stage create in Epic';
  stage.addEventListener('click', () => stageEpicDocument(record));
  const remove = document.createElement('button');
  remove.className = 'secondary'; remove.type = 'button'; remove.textContent = 'Delete from Epic'; remove.disabled = true;
  const blocked = document.createElement('span');
  blocked.className = 'blocked-note'; blocked.textContent = 'Delete unavailable: the current Epic document contract is read-only and does not expose an approved delete workflow.';
  actions.append(actionHeading, edit, stage, remove, blocked);
  const before = document.createElement('strong'); before.textContent = 'Before staging'; actions.append(before);
  for (const text of ['Review exact changed fields', 'Confirm purpose: care coordination', 'Confirm authorized Epic destination', 'Record owner consent and audit event']) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
    label.append(checkbox, document.createTextNode(text)); actions.append(label);
  }
  const note = document.createElement('div'); note.className = 'safety-note'; note.textContent = 'No direct write occurs yet. The request is staged until authorization, capability, policy, and owner-consent checks pass.'; actions.append(note);
}

async function stageEpicDocument(record) {
  const checked = [...$('epic-document-actions').querySelectorAll('input[type="checkbox"]')].every((input) => input.checked);
  if (!checked) {
    alert('Complete every owner-review confirmation before staging this Epic document change.');
    return;
  }
  const documentRecord = Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith('_')));
  const podResourceUrl = record.url || record._targetUrl;
  const action = record._action === 'update' || podResourceUrl ? 'update' : 'create';
  const response = await fetch('/api/integrations/epic/outbound', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain: 'documents', action, writeMode: 'stage', podResourceUrl, record: documentRecord }),
  });
  const payload = await response.json();
  if (!response.ok) { alert(formatApiError(payload)); return; }
  $('epic-document-review').disabled = false;
  $('epic-document-summary').textContent = payload.data?.message || 'Document change staged for owner review.';
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

function readEpicCallbackStatus() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('epic') !== 'connected') return null;
  let stored = null;
  try {
    stored = JSON.parse(sessionStorage.getItem('opencommons.epic.callback') || 'null');
    sessionStorage.removeItem('opencommons.epic.callback');
  } catch {
    stored = null;
  }
  const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
  window.history.replaceState({}, document.title, cleanUrl);
  return stored || { status: 'connected' };
}

function renderEpicCallbackNotice(callbackStatus) {
  const target = $('epic-readiness');
  if (!target || !callbackStatus) return;
  const notice = document.createElement('article');
  notice.className = 'epic-readiness-card epic-readiness-ready';
  const status = callbackStatus.status || epicStatus.status || 'connected';
  const scopeCount = Number.isInteger(callbackStatus.grantedScopeCount) ? callbackStatus.grantedScopeCount : undefined;
  const connectedAt = callbackStatus.connectedAt ? ` Connected ${formatDate(callbackStatus.connectedAt)}.` : '';
  notice.innerHTML = `<strong>Epic connection ${status}</strong><span>The app received the SMART callback, refreshed Pod-owned connection status, and is ready for owner-reviewed import.${connectedAt}</span><small>${scopeCount === undefined ? 'Granted scopes are available in the live status summary.' : `${scopeCount} granted scope${scopeCount === 1 ? '' : 's'} recorded without exposing tokens or raw authorization codes.`}</small>`;
  target.prepend(notice);
}

async function handleEpicCallbackCompletion() {
  const callbackStatus = readEpicCallbackStatus();
  if (!callbackStatus) return;
  showView('status');
  await checkStatus();
  epicPreview = null;
  epicSelectedDomains = new Set();
  renderEpicPreview();
  renderEpicCallbackNotice(callbackStatus);
}

async function selectDomain(key) {
  activeDomain = key;
  const config = domains[key];
  showView('records');
  document.querySelectorAll('.domain-nav button').forEach((button) => button.classList.toggle('active', button.dataset.domain === key));
  $('page-title').textContent = config.plural;
  $('page-description').textContent = config.description;
  $('table-title').textContent = config.plural;
  $('search').value = '';
  renderDomainGraph(key, []);
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
  renderDomainGraph(activeDomain, records);
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

function openForm(record = null, prefill = null) {
  editing = record;
  const config = domains[activeDomain];
  $('form-eyebrow').textContent = record ? 'Update record' : 'New record';
  $('form-title').textContent = `${record ? 'Edit' : 'Add'} ${config.label.toLowerCase()}`;
  $('form-error').classList.add('hidden');
  const fields = $('form-fields');
  fields.replaceChildren();
  const fieldValues = record || prefill || {};
  for (const field of config.fields) fields.append(createField(field, fieldValues));
  renderSyncTargets(record);
  if (!record) document.querySelectorAll('#form-fields select[data-coded-select="true"]').forEach((input) => applyCodedSelect(input._fieldConfig, input));
  renderFormReview();
  recordFormSnapshot = serializeRecordForm();
  $('record-dialog').showModal();
}

function renderFormReview() {
  const target = $('form-review');
  if (!target) return;
  target.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = 'Review before saving';
  const label = document.createElement('span');
  label.className = 'form-review-label';
  label.textContent = 'Required fields';
  target.append(heading, label);

  const config = domains[activeDomain];
  const required = config.fields.filter((field) => field.required && !field.transient && field.type !== 'terminology-search');
  for (const field of required.slice(0, 5)) {
    const input = document.getElementById(`field-${field.name}`);
    const row = document.createElement('span');
    row.className = 'form-review-check';
    row.textContent = `${input?.value ? '✓' : '○'}  ${field.label}`;
    target.append(row);
  }

  const codingPrefix = config.fields.find((field) => field.type === 'terminology-search')?.prefix;
  if (!codingPrefix) return;
  const details = document.createElement('dl');
  for (const [name, key] of [['Display', 'display'], ['System', 'system'], ['Code', 'code']]) {
    const value = document.getElementById(`field-${codingPrefix}.${key}`)?.value;
    if (!value) continue;
    const wrapper = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = name;
    const description = document.createElement('dd');
    description.textContent = value;
    wrapper.append(term, description);
    details.append(wrapper);
  }
  if (details.children.length) {
    const codingLabel = document.createElement('span');
    codingLabel.className = 'form-review-label';
    codingLabel.textContent = 'Coding details';
    target.append(codingLabel, details);
  }
}

function renderSyncTargets(record = null) {
  const container = $('form-sync-targets');
  const epicConnected = epicStatus.enabled && epicStatus.status === 'connected';
  container.replaceChildren();
  const title = document.createElement('div');
  title.className = 'sync-targets-title';
  title.textContent = 'Update targets';
  const pod = createSyncTargetOption({
    id: 'sync-update-pod',
    name: '__updatePod',
    label: 'Update Solid Pod',
    detail: 'Writes this record to your owner-managed local Solid pod, the source of authority for the PIM.',
    checked: true,
  });
  const epic = createSyncTargetOption({
    id: 'sync-update-epic',
    name: '__updateEpic',
    label: 'Stage update to Epic',
    detail: epicConnected
      ? 'Stages an owner-approved outbound Epic write intent. Live Epic writeback is disabled until domain-specific FHIR write mappings are validated.'
      : 'Connect Epic before staging outbound write intents.',
    checked: false,
    disabled: !epicConnected,
  });
  const note = document.createElement('small');
  note.className = 'sync-target-note';
  note.textContent = record
    ? 'Editing can update the Pod and optionally stage the changed record for Epic outbound review.'
    : 'Adding can create the Pod record and optionally stage the new record for Epic outbound review.';
  container.append(title, pod, epic, note);
}

function createSyncTargetOption({ id, name, label, detail, checked = false, disabled = false }) {
  const wrapper = document.createElement('label');
  wrapper.className = `sync-target-option ${disabled ? 'disabled' : ''}`;
  wrapper.htmlFor = id;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.name = name;
  input.checked = checked;
  input.disabled = disabled;
  const copy = document.createElement('span');
  copy.innerHTML = `<strong>${label}</strong><small>${detail}</small>`;
  wrapper.append(input, copy);
  return wrapper;
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
      const normalized = normalizeSelectOption(option);
      const element = document.createElement('option');
      element.value = normalized.value;
      element.textContent = selectOptionLabel(normalized);
      input.append(element);
    }
    if (field.options.some((option) => typeof option === 'object')) {
      input.dataset.codedSelect = 'true';
      input._fieldConfig = field;
      input.addEventListener('change', () => applyCodedSelect(field, input));
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
  const current = getPath(record || {}, field.valueFrom || field.name);
  if (field.type !== 'terminology-search') {
    input.value = field.list && Array.isArray(current) ? current.join(', ') : normalizeInputValue(current, field.type);
  }
  wrapper.append(label, input);
  if (input._terminologyList) wrapper.append(input._terminologyList);
  const systemReference = createSystemReference(field);
  if (systemReference) wrapper.append(systemReference);
  if (field.help) {
    const help = document.createElement('small');
    help.className = 'field-help';
    help.textContent = field.help;
    wrapper.append(help);
  }
  return wrapper;
}

function normalizeSelectOption(option) {
  if (typeof option === 'string') {
    return { value: option, display: option ? option.replaceAll('-', ' ') : 'Not specified' };
  }
  return {
    value: option.value ?? option.code ?? option.display ?? '',
    display: option.display ?? option.value ?? option.code ?? '',
    code: option.code,
    source: option.source,
    system: option.system,
    apply: option.apply,
  };
}

function selectOptionLabel(option) {
  if (!option.value && !option.code) return option.display || 'Not specified';
  if (option.code && option.source) return `${option.display} — ${option.code} [${option.source}]`;
  if (option.code) return `${option.display} — ${option.code}`;
  return option.display;
}

function applyCodedSelect(field, input) {
  if (!field) return;
  const selected = field.options.map(normalizeSelectOption).find((option) => option.value === input.value);
  if (!selected?.apply) return;
  for (const [fieldName, value] of Object.entries(selected.apply)) {
    setInputValue(fieldName, value);
  }
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

function createSystemReference(field) {
  const systems = [];
  if (field.system) systems.push({ source: field.source, system: field.system });
  for (const option of field.options || []) {
    if (typeof option === 'object' && option.system) systems.push({ source: option.source, system: option.system });
  }
  const unique = [...new Map(systems.map((entry) => [entry.system, entry])).values()];
  if (unique.length === 0) return null;

  const reference = document.createElement('small');
  reference.className = 'system-reference';
  reference.append(`${unique.length === 1 ? 'Coding system' : 'Coding systems'}: `);
  unique.forEach((entry, index) => {
    if (index > 0) reference.append(' · ');
    const link = document.createElement('a');
    link.href = entry.system;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${entry.source || 'System'} ${entry.system}`;
    reference.append(link);
  });
  return reference;
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
  const updatePod = Boolean(event.currentTarget.elements.namedItem('__updatePod')?.checked);
  const updateEpic = Boolean(event.currentTarget.elements.namedItem('__updateEpic')?.checked);
  if (!updatePod && !updateEpic) {
    $('form-error').textContent = 'Select at least one update target.';
    $('form-error').classList.remove('hidden');
    return;
  }
  const entity = editing ? structuredClone(editing) : {};
  for (const field of domains[activeDomain].fields) {
    if (field.type === 'terminology-search' || field.transient) continue;
    const input = event.currentTarget.elements.namedItem(field.name);
    if (!input.value && !field.required) continue;
    let value = input.value;
    if (field.type === 'number') value = Number(value);
    if (field.list) value = value.split(',').map((item) => item.trim()).filter(Boolean);
    if (field.type === 'datetime-local' && value) value = new Date(value).toISOString();
    setPath(entity, field.name, value);
  }
  try {
    let savedEntity = entity;
    if (updatePod) {
      const response = await fetch(`/api/resources/${activeDomain}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(entity),
      });
      const payload = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(formatApiError(payload));
      savedEntity = payload.data || entity;
    }
    let epicMessage = '';
    if (updateEpic) {
      const response = await fetch('/api/integrations/epic/outbound', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          domain: activeDomain,
          action: editing ? 'update' : 'create',
          writeMode: 'stage',
          updatePod,
          podResourceUrl: savedEntity.url,
          record: savedEntity,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(formatApiError(payload));
      epicMessage = payload.data?.message || 'Epic outbound update staged for review.';
    }
    recordFormSnapshot = serializeRecordForm();
    $('record-dialog').close();
    if (updatePod) {
      await loadRecords();
      await refreshWellness();
    }
    if (updateEpic) {
      await refreshPodActivity();
      alert(epicMessage);
    }
  } catch (error) {
    $('form-error').textContent = error.message;
    $('form-error').classList.remove('hidden');
  }
}

function serializeRecordForm() {
  const data = {};
  for (const element of $('record-form').elements) {
    if (!element.name || element.type === 'submit' || element.type === 'button') continue;
    data[element.name] = element.type === 'checkbox' ? element.checked : element.value;
  }
  return JSON.stringify(data);
}

function isRecordFormDirty() {
  return $('record-dialog').open && serializeRecordForm() !== recordFormSnapshot;
}

function requestCloseRecordDialog() {
  if (isRecordFormDirty() && !confirm('Discard unsaved changes to this health record?')) return false;
  $('form-error').classList.add('hidden');
  $('record-dialog').close();
  recordFormSnapshot = '';
  return true;
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
    if (startPayload.data.connected) {
      await loadRecords();
      epicPreview = null;
      epicSelectedDomains = new Set();
      renderEpicPreview();
      return;
    }
    const authorizationUrl = startPayload.data.authorizationUrl;
    if (!authorizationUrl) throw new Error('Epic connect did not return an authorization URL or connected status.');
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
    renderReconcileWorkspace();
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
    renderEpicPreview({ error: error.message });
    alert(error.message);
  }
}

function renderEpicPreview(applyResult = null) {
  const list = $('epic-preview-list');
  list.replaceChildren();
  if (applyResult) {
    list.classList.remove('hidden');
    const message = document.createElement('p');
    message.textContent = applyResult.error
      ? `Epic import was not applied: ${applyResult.error}`
      : `Applied ${applyResult.resources.length} records to the Solid pod from import ${applyResult.importJobId}.`;
    list.append(message);
    return;
  }
  if (!epicPreview) {
    list.classList.add('hidden');
    renderReconcileWorkspace();
    return;
  }
  list.classList.remove('hidden');
  const summary = document.createElement('p');
  const grouped = groupEpicChangesByDomain(epicPreview.changes);
  summary.textContent = `${epicPreview.changes.length} mapped FHIR resources are ready for owner review before pod write. ${formatEpicActionCounts(epicPreview.changes)} Review each section and choose what to apply.`;
  list.append(summary);
  list.append(renderEpicSourceDiagnostics(epicPreview.sourceDiagnostics || []));
  list.append(renderReconciliationReview(epicPreview));
  renderReconcileWorkspace();

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

function renderEpicSourceDiagnostics(sourceDiagnostics) {
  const wrapper = document.createElement('div');
  wrapper.className = 'epic-source-diagnostics';
  const mapped = sourceDiagnostics.filter((item) => item.mappableCount > 0).length;
  const attention = sourceDiagnostics.filter((item) => item.status === 'attention').length;
  const skipped = sourceDiagnostics.filter((item) => item.status === 'skipped').length;
  const summary = document.createElement('span');
  summary.textContent = `FHIR source diagnostics: ${mapped} mapped, ${attention} attention, ${skipped} skipped`;
  const tooltip = document.createElement('span');
  tooltip.className = 'epic-source-tooltip';
  tooltip.tabIndex = 0;
  tooltip.setAttribute('role', 'note');
  tooltip.setAttribute('aria-label', `FHIR source diagnostics. ${formatEpicSourceDiagnostics(sourceDiagnostics)}`);
  tooltip.title = formatEpicSourceDiagnostics(sourceDiagnostics);
  tooltip.setAttribute('data-tooltip', formatEpicSourceDiagnostics(sourceDiagnostics));
  wrapper.append(summary, tooltip);
  return wrapper;
}

function formatEpicSourceDiagnostics(sourceDiagnostics) {
  if (!sourceDiagnostics?.length) return 'No live FHIR source diagnostics were returned with this preview.';
  return sourceDiagnostics
    .map((item) => {
      const http = item.httpStatus ? `HTTP ${item.httpStatus}` : item.status;
      const fhirType = item.fhirResourceType ? ` · ${item.fhirResourceType}` : '';
      return `${item.resourceType}: ${http}${fhirType}; entries ${item.entryCount || 0}; mapped ${item.mappableCount || 0}. ${item.detail || ''}`.trim();
    })
    .join('\n');
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
$('record-form').addEventListener('input', renderFormReview);
$('record-form').addEventListener('change', renderFormReview);
$('record-close').addEventListener('click', requestCloseRecordDialog);
$('record-cancel').addEventListener('click', requestCloseRecordDialog);
$('record-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  requestCloseRecordDialog();
});
$('record-dialog').addEventListener('click', (event) => {
  if (event.target === $('record-dialog')) requestCloseRecordDialog();
});
$('search').addEventListener('input', renderRecords);
$('epic-connect').addEventListener('click', connectEpic);
$('epic-diagnostics').addEventListener('click', () => refreshEpicDiagnostics(applicationReady, true, epicStatus));
$('epic-preview').addEventListener('click', previewEpicImport);
$('epic-documents').addEventListener('click', openEpicDocumentManager);
$('epic-apply').addEventListener('click', applyEpicImport);
$('reconcile-scan').addEventListener('click', previewEpicImport);
$('reconcile-approve').addEventListener('click', applyEpicImport);
$('epic-document-close').addEventListener('click', () => $('epic-document-dialog').close());
$('epic-document-dialog').addEventListener('click', (event) => {
  if (event.target === $('epic-document-dialog')) $('epic-document-dialog').close();
});
$('epic-document-search').addEventListener('input', renderEpicDocumentManager);
$('epic-document-duplicates').addEventListener('click', () => {
  const all = collectEpicDocuments();
  const counts = all.reduce((map, record) => map.set(documentDuplicateKey(record), (map.get(documentDuplicateKey(record)) || 0) + 1), new Map());
  selectedEpicDocument = all.find((record) => counts.get(documentDuplicateKey(record)) > 1) || selectedEpicDocument;
  renderEpicDocumentManager();
});
$('epic-document-add').addEventListener('click', () => {
  $('epic-document-dialog').close();
  activeDomain = 'documents';
  openForm();
});
$('epic-document-review').addEventListener('click', () => {
  $('epic-document-dialog').close();
  showView('status');
  $('epic-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('connection').addEventListener('click', () => showView('pod'));
document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  showView('wellness');
});
initializeNavigation();
initializeUtilityMenu();
showView('wellness');
void (async () => {
  await checkStatus();
  await handleEpicCallbackCompletion();
})();
