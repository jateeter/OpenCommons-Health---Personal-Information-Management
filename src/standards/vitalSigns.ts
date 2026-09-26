import type { VitalSignCode } from '../types/health';

/**
 * FHIR core vital-signs profile: the LOINC code for each of PIM's nine
 * vital-sign codes (http://hl7.org/fhir/R4/observation-vitalsigns.html).
 *
 * This is PIM's fixed schema knowledge, not a catalog of metrics. Any source
 * (Epic FHIR, HealthKit clinical records, HealthKit samples) whose LOINC is here
 * lands in the `vital-signs` pillar under the matching code, so the same
 * measurement from two sources reconciles instead of duplicating.
 */
export const VITAL_SIGN_LOINC: Record<string, VitalSignCode> = {
  '85354-9': 'blood-pressure', // Blood pressure panel
  '8867-4': 'heart-rate',
  '29463-7': 'body-weight',
  '3141-9': 'body-weight', // Body weight measured
  '8302-2': 'body-height',
  '39156-5': 'bmi',
  '9279-1': 'respiratory-rate',
  '8310-5': 'body-temperature',
  '59408-5': 'oxygen-saturation', // SpO2 by pulse oximetry
  '2708-6': 'oxygen-saturation',
  '2339-0': 'blood-glucose', // Glucose [Mass/volume] in Blood
  '15074-8': 'blood-glucose', // Glucose [Moles/volume] in Blood
};

/** Blood-pressure panel components (FHIR vital-signs profile). */
export const SYSTOLIC_LOINC = '8480-6';
export const DIASTOLIC_LOINC = '8462-4';

const VITAL_SIGN_CODES: ReadonlySet<string> = new Set<VitalSignCode>([
  'body-weight',
  'body-height',
  'bmi',
  'blood-pressure',
  'heart-rate',
  'respiratory-rate',
  'body-temperature',
  'oxygen-saturation',
  'blood-glucose',
]);

/** True when `code` is one of PIM's nine vital-sign codes. */
export function isVitalSignCode(code: string | undefined): code is VitalSignCode {
  return code !== undefined && VITAL_SIGN_CODES.has(code);
}

/**
 * The PIM vital-sign code for a LOINC code or a PIM code, or undefined when it
 * is not a vital sign. Accepts either, so callers need not know which a source
 * supplied.
 */
export function vitalSignCodeFor(loincOrCode: string | undefined): VitalSignCode | undefined {
  if (!loincOrCode) return undefined;
  if (isVitalSignCode(loincOrCode)) return loincOrCode;
  return VITAL_SIGN_LOINC[loincOrCode];
}
