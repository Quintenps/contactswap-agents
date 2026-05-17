# Feature: API — Better Field Validation

> Improve field validation rules in the form answer endpoint by extracting validation logic, enforcing vCard field standards, and providing clear, non-technical error messages.

**Status:** Planned  
**Assigned:** Unassigned  
**Parent:** feature-006-api-answer-forms  
**Depends On:** feature-006-api-answer-forms

---

## Goal

Replace the current minimal validation in `answer-form.ts` with a structured, maintainable validation schema that:

1. **Enforces field-level rules** — Each field has specific format/length constraints based on vCard standards and practical usability.
2. **Returns clear error messages** — Errors avoid technical jargon and tell users exactly what to fix (e.g., "Please enter a valid email address").
3. **Centralizes validation logic** — Extract from service layer into reusable, testable validator module.
4. **Maintains UX clarity** — Error messages are actionable and guide correction without frustrating the user.

### Non-Technical Error Messages

All error messages must:
- Avoid regex patterns, character-code references, and technical validation terms
- Speak to the user's intent (e.g., "This doesn't look like an email address" instead of "Invalid RFC 5322 format")
- Be concise (one sentence, ideally <60 chars where possible)
- Suggest a fix when helpful

**Example:** Instead of "Field 'work_phone' fails pattern /^[\d\-\+\(\)\s]+$/", say "Phone number has invalid characters."

---

## Current State

### Existing Validation (answer-form.ts)

```typescript
function validateFields(
  submitted: Record<string, string>,
  fieldConfig: FieldConfig[],
): void {
  // Reject unknown field keys
  for (const key of Object.keys(submitted)) {
    if (!SUPPORTED_FIELD_KEYS.has(key)) {
      throw new AnswerFormError(
        'Something in this form could not be processed. Please reload the page and try again.',
        422,
      );
    }
  }

  // Enforce required fields only
  for (const config of fieldConfig) {
    if (!config.required) continue;
    const value = submitted[config.fieldKey as string]?.trim();
    if (!value) {
      throw new AnswerFormError(
        'Please complete all required fields and try again.',
        422,
      );
    }
  }
}
```

### Problems

1. **No field-level format validation** — An email field accepts any non-empty string. Phone fields don't validate format.
2. **Generic error messages** — User doesn't know which field failed or why.
3. **Brittle error messages** — Single blanket message masks the real issue.
4. **No vCard compliance** — Fields are not validated against vCard property constraints.
5. **Validation logic mixed with business logic** — Scattered across service, making it hard to test and reuse.
6. **No photo validation semantics** — Photo checks happen in a separate function with different patterns.

### Scope of Current Gaps

| Field | Current Validation | Gap |
|-------|-------------------|-----|
| `full_name` | non-empty | No length limit; no Unicode handling |
| Email fields | non-empty only | No format check; no length limit |
| Phone fields | non-empty only | No format check (accepts any string) |
| Address fields | non-empty only | No length/structure validation |
| Birthday | non-empty only | No date format validation |
| Website | non-empty only | No URL format validation |
| Notes | non-empty only | No practical length limits |
| Photo | Handled separately in `parsePhotoDataUri` | Separate validation from other fields |

---

## Proposed Solution

### 1. Zod Validation Schema

Create a new file: `src/api/src/lib/validators/field-validators.ts`

Define a Zod schema that mirrors the `FieldKey` union and encodes validation rules for each field:

```typescript
import { z } from 'zod';
import type { FieldKey } from '@contactswap/shared';

/**
 * Validation rules for contact fields.
 * Informed by vCard 4.0 (RFC 6350) property constraints and practical usability.
 */

// Base URL validator (no protocol required for vCard URL property)
const urlSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      // Accept bare domain, www.domain, or https://domain
      // Reject incomplete URLs like "example." or single word
      return /^([a-zA-Z][a-zA-Z0-9+\-.]*:)?\/\/[^\s]+\.[^\s]+/i.test(val) ||
             /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+$/i.test(val);
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
    (val) => /^[\d\s+\-\(\)\.x]+$/i.test(val) && val.replace(/\D/g, '').length >= 7,
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
      const match = /^\d{4}-\d{2}-\d{2}$/.test(val);
      if (!match) return false;
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      // Ensure date is not in the future
      return date <= new Date();
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
    (val) => !/^[\d\s]+$/.test(val), // Reject if only numbers/spaces
    {
      message: 'Please enter a valid name.',
    },
  );

// Generic text fields (company, job title, notes)
const textSchema = z
  .string()
  .trim()
  .max(300, 'This field is too long.');

// Address components (street, city, state, postal code, country)
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
  photo: z.string(), // Validated separately by parsePhotoDataUri
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
```

### 2. New Validation Service

Create: `src/api/src/services/validate-form-submission.ts`

```typescript
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

/**
 * Throw an AnswerFormError with structured validation failure.
 * Prioritizes the first field error for user messaging.
 */
export function throwValidationError(
  result: FormSubmissionValidationResult,
  fieldKey?: FieldKey,
): never {
  const { AnswerFormError } = require('./answer-form');
  
  throw new AnswerFormError(
    result.firstErrorMessage || 'Please check the form and try again.',
    422,
    fieldKey || result.firstErrorFieldKey,
  );
}
```

### 3. Integrate into answer-form.ts

Replace the `validateFields` function:

```typescript
// In answer-form.ts
import {
  validateFormSubmission,
  throwValidationError,
} from './validate-form-submission';

// Replace old validateFields() call with:
const validationResult = validateFormSubmission(input.fields, form.fields);
if (!validationResult.isValid) {
  throwValidationError(validationResult);
}
```

### 4. Field-Level Validation Rules

| Field | Validation Rule | Max Length | Error Message Example |
|-------|-----------------|-----------|----------------------|
| `full_name` | Non-empty, not all numbers, no special char limits | 300 | "Please enter a name." |
| `work_email` / `personal_email` | RFC 5322 email format | 254 | "Please enter a valid email address." |
| `work_phone` / `cell_phone` / `home_phone` | Contains digits, spaces, `+`, `-`, `()`, `.`, `x` (case-insensitive); min 7 digits; supports international format with country code (e.g., +31652670011) | unlimited | "Please enter a valid phone number." |
| `birthday` | ISO 8601 format YYYY-MM-DD; valid date; must not be in future | N/A | "Please enter a valid birthdate (YYYY-MM-DD, cannot be in the future)." |
| `website` | Valid URL or domain; protocol optional | unlimited | "Please enter a valid website URL." |
| `job_title` / `company` | Non-empty when required; no format check | 300 | "{Field} is required." (if required) |
| Address streets/cities/states | Non-empty when required | 100 | "{Field} is required." |
| `postal_code` | Alphanumeric + spaces/hyphens; min 3 chars | 20 | "Please enter a valid postal code." |
| `notes` | Non-empty when required | 1000 | "{Field} is required." |
| `photo` | Existing rules (separate from Zod) | 224 KB | "The photo is too large. Please choose a smaller image and try again." |

### 5. Error Response Behavior

For a single field validation failure, return:

```json
{
  "error": "Please enter a valid email address.",
  "invalidField": "work_email",
  "status": 422
}
```

For multiple field validation failures, return the **first** field's error (to avoid overwhelming the user with a list):

```json
{
  "error": "Work email is invalid. Please check and try again.",
  "invalidField": "work_email",
  "status": 422
}
```

The `invalidField` property allows the frontend to highlight or focus the specific field without requiring additional parsing. Frontend can iterate through validation results programmatically if it wants richer per-field error details, but the API returns a single user-facing message by default.

---

## Implementation Plan

| File | Change | Effort |
|------|--------|--------|
| `src/api/package.json` | Add `zod` dependency | Trivial |
| `src/api/src/lib/validators/field-validators.ts` | Create new validation schema module | Medium |
| `src/api/src/services/validate-form-submission.ts` | Create new validation service | Medium |
| `src/api/src/services/answer-form.ts` | Replace `validateFields()` call with new service | Small |
| `src/api/src/services/answer-form.test.ts` | Add test cases for validation | Medium |
| `src/shared/src/types/api.ts` | (Optional) Export validation result types if frontend uses them | Small |

---

## Technical Notes

### Why Zod?

- **Type-safe**: Schemas are runtime validators + TypeScript types.
- **Clear error messages**: Customizable per rule.
- **Composable**: Reusable schemas for common patterns (email, phone, etc.).
- **Lightweight**: ~8 KB minified for backend use; no heavy dependencies.
- **Active maintenance**: Well-supported and widely used in TS ecosystems.

### vCard Compliance

- Phone numbers: vCard `TEL` property accepts any text; we enforce reasonable format for practical use (7+ digits).
- Email: vCard `EMAIL` property expects RFC 5322 format; we enforce.
- Birthday: vCard `BDAY` property prefers `YYYY-MM-DD` per RFC 6350; we enforce.
- URL: vCard `URL` property accepts URIs; we allow bare domains + common formats.
- Address: vCard `ADR` property is semi-structured; we validate components individually.

### Frontend Coordination

- **Backend returns structured error with invalidField** — Response includes `{ "error": "...", "invalidField": "fieldKey", "status": 422 }` so frontend can easily highlight the specific field.
- **Backend returns first error only** to avoid overwhelming UI with lists. For multiple validation errors, only the first failure is reported.
- **Frontend can implement progressive validation** — For Phase 2, move validators to `src/shared/` and implement real-time field validation as user types.
- **Country codes preserved** — Phone numbers retain country codes (e.g., +31652670011) in the vCard for international compatibility.

### Testing Strategy

```typescript
// Test cases to include:
describe('validateFormSubmission', () => {
  it('accepts valid email addresses');
  it('rejects malformed emails');
  it('accepts valid phone numbers (various formats)');
  it('rejects phone numbers with < 7 digits');
  it('accepts valid dates in YYYY-MM-DD format');
  it('rejects invalid dates');
  it('enforces required fields');
  it('allows optional fields to be empty');
  it('rejects unknown field keys');
  it('returns first error for multiple failures');
  it('validates each field type independently');
});
```

---

## Acceptance Criteria

- [ ] New `field-validators.ts` module created with Zod schemas for all field types.
- [ ] New `validate-form-submission.ts` service created with structured validation result.
- [ ] `answer-form.ts` updated to use new validation service.
- [ ] Error messages are non-technical and user-friendly (no regex patterns, no field names in generic messages).
- [ ] All validation rules from the table above are enforced.
- [ ] Tests cover happy path (valid data) and error cases (invalid email, phone, date, etc.).
- [ ] Required field validation is tested (missing required fields rejected).
- [ ] Optional field validation is tested (empty optional fields accepted).
- [ ] Unknown field keys are rejected with appropriate error.
- [ ] Phone number format validation accepts common formats (+1-555-123-4567, (555) 123-4567, etc.).
- [ ] Birthday validation accepts ISO 8601 YYYY-MM-DD only and validates date semantics.
- [ ] URL validation accepts bare domains (example.com) and full URLs (https://example.com).
- [ ] Photo validation logic remains unchanged (separate from Zod).
- [ ] First error message is returned to frontend (not a list of all errors).
- [ ] Endpoint response includes `invalidField` for frontend field highlighting — format: `{ "error": "...", "invalidField": "fieldKey", "status": 422 }`.

---

## Future Improvements (Out of Scope)

1. **Shared validation** — Phase 2: Move validators to `src/shared/` for frontend use (enables consistent client-side validation).
2. **Frontend progressive validation** — Real-time field validation on the form as user types (frontend feature).
3. **Phone number parsing** — Use `libphonenumber-js` if more sophisticated phone validation/normalization is needed (currently preserves country codes).
4. **Internationalization** — Error messages in multiple languages.
5. **Country-aware postal code validation** — Per-country postal code format validation (currently accepts most formats).
6. **Advanced URL validation** — DNS lookup to verify domains exist.

---

## Decisions Made

### Review Questions

1. ✅ **Use Zod** — Confirmed. Type-safe, clear error messages, lightweight.
2. ✅ **Add invalidField to response** — Confirmed. Enables frontend to highlight the specific field.
3. ✅ **Phone number format** — Minimum 7 digits with country code support (e.g., +31652670011 for Dutch). Country code counts toward digit total.
4. ✅ **Reject future birthdates** — Confirmed. Validation will reject dates >= today.
5. ❌ **URL bare domains** — Rejects bare domains (localhost, example). Not changing; only accepts valid URLs/domains with TLD.
6. ✅ **Move validators to shared** — Confirmed. Will be noted as Phase 2 improvement.

### Suggested Improvements — Final Decisions

1. ✅ **Add invalidField to response** — Implemented. See error response section above.
2. ❌ **Normalize phone numbers** — Skipped. Country codes must be preserved in vCard contact for international compatibility.
3. ❌ **Country-aware postal code** — Deferred. Accept any format for MVP; revisit if international postal validation becomes a pain point.
4. ✅ **Length validation feedback** — Implemented. Error messages will include current/max (e.g., "Notes is too long (1050/1000 characters).").
5. ❌ **Pre-validation on form load** — Deferred. Frontend feature; will be addressed in frontend validation improvements.
6. ❌ **Partial submission recovery** — Deferred. Frontend feature; will be addressed in frontend validation improvements.

---

## Related Issues

- RFC 5322 (email format)
- RFC 6350 (vCard 4.0 standard)
- ISO 8601 (date format)
- UX: Non-technical error messages best practices
