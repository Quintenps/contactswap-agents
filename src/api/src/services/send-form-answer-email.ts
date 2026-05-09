/**
 * Service: send form answer email
 *
 * Builds and sends the admin notification email after a successful form submission.
 * Attaches the generated VCF as a file.
 *
 * Failure policy (resilient / Option B):
 *   - Form completion is authoritative; it is already persisted before this runs.
 *   - If MailerSend returns an error, log it and let the caller decide whether to
 *     surface the failure or silently continue. Do NOT throw for transient errors.
 */

import { sendEmail, MailerSendError } from '../lib/mailersend';

export interface SendFormAnswerEmailInput {
  /** MailerSend API key from env */
  apiKey: string;
  /** Verified sender address from env (e.g. no-reply@test-zxk54v8nooqljy6v.mlsender.net) */
  mailFrom: string;
  /** Admin recipient address from env (MAILERSEND_EMAIL_TO) */
  ownerEmail: string;
  /** Contact's display name — used in subject and email body */
  contactName: string;
  /** Generated VCF string to attach */
  vcf: string;
  /** Form token — used for logging correlation only */
  formToken: string;
}

export interface SendFormAnswerEmailResult {
  delivered: boolean;
  messageId: string | null;
  /** Set when delivery failed but was handled gracefully */
  error?: string;
}

/**
 * Sanitize a name for use as a filename component.
 * Keeps letters, digits, hyphens, and underscores; replaces everything else with `-`.
 */
function toSafeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'contact';
}

export async function sendFormAnswerEmail(
  input: SendFormAnswerEmailInput,
): Promise<SendFormAnswerEmailResult> {
  const { apiKey, mailFrom, ownerEmail, contactName, vcf, formToken } = input;

  const safeFilename = `${toSafeFilename(contactName)}.vcf`;

  // VCF is plain text — base64-encode for the attachment payload
  const vcfBase64 = btoa(unescape(encodeURIComponent(vcf)));

  const emailBody =
    `${contactName} has filled in their contact form.\n\nTheir updated contact file is attached.\n\n—\nContactSwap`;

  try {
    const result = await sendEmail(apiKey, {
      from: { email: mailFrom, name: 'ContactSwap' },
      to: [{ email: ownerEmail }],
      subject: `ContactSwap: ${contactName} updated their info`,
      text: emailBody,
      attachments: [
        {
          content: vcfBase64,
          filename: safeFilename,
          disposition: 'attachment',
        },
      ],
    });

    console.log(`[send-form-answer-email] Delivered for token=${formToken} messageId=${result.messageId}`);

    return { delivered: true, messageId: result.messageId };
  } catch (err) {
    if (err instanceof MailerSendError) {
      console.error(
        `[send-form-answer-email] MailerSend error for token=${formToken} status=${err.status} body=${err.body}`,
      );
      return { delivered: false, messageId: null, error: `MailerSend ${err.status}` };
    }

    // Unexpected network/runtime error
    console.error(`[send-form-answer-email] Unexpected error for token=${formToken}`, err);
    return { delivered: false, messageId: null, error: 'Unexpected error during email delivery' };
  }
}
