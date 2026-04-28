/**
 * Middleware: require-api-secret
 *
 * Protects admin endpoints by verifying the `x-api-secret` header
 * against the API_SECRET binding. Fails closed — any missing or
 * non-matching value results in a 401.
 */

import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
import { API_SECRET_HEADER } from '../constants/http';

type AppEnv = { Bindings: Env };

export const requireApiSecret: MiddlewareHandler<AppEnv> = async (c, next) => {
  const expectedSecret = c.env.API_SECRET?.trim() || c.env.DEFAULT_API_SECRET?.trim();
  const incoming = c.req.header(API_SECRET_HEADER);
  if (!incoming || !expectedSecret || incoming !== expectedSecret) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};
