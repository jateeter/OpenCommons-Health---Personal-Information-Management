import * as fs from 'fs';
import * as path from 'path';

/**
 * Registry of ShEx schema file paths keyed by resource type name.
 * The schema files are located alongside this module (src/schemas/).
 */
export const SCHEMA_FILES: Record<string, string> = {
  PersonProfile: path.join(__dirname, 'profile.shex'),
  MedicalCondition: path.join(__dirname, 'condition.shex'),
  Medication: path.join(__dirname, 'medication.shex'),
  AllergyIntolerance: path.join(__dirname, 'allergy.shex'),
  Immunization: path.join(__dirname, 'immunization.shex'),
  VitalSign: path.join(__dirname, 'vitalSigns.shex'),
  HealthcareProvider: path.join(__dirname, 'provider.shex'),
  LabResult: path.join(__dirname, 'labResult.shex'),
  InsurancePolicy: path.join(__dirname, 'insurance.shex'),
};

/**
 * Load and return the raw ShEx schema text for a given resource type.
 *
 * @param typeName - One of the keys in {@link SCHEMA_FILES}.
 * @returns The ShEx schema text.
 * @throws If the schema file is not found or cannot be read.
 */
export function loadSchema(typeName: string): string {
  const filePath = SCHEMA_FILES[typeName];
  if (!filePath) {
    throw new Error(`No schema registered for type: ${typeName}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Load all schemas as a record of { typeName → schemaText }.
 */
export function loadAllSchemas(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(SCHEMA_FILES).map(([key, filePath]) => [
      key,
      fs.readFileSync(filePath, 'utf-8'),
    ]),
  );
}

/** Supported health resource type names. */
export type HealthResourceType = keyof typeof SCHEMA_FILES;

export { validateThingAgainstSchema } from './shexValidation';
