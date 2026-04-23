/**
 * Service: create form from uploaded VCF
 */

import type { CreateFormResponse, Contact } from '@contactswap/shared';
import type { Env } from '../types/env';
import { mimeTypeToExt, parseVcf } from '../lib/vcf-parser';
import { putContactPhoto, putOriginalVcf } from '../repositories/contact-file-repository';
import { insertFormRecord } from '../repositories/form-repository';
import { findTemplateById } from '../repositories/template-repository';

export class CreateFormServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 422,
  ) {
    super(message);
    this.name = 'CreateFormServiceError';
  }
}

export interface CreateFormInput {
  templateId: string;
  vcfText: string;
}

export async function createForm(env: Env, input: CreateFormInput): Promise<CreateFormResponse> {
  const vcfText = input.vcfText.trim();
  if (!vcfText) {
    throw new CreateFormServiceError('vcf field is required', 422);
  }

  const template = await loadTemplate(env, input.templateId);
  const { contact, photoBase64, photoMimeType } = parseVcf(vcfText);

  if (!contact.fullName) {
    throw new CreateFormServiceError('VCF must contain a full name (FN)', 422);
  }

  const token = generateSecureToken();
  const id = crypto.randomUUID();
  const originalContactKey = `forms/${token}/original.vcf`;
  const expiresAt = buildExpiryIso();
  const prefilled = buildPrefilled(contact);

  await uploadPhotoIfPresent(env, token, photoBase64, photoMimeType);
  await putOriginalVcf(env.R2, originalContactKey, input.vcfText);

  await insertFormRecord(env.DB, {
    id,
    token,
    templateId: input.templateId,
    fieldConfigJson: template.fields,
    prefilledJson: JSON.stringify(prefilled),
    originalContactKey,
    originalContactName: contact.fullName,
    expiresAt,
  });

  return {
    id,
    token,
    url: buildFormUrl(env.PUBLIC_APP_URL, token),
    expiresAt,
  };
}

async function loadTemplate(env: Env, templateId: string) {
  const template = await findTemplateById(env.DB, templateId);

  if (!template) {
    throw new CreateFormServiceError('Template not found', 404);
  }

  return template;
}

async function uploadPhotoIfPresent(
  env: Env,
  token: string,
  photoBase64: string | null,
  photoMimeType: string | null,
): Promise<void> {
  if (!photoBase64 || !photoMimeType) {
    return;
  }

  const ext = mimeTypeToExt(photoMimeType);
  const photoBytes = Uint8Array.from(atob(photoBase64), (char) => char.charCodeAt(0));

  await putContactPhoto(env.R2, `forms/${token}/photo.${ext}`, photoBytes, photoMimeType);
}

function buildPrefilled(contact: Contact): Record<string, string> {
  const prefilled: Record<string, string> = {};

  if (contact.fullName) prefilled.full_name = contact.fullName;
  if (contact.workEmail) prefilled.work_email = contact.workEmail;
  if (contact.personalEmail) prefilled.personal_email = contact.personalEmail;
  if (contact.workPhone) prefilled.work_phone = contact.workPhone;
  if (contact.cellPhone) prefilled.cell_phone = contact.cellPhone;
  if (contact.homePhone) prefilled.home_phone = contact.homePhone;
  if (contact.workAddress) prefilled.work_address = contact.workAddress;
  if (contact.homeAddress) prefilled.home_address = contact.homeAddress;
  if (contact.company) prefilled.company = contact.company;
  if (contact.jobTitle) prefilled.job_title = contact.jobTitle;
  if (contact.website) prefilled.website = contact.website;
  if (contact.birthday) prefilled.birthday = contact.birthday;
  if (contact.notes) prefilled.notes = contact.notes;

  return prefilled;
}

function generateSecureToken(): string {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(tokenBytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function buildExpiryIso(): string {
  const now = new Date();
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function buildFormUrl(publicAppUrl: string, token: string): string {
  const normalizedBaseUrl = publicAppUrl.replace(/\/$/, '');
  return `${normalizedBaseUrl}/form/${token}`;
}
