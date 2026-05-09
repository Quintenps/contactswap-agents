/**
 * MailerSend HTTP API client
 *
 * Thin fetch-based wrapper. Cloudflare Workers have no Node.js net/tls/smtp,
 * so all email delivery must go through the MailerSend REST API.
 *
 * Docs: https://developers.mailersend.com/api/v1/email.html
 */

const MAILERSEND_API_BASE = 'https://api.mailersend.com/v1';

export interface MailerSendAddress {
  email: string;
  name?: string;
}

export interface MailerSendAttachment {
  /** Base64-encoded file content */
  content: string;
  filename: string;
  disposition: 'attachment' | 'inline';
}

export interface MailerSendEmailPayload {
  from: MailerSendAddress;
  to: MailerSendAddress[];
  subject: string;
  text: string;
  attachments?: MailerSendAttachment[];
}

export interface MailerSendResult {
  success: true;
  messageId: string | null;
}

export class MailerSendError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = 'MailerSendError';
  }
}

export async function sendEmail(
  apiKey: string,
  payload: MailerSendEmailPayload,
): Promise<MailerSendResult> {
  const response = await fetch(`${MAILERSEND_API_BASE}/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  // MailerSend returns 202 Accepted on success (no body)
  if (response.status === 202) {
    const messageId = response.headers.get('X-Message-Id');
    return { success: true, messageId };
  }

  const body = await response.text();
  throw new MailerSendError(
    `MailerSend request failed with status ${response.status}`,
    response.status,
    body,
  );
}
