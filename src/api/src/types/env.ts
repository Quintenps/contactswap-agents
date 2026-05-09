/**
 * Cloudflare Worker Environment Bindings
 */

export interface Env {
  D1: D1Database;
  R2: R2Bucket;
  API_SECRET?: string;
  DEFAULT_API_SECRET?: string;
  PUBLIC_APP_URL: string;
  MAILERSEND_API_KEY: string;
  MAILERSEND_EMAIL_TO: string;
  /** Verified MailerSend sender address, e.g. no-reply@test-zxk54v8nooqljy6v.mlsender.net */
  MAILERSEND_EMAIL_FROM: string;
  /** Set to "true" to enable email delivery. Any other value disables it. */
  MAILERSEND_ENABLED: string;
}

