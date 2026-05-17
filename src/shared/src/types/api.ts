/**
 * API Types
 */

import type { Form, FormStatus } from './form';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
}

export interface ListFormsResponse {
  forms: Pick<Form, 'id' | 'token' | 'originalContactName' | 'status' | 'createdAt' | 'completedAt' | 'expiresAt'>[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListFormsQuery {
  status?: FormStatus;
  limit?: number;
  offset?: number;
}

export interface CreateFormResponse {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

export interface ApiValidationErrorItem {
  field: string;
  message: string;
}

export interface ApiValidationErrorResponse extends ApiError {
  invalidField?: string;
  errors?: ApiValidationErrorItem[];
}

export interface AnswerFormResponse {
  success: true;
  completedAt: string;
  exchange: ExchangeBlock;
}

export interface ExchangeBlock {
  retrieveToken: string;
  expiresAt: string;
}

export interface OwnerCardStatusResponse {
  configured: boolean;
  updatedAt?: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  fields: Array<{ fieldKey: string; required: boolean }>;
}

export interface ListTemplatesResponse {
  templates: TemplateSummary[];
}

