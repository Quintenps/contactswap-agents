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
import {
  getFormByToken,
  markFormCompleted,
} from '../repositories/form-repository';
import {
  getFormIdByToken,
  insertExchangeToken,
} from '../repositories/exchange-token-repository';

/** Exchange token TTL in milliseconds (30 minutes) */
const EXCHANGE_TOKEN_TTL_MS = 30 * 60 * 1000;

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
  // Issue short-lived exchange token so the recipient can retrieve the admin card
  const exchangeToken = await issueExchangeToken(db, input.token, now);

  return {
    success: true,
    completedAt: now,
    exchange: {
      retrieveToken: exchangeToken.rawToken,
      expiresAt: exchangeToken.expiresAt,
    },
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
    workAddressStreet: fields['work_address_street'] || undefined,
    workAddressCity: fields['work_address_city'] || undefined,
    workAddressState: fields['work_address_state'] || undefined,
    workAddressPostalCode: fields['work_address_postal_code'] || undefined,
    workAddressCountry: fields['work_address_country'] || undefined,
    homeAddress: fields['home_address'] || undefined,
    homeAddressStreet: fields['home_address_street'] || undefined,
    homeAddressCity: fields['home_address_city'] || undefined,
    homeAddressState: fields['home_address_state'] || undefined,
    homeAddressPostalCode: fields['home_address_postal_code'] || undefined,
    homeAddressCountry: fields['home_address_country'] || undefined,
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

// ---------------------------------------------------------------------------
// Exchange token helpers
// ---------------------------------------------------------------------------

interface ExchangeTokenResult {
  rawToken: string;
  expiresAt: string;
}

async function issueExchangeToken(
  db: D1Database,
  formToken: string,
  now: string,
): Promise<ExchangeTokenResult> {
  const formId = await getFormIdByToken(db, formToken);
  if (!formId) {
    throw new Error('Could not find form id for completed form');
  }

  const rawBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Array.from(rawBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const hashBuffer = await crypto.subtle.digest('SHA-256', rawBytes);
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const expiresAt = new Date(Date.parse(now) + EXCHANGE_TOKEN_TTL_MS).toISOString();

  await insertExchangeToken(db, {
    id: crypto.randomUUID(),
    formId,
    exchangeTokenHash: tokenHash,
    expiresAt,
  });

  return { rawToken, expiresAt };
}
