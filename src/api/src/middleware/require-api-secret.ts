/**
 * Middleware: require-api-secret
 *
 * Protects admin endpoints by verifying the `x-api-secret` header
 * against the API_SECRET binding. Fails closed — any missing or
 * non-matching value results in a 401.
 */

import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';

type AppEnv = { Bindings: Env };

export const requireApiSecret: MiddlewareHandler<AppEnv> = async (c, next) => {
  const incoming = c.req.header('x-api-secret');
  if (!incoming || incoming !== c.env.API_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};
