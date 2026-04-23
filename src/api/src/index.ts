/**
 * ContactSwap API - Cloudflare Worker
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRoutes } from './routes/health';
import { formRoutes } from './routes/forms';
import type { Env } from './types/env';

type AppEnv = {
  Bindings: Env;
};

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use('/v1/*', cors({
  origin: ['https://contactswap.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-secret'],
}));

app.route('/health', healthRoutes);
app.route('/v1/forms', formRoutes);

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

app.onError((err, c) => {
  console.error('Unhandled API error', { path: c.req.path, err });
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;

export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  // Cleanup cron job
}

