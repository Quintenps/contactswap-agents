/**
 * ContactSwap API - Cloudflare Worker
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { healthRoutes } from './routes/health';
import { formRoutes } from './routes/forms';
import { configRoutes } from './routes/config';
import { API_SECRET_HEADER } from './constants/http';
import type { Env } from './types/env';

type AppEnv = {
  Bindings: Env;
};

const app = new Hono<AppEnv>();
const LOCAL_DEV_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function parseHttpOrigin(urlValue: string): string | null {
  try {
    const parsed = new URL(urlValue);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin === 'null' ? null : parsed.origin;
  } catch {
    return null;
  }
}

function ensureVaryOrigin(existingVary: string | null): string {
  if (!existingVary) {
    return 'Origin';
  }

  const hasOrigin = existingVary
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .includes('origin');

  return hasOrigin ? existingVary : `${existingVary}, Origin`;
}

app.use('*', logger());
app.use('/v1/*', async (c, next) => {
  await next();

  if (c.req.header('Origin')) {
    c.header('Vary', ensureVaryOrigin(c.res.headers.get('Vary')));
  }
});
app.use('/v1/*', cors({
  origin: (origin, c) => {
    const allowedOrigins = new Set(LOCAL_DEV_ORIGINS);

    const frontendOrigin = parseHttpOrigin(c.env.FRONTEND_APP_URL);
    if (frontendOrigin) {
      allowedOrigins.add(frontendOrigin);
    }

    if (!origin) {
      return null;
    }

    return allowedOrigins.has(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', API_SECRET_HEADER],
}));

app.route('/health', healthRoutes);
app.route('/v1/forms', formRoutes);
app.route('/v1/config', configRoutes);

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

app.onError((err, c) => {
  console.error('Unhandled API error', { path: c.req.path, err });
  return c.json({ error: 'Internal Server Error - ', message: err.message }, 500);
});

export default app;

export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  // Cleanup cron job
}

