/**
 * Config routes
 *
 * Admin routes (require x-api-secret):
 *   PUT  /v1/config/owner-card  — upload admin owner .vcf to R2
 *   GET  /v1/config/owner-card  — check whether an owner card is stored
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireApiSecret } from '../middleware/require-api-secret';
import { putOwnerVcf } from '../repositories/contact-file-repository';

type AppEnv = { Bindings: Env };

export const configRoutes = new Hono<AppEnv>();

configRoutes.put('/owner-card', requireApiSecret, async (c) => {
  const contentType = c.req.header('content-type') ?? '';
  if (!contentType.startsWith('text/vcard') && !contentType.startsWith('text/plain')) {
    return c.json({ error: 'Content-Type must be text/vcard' }, 415);
  }

  const body = await c.req.text();
  if (!body.trimStart().startsWith('BEGIN:VCARD')) {
    return c.json({ error: 'Body must be a valid VCF (must start with BEGIN:VCARD)' }, 422);
  }

  await putOwnerVcf(c.env.R2, body);

  return c.json({ stored: true }, 200);
});

configRoutes.get('/owner-card', requireApiSecret, async (c) => {
  const obj = await c.env.R2.head('owner/card.vcf');
  if (!obj) {
    return c.json({ configured: false }, 200);
  }
  return c.json({ configured: true, updatedAt: obj.uploaded.toISOString() }, 200);
});
