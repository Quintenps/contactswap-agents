/**
 * Service: answer form
 *
 * Validates the submitted fields against the form's stored field_config snapshot,
 * generates a .vcf contact from the submission, and atomically marks the form completed.
 */

import type { FieldConfig, FieldKey } from '@contactswap/shared';
import type { AnswerFormResponse } from '@contactswap/shared';
import { generateVcf } from '../lib/vcf-generator';
import { getFormByToken, markFormCompleted } from '../repositories/form-repository';
import { sendFormAnswerEmail } from './send-form-answer-email';

/**
 * Photo size constraints (must align with SPEC.md and feature-006)
 * - Max 55,000 base64 characters (approximately 40 KB decoded image bytes)
 * - Equivalent to processed 200x200 JPEG at 80% quality
 */
const MAX_PHOTO_DATA_URI_CHARS = 55_000;

const SUPPORTED_FIELD_KEYS = new Set<string>([
  'full_name',
  'work_email',
  'personal_email',
  'work_phone',
  'cell_phone',
  'home_phone',
  'work_address',
  'home_address',
  'company',
  'job_title',
  'website',
  'birthday',
  'notes',
  'photo',
]);

export class AnswerFormError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 409 | 410 | 422,
  ) {
    super(message);
    this.name = 'AnswerFormError';
  }
}

export interface AnswerFormInput {
  token: string;
  fields: Record<string, string>;
  photo?: string | null;
}

export interface AnswerFormEmailConfig {
  apiKey: string;
  mailFrom: string;
  ownerEmail: string;
}

export async function answerForm(
  db: D1Database,
  input: AnswerFormInput,
  emailConfig?: AnswerFormEmailConfig,
): Promise<AnswerFormResponse> {
  const form = await getFormByToken(db, input.token);

  if (!form) {
    throw new AnswerFormError('Form not found', 404);
  }

  const now = new Date().toISOString();

  if (form.expiresAt < now) {
    throw new AnswerFormError('Form has expired', 410);
  }

  if (form.status === 'completed') {
    throw new AnswerFormError('Form has already been submitted', 409);
  }

  validateFields(input.fields, form.fields);

  // Build a Contact from submitted values — only supported FieldKey values land here
  const contact = buildContact(input.fields);

  // Parse photo from data URI if provided
  let photoBase64: string | null = null;
  let photoMimeType: string | null = null;
  if (input.photo) {
    const parsed = parsePhotoDataUri(input.photo);
    if (!parsed) {
      throw new AnswerFormError('photo must be a base64 data URI (image/jpeg or image/png)', 422);
    }
    photoBase64 = parsed.base64;
    photoMimeType = parsed.mimeType;
  }

  const vcf = generateVcf({ contact, photoBase64, photoMimeType });

  // Atomically mark completed — guards against race conditions
  const completed = await markFormCompleted(db, input.token, now);

  if (!completed) {
    // Another request beat us: re-fetch to determine the right error
    const latest = await getFormByToken(db, input.token);
    if (!latest || latest.expiresAt < now) {
      throw new AnswerFormError('Form has expired', 410);
    }
    throw new AnswerFormError('Form has already been submitted', 409);
  }

  // Resilient email delivery: form completion is authoritative.
  // A delivery failure is logged but does not affect the response.
  if (emailConfig) {
    await sendFormAnswerEmail({
      apiKey: emailConfig.apiKey,
      mailFrom: emailConfig.mailFrom,
      ownerEmail: emailConfig.ownerEmail,
      contactName: contact.fullName || 'Unknown',
      vcf,
      formToken: input.token,
    });
  } else {
    console.warn('[answer-form] emailConfig not provided — skipping email delivery');
  }

  return {
    success: true,
    completedAt: now,
  };
}

function validateFields(
  submitted: Record<string, string>,
  fieldConfig: FieldConfig[],
): void {
  // Reject unknown field keys
  for (const key of Object.keys(submitted)) {
    if (!SUPPORTED_FIELD_KEYS.has(key)) {
      throw new AnswerFormError(`Unknown field: ${key}`, 422);
    }
  }

  // Enforce required fields from the stored snapshot
  for (const config of fieldConfig) {
    if (!config.required) continue;
    const value = submitted[config.fieldKey as string]?.trim();
    if (!value) {
      throw new AnswerFormError(`Required field is missing or empty: ${config.fieldKey}`, 422);
    }
  }
}

function buildContact(fields: Record<string, string>) {
  return {
    fullName: fields['full_name'] ?? '',
    firstName: undefined as string | undefined,
    lastName: undefined as string | undefined,
    workEmail: fields['work_email'] || undefined,
    personalEmail: fields['personal_email'] || undefined,
    workPhone: fields['work_phone'] || undefined,
    cellPhone: fields['cell_phone'] || undefined,
    homePhone: fields['home_phone'] || undefined,
    workAddress: fields['work_address'] || undefined,
    homeAddress: fields['home_address'] || undefined,
    company: fields['company'] || undefined,
    jobTitle: fields['job_title'] || undefined,
    website: fields['website'] || undefined,
    birthday: fields['birthday'] || undefined,
    notes: fields['notes'] || undefined,
  };
}

interface PhotoPayload {
  base64: string;
  mimeType: string;
}

function parsePhotoDataUri(dataUri: string): PhotoPayload | null {
  const match = dataUri.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/is);
  if (!match) return null;

  const base64 = match[2].replace(/\s/g, '');

  if (base64.length > MAX_PHOTO_DATA_URI_CHARS) {
    throw new AnswerFormError(
      `photo data URI exceeds maximum size (${base64.length} > ${MAX_PHOTO_DATA_URI_CHARS} chars)`,
      422,
    );
  }

  return {
    mimeType: match[1].toLowerCase(),
    base64,
  };
}
