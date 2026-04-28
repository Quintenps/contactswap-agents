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
  OWNER_EMAIL: string;
}

