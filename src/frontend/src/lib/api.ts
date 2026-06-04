/**
 * API Client
 */

import type {
  AnswerFormResponse,
  CreateFormResponse,
  FormData,
  FormSubmission,
  ListTemplatesResponse,
  ListFormsQuery,
  ListFormsResponse,
  OwnerCardStatusResponse,
} from '@contactswap/shared';

const DEFAULT_LOCAL_API_URL = 'http://localhost:8787';
const API_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_LOCAL_API_URL;
const DEFAULT_LOCAL_FRONTEND_URL = 'http://localhost:3000';
const API_SECRET_HEADER = 'x-api-secret';

export const API_SECRET_STORAGE_KEY = 'contactswap_api_secret';

export type ApiValidationFieldError = {
  field: string;
  message: string;
};

export type ApiValidationError = {
  status: 422;
  error: string;
  invalidField?: string;
  errors?: ApiValidationFieldError[];
};

export type AnswerPublicFormResponse = Omit<AnswerFormResponse, 'totalContactSwaps'> & {
  totalContactSwaps?: number;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly validation?: ApiValidationError,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  apiSecret?: string;
  body?: BodyInit;
  headers?: HeadersInit;
};

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    body: options.body,
    headers: buildHeaders(options),
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as T;
}

async function buildApiError(response: Response): Promise<ApiClientError> {
  const fallbackMessage = response.status >= 500
    ? 'Something went wrong on our side. Please try again in a moment.'
    : 'Something went wrong. Please try again.';

  try {
    const payload = (await response.json()) as {
      error?: unknown;
      status?: unknown;
      invalidField?: unknown;
      errors?: unknown;
    };

    const message = typeof payload.error === 'string' && payload.error.trim().length > 0
      ? payload.error
      : fallbackMessage;

    const validation = response.status === 422
      ? {
          status: 422 as const,
          error: message,
          invalidField: typeof payload.invalidField === 'string' ? payload.invalidField : undefined,
          errors: Array.isArray(payload.errors)
            ? payload.errors
                .filter((entry): entry is { field: unknown; message: unknown } => (
                  typeof entry === 'object' && entry !== null
                ))
                .map((entry) => ({
                  field: typeof entry.field === 'string' ? entry.field : '',
                  message: typeof entry.message === 'string' ? entry.message : '',
                }))
                .filter((entry) => entry.field.trim().length > 0 && entry.message.trim().length > 0)
            : undefined,
        }
      : undefined;

    return new ApiClientError(message, response.status, validation);
  } catch {
    return new ApiClientError(fallbackMessage, response.status);
  }
}

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers(options.headers);

  if (options.apiSecret) {
    headers.set(API_SECRET_HEADER, options.apiSecret);
  }

  return headers;
}

function toQueryString(query: ListFormsQuery = {}): string {
  const params = new URLSearchParams();

  if (query.limit !== undefined) {
    params.set('limit', String(query.limit));
  }

  if (query.offset !== undefined) {
    params.set('offset', String(query.offset));
  }

  if (query.status) {
    params.set('status', query.status);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function resolveFrontendBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

  if (configuredBaseUrl && configuredBaseUrl.trim().length > 0) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return normalizeBaseUrl(window.location.origin);
  }

  return DEFAULT_LOCAL_FRONTEND_URL;
}

function parseTotalContactSwaps(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return undefined;
  }

  return value;
}

export const api = {
  baseUrl: API_URL,
  verifyApiSecret(apiSecret: string) {
    return requestJson<OwnerCardStatusResponse>('/v1/config/owner-card', {
      apiSecret,
    });
  },
  listTemplates(apiSecret: string) {
    return requestJson<ListTemplatesResponse>('/v1/config/templates', {
      apiSecret,
    });
  },
  listForms(apiSecret: string, query: ListFormsQuery = {}) {
    return requestJson<ListFormsResponse>(`/v1/forms${toQueryString(query)}`, {
      apiSecret,
    });
  },
  uploadOwnerCard(apiSecret: string, vcfText: string) {
    return requestJson<{ stored: true }>('/v1/config/owner-card', {
      method: 'PUT',
      apiSecret,
      body: vcfText,
      headers: {
        'Content-Type': 'text/vcard',
      },
    });
  },
  createForm(apiSecret: string, file: File, templateId: string) {
    const body = new FormData();
    body.set('vcf', file);
    body.set('templateId', templateId);

    return requestJson<CreateFormResponse>('/v1/forms', {
      method: 'POST',
      apiSecret,
      body,
    });
  },
  deleteForm(apiSecret: string, formId: string) {
    return fetch(`${API_URL}/v1/forms/${formId}`, {
      method: 'DELETE',
      headers: buildHeaders({ apiSecret }),
    }).then(async (response) => {
      if (!response.ok) {
        throw await buildApiError(response);
      }
    });
  },
  getPublicForm(token: string) {
    return requestJson<FormData>(`/v1/forms/${encodeURIComponent(token)}`);
  },
  getPublicFormUrl(token: string) {
    const safeToken = encodeURIComponent(token);
    return `${resolveFrontendBaseUrl()}/forms/${safeToken}`;
  },
  answerPublicForm(token: string, submission: FormSubmission) {
    return requestJson<AnswerFormResponse>(`/v1/forms/${encodeURIComponent(token)}/answer`, {
      method: 'POST',
      body: JSON.stringify(submission),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((response): AnswerPublicFormResponse => ({
      ...response,
      totalContactSwaps: parseTotalContactSwaps(response.totalContactSwaps),
    }));
  },
  getReturnCardDownloadUrl(token: string, retrieveToken: string) {
    const safeToken = encodeURIComponent(token);
    const safeRetrieveToken = encodeURIComponent(retrieveToken);
    return `${API_URL}/v1/forms/${safeToken}/return-card?rt=${safeRetrieveToken}`;
  },
  getReturnCardQrUrl(token: string, retrieveToken: string) {
    const safeToken = encodeURIComponent(token);
    const safeRetrieveToken = encodeURIComponent(retrieveToken);
    return `${API_URL}/v1/forms/${safeToken}/return-card-qr?rt=${safeRetrieveToken}`;
  },
};

