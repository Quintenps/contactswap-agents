/**
 * Form Types
 */

import type { FieldConfig } from './template';

export type FormStatus = 'pending' | 'completed' | 'expired';

export interface Form {
  id: string;
  token: string;
  templateId: string | null;
  fieldConfig: FieldConfig[];
  originalContactUrl: string;
  originalContactName: string;
  status: FormStatus;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string;
}

export interface FormData {
  token: string;
  contactName: string;
  fields: FieldConfig[];
  prefilled: Record<string, string>;
  status: FormStatus;
  expiresAt: string;
}

export interface FormSubmission {
  fields: Record<string, string>;
  photo?: string;
}

