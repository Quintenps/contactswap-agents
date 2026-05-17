/**
 * Service: Form submission validation
 *
 * Validates submitted field values against the form's field configuration,
 * returning structured validation results with per-field errors.
 */

import type { FieldConfig, FieldKey } from '@contactswap/shared';
import { validateField } from '../lib/validators/field-validators';

export interface FieldValidationResult {
  fieldKey: FieldKey;
  isValid: boolean;
  error?: string;
}

export interface FormSubmissionValidationResult {
  isValid: boolean;
  errors: FieldValidationResult[];
  firstErrorFieldKey?: FieldKey;
  firstErrorMessage?: string;
}

export interface FormSubmissionValidationError {
  field: FieldKey;
  message: string;
}

const SUPPORTED_FIELD_KEYS = new Set<string>([
  'full_name',
  'work_email',
  'personal_email',
  'work_phone',
  'cell_phone',
  'home_phone',
  'work_address',
  'work_address_street',
  'work_address_city',
  'work_address_state',
  'work_address_postal_code',
  'work_address_country',
  'home_address',
  'home_address_street',
  'home_address_city',
  'home_address_state',
  'home_address_postal_code',
  'home_address_country',
  'company',
  'job_title',
  'website',
  'birthday',
  'notes',
  'photo',
]);

/**
 * Validate a form submission against field config.
 * Returns structured validation result with per-field errors.
 */
export function validateFormSubmission(
  submitted: Record<string, string>,
  fieldConfig: FieldConfig[],
): FormSubmissionValidationResult {
  const errors: FieldValidationResult[] = [];

  // 1. Check for unknown field keys
  for (const key of Object.keys(submitted)) {
    if (!SUPPORTED_FIELD_KEYS.has(key)) {
      errors.push({
        fieldKey: key as FieldKey,
        isValid: false,
        error: 'Unknown field type.',
      });
    }
  }

  // 2. Validate each configured field
  for (const config of fieldConfig) {
    const fieldKey = config.fieldKey as FieldKey;
    const value = submitted[fieldKey]?.trim() ?? '';

    // Check if field is required and empty
    if (config.required && !value) {
      errors.push({
        fieldKey,
        isValid: false,
        error: `${formatFieldLabel(fieldKey)} is required.`,
      });
      continue;
    }

    // If field is optional and empty, skip validation
    if (!value) {
      errors.push({
        fieldKey,
        isValid: true,
      });
      continue;
    }

    // Validate field format
    const validationResult = validateField(fieldKey, value);
    if (!validationResult.success) {
      errors.push({
        fieldKey,
        isValid: false,
        error: validationResult.error,
      });
    } else {
      errors.push({
        fieldKey,
        isValid: true,
      });
    }
  }

  // Determine overall validity and first error
  const firstError = errors.find((e) => !e.isValid);
  const isValid = errors.every((e) => e.isValid);

  return {
    isValid,
    errors,
    firstErrorFieldKey: firstError?.fieldKey,
    firstErrorMessage: firstError?.error,
  };
}

/**
 * Build a de-duplicated API-safe list of validation errors.
 * Keeps the first error encountered for each field.
 */
export function getValidationErrors(
  result: FormSubmissionValidationResult,
): FormSubmissionValidationError[] {
  const byField = new Map<FieldKey, FormSubmissionValidationError>();

  for (const item of result.errors) {
    if (item.isValid || !item.error || byField.has(item.fieldKey)) {
      continue;
    }

    byField.set(item.fieldKey, {
      field: item.fieldKey,
      message: item.error,
    });
  }

  return Array.from(byField.values());
}

/**
 * Convert field key to user-friendly label for error messages.
 * Used in error context where we want to name the field clearly.
 */
function formatFieldLabel(fieldKey: FieldKey): string {
  const labels: Record<FieldKey, string> = {
    full_name: 'Name',
    work_email: 'Work email',
    personal_email: 'Personal email',
    work_phone: 'Work phone',
    cell_phone: 'Cell phone',
    home_phone: 'Home phone',
    work_address: 'Work address',
    work_address_street: 'Work street',
    work_address_city: 'Work city',
    work_address_state: 'Work state',
    work_address_postal_code: 'Work postal code',
    work_address_country: 'Work country',
    home_address: 'Home address',
    home_address_street: 'Home street',
    home_address_city: 'Home city',
    home_address_state: 'Home state',
    home_address_postal_code: 'Home postal code',
    home_address_country: 'Home country',
    company: 'Company',
    job_title: 'Job title',
    website: 'Website',
    birthday: 'Birthday',
    notes: 'Notes',
    photo: 'Photo',
  };
  return labels[fieldKey] || fieldKey;
}
