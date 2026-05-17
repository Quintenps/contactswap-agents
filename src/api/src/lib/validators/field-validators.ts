/**
 * Validation schemas for contact fields
 *
 * Informed by vCard 4.0 (RFC 6350) property constraints and practical usability.
 * All error messages are non-technical and user-friendly.
 */

import { z } from 'zod';
import type { FieldKey } from '@contactswap/shared';

// Base URL validator (no protocol required for vCard URL property)
const urlSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      // Accept full URLs with protocol
      if (/^([a-zA-Z][a-zA-Z0-9+\-.]*:)?\/\/[^\s]+/i.test(val)) {
        return true;
      }
      // Accept bare domains with TLD (at least one dot)
      if (/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+$/i.test(val)) {
        return true;
      }
      return false;
    },
    {
      message: 'Please enter a valid website URL.',
    },
  );

// Email validator
const emailSchema = z
  .string()
  .trim()
  .email('Please enter a valid email address.')
  .max(254, 'Email address is too long.');

// Phone number validator (loose — allows common formats)
// Note: Accepts international format with country code (e.g., +31652670011 for Dutch numbers)
// Minimum 7 digits to ensure practical phone numbers; country code is counted in digit total
const phoneSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      // Must contain only valid phone characters
      if (!/^[\d\s+\-\(\)\.x]+$/i.test(val)) {
        return false;
      }
      // Must have at least 7 digits (including country code)
      const digitCount = val.replace(/\D/g, '').length;
      return digitCount >= 7;
    },
    {
      message: 'Please enter a valid phone number.',
    },
  );

// Date validator (ISO 8601 YYYY-MM-DD format)
// Must be a valid date and must be in the past (reject future birthdates)
const birthdaySchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      // Must match YYYY-MM-DD format
      const match = /^\d{4}-\d{2}-\d{2}$/.test(val);
      if (!match) return false;

      // Must be a valid date
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;

      // Ensure date is not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date <= today;
    },
    {
      message: 'Please enter a valid birthdate (YYYY-MM-DD, cannot be in the future).',
    },
  );

// Full name validator
const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a name.')
  .max(300, 'Name is too long.')
  .refine(
    (val) => {
      // Reject if only numbers and spaces
      return !/^[\d\s]+$/.test(val);
    },
    {
      message: 'Please enter a valid name.',
    },
  );

// Generic text fields (company, job title)
const textSchema = z
  .string()
  .trim()
  .max(300, 'This field is too long.');

// Address components (street, city, state, country)
const addressComponentSchema = z
  .string()
  .trim()
  .max(100, 'This field is too long.');

// Postal code (basic — accepts most international formats)
const postalCodeSchema = z
  .string()
  .trim()
  .max(20, 'Postal code is too long.')
  .refine(
    (val) => /^[a-zA-Z0-9\s\-]{3,}$/.test(val),
    {
      message: 'Please enter a valid postal code.',
    },
  );

// Notes field (longer allowed)
const notesSchema = z
  .string()
  .trim()
  .max(1000, 'Notes cannot exceed 1000 characters.');

// Photo field (validated separately in parsePhotoDataUri)
const photoSchema = z.string();

export const fieldSchemas: Record<FieldKey, z.ZodSchema> = {
  full_name: fullNameSchema,
  work_email: emailSchema,
  personal_email: emailSchema,
  work_phone: phoneSchema,
  cell_phone: phoneSchema,
  home_phone: phoneSchema,
  work_address: textSchema.max(500),
  work_address_street: addressComponentSchema,
  work_address_city: addressComponentSchema,
  work_address_state: addressComponentSchema,
  work_address_postal_code: postalCodeSchema,
  work_address_country: addressComponentSchema,
  home_address: textSchema.max(500),
  home_address_street: addressComponentSchema,
  home_address_city: addressComponentSchema,
  home_address_state: addressComponentSchema,
  home_address_postal_code: postalCodeSchema,
  home_address_country: addressComponentSchema,
  company: textSchema,
  job_title: textSchema,
  website: urlSchema,
  birthday: birthdaySchema,
  notes: notesSchema,
  photo: photoSchema,
};

/**
 * Validate a single field value against its schema.
 * Returns { success: true } or { success: false, error: string }
 */
export function validateField(
  fieldKey: FieldKey,
  value: string,
): { success: true } | { success: false; error: string } {
  const schema = fieldSchemas[fieldKey];
  if (!schema) {
    return { success: false, error: 'Invalid field type.' };
  }

  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true };
  }

  // Extract the first error message
  const firstIssue = result.error.issues[0];
  return {
    success: false,
    error: firstIssue?.message || 'This field is invalid.',
  };
}
