/**
 * Cloudflare Worker Environment Bindings
 */

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  API_SECRET: string;
  MAILERSEND_API_KEY: string;
  OWNER_EMAIL: string;
}

