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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
const API_SECRET_HEADER = 'x-api-secret';

export const API_SECRET_STORAGE_KEY = 'contactswap_api_secret';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
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
    ? 'The server is unavailable right now.'
    : 'Request failed.';

  try {
    const payload = (await response.json()) as { error?: string };
    return new ApiClientError(payload.error || fallbackMessage, response.status);
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
  answerPublicForm(token: string, submission: FormSubmission) {
    return requestJson<AnswerFormResponse>(`/v1/forms/${encodeURIComponent(token)}/answer`, {
      method: 'POST',
      body: JSON.stringify(submission),
      headers: {
        'Content-Type': 'application/json',
      },
    });
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

