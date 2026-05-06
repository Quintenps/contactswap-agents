/**
 * Forms routes
 *
 * Admin routes (require x-api-secret):
 *   GET    /v1/forms          — list forms
 *   POST   /v1/forms          — create a form from a VCF upload
 *   DELETE /v1/forms/:id      — delete a form
 *
 * Public routes (no auth):
 *   GET    /v1/forms/:token   — retrieve form data by token
 */

import { Hono } from 'hono';
import { z } from 'zod';
import qrcode from 'qrcode-generator';
import type { Env } from '../types/env';
import { requireApiSecret } from '../middleware/require-api-secret';
import { createForm, CreateFormServiceError } from '../services/create-form';
import { deleteFormById, getFormByToken, getFormForDelete, listFormRecords } from '../repositories/form-repository';
import { deleteObjectsByPrefix, getOwnerVcf } from '../repositories/contact-file-repository';
import { answerForm, AnswerFormError } from '../services/answer-form';
import { getExchangeTokenByHash, getFormIdByToken } from '../repositories/exchange-token-repository';

type AppEnv = { Bindings: Env };

export const formRoutes = new Hono<AppEnv>();

const createFormSchema = z.object({
  templateId: z.string().uuid(),
  vcf: z
    .instanceof(File, { message: 'vcf field is required and must be a file' })
    .refine((file: File) => file.size > 0, 'vcf field is required'),
});

const listFormsQuerySchema = z.object({
  limit: z.coerce
    .number({ message: 'limit must be a number' })
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(20),
  offset: z.coerce
    .number({ message: 'offset must be a number' })
    .int('offset must be an integer')
    .min(0, 'offset must be at least 0')
    .default(0),
  status: z.enum(['pending', 'completed', 'expired']).optional(),
});

const formIdParamSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

const formTokenParamSchema = z.object({
  token: z
    .string()
    .regex(/^[0-9a-f]{64}$/, 'token must be a 64-character lowercase hex string'),
});

formRoutes.get('/', requireApiSecret, async (c) => {
  const parsed = listFormsQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json({ error: issue?.message ?? 'Invalid query params' }, 422);
  }

  const { limit, offset, status } = parsed.data;

  const response = await listFormRecords(c.env.D1, {
    limit,
    offset,
    status,
  });

  return c.json(response, 200);
});

formRoutes.post(
  '/',
  requireApiSecret,
  async (c) => {
    const formData = await c.req.formData();
    const parsed = createFormSchema.safeParse({
      templateId: formData.get('templateId'),
      vcf: formData.get('vcf'),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return c.json({ error: issue?.message ?? 'Invalid form payload' }, 422);
    }

    const { templateId, vcf } = parsed.data;

    try {
      const response = await createForm(c.env, {
        templateId,
        vcfText: await vcf.text(),
      });

      return c.json(response, 201);
    } catch (error) {
      if (error instanceof CreateFormServiceError) {
        return c.json({ error: error.message }, error.status);
      }

      throw error;
    }
  },
);

formRoutes.delete('/:id', requireApiSecret, async (c) => {
  const parsed = formIdParamSchema.safeParse(c.req.param());

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json({ error: issue?.message ?? 'Invalid form id' }, 422);
  }

  const { id } = parsed.data;

  const form = await getFormForDelete(c.env.D1, id);
  if (!form) {
    return c.json({ error: 'Form not found' }, 404);
  }

  await deleteFormById(c.env.D1, id);

  try {
    await deleteObjectsByPrefix(c.env.R2, `forms/${form.token}/`);
  } catch (error) {
    // Keep the endpoint durable: deletion of DB record is authoritative.
    console.error('Failed to clean up R2 form objects after DB delete', {
      formId: id,
      token: form.token,
      error,
    });
  }

  return c.body(null, 204);
});

formRoutes.get('/:token', async (c) => {
  const parsed = formTokenParamSchema.safeParse(c.req.param());

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json({ error: issue?.message ?? 'Invalid token' }, 422);
  }

  const { token } = parsed.data;

  const form = await getFormByToken(c.env.D1, token);
  if (!form) {
    return c.json({ error: 'Form not found' }, 404);
  }

  const now = new Date().toISOString();
  if (form.expiresAt < now) {
    return c.json({ error: 'Form has expired' }, 410);
  }

  if (form.status === 'completed') {
    return c.json({ error: 'Form has already been submitted' }, 409);
  }

  return c.json(form, 200);
});

const answerFormBodySchema = z.object({
  fields: z.record(z.string(), z.string()),
  photo: z
    .string()
    .max(55_000, 'photo data URI must not exceed 55,000 characters')
    .optional()
    .nullable(),
});

formRoutes.post('/:token/answer', async (c) => {
  const tokenParsed = formTokenParamSchema.safeParse(c.req.param());

  if (!tokenParsed.success) {
    const issue = tokenParsed.error.issues[0];
    return c.json({ error: issue?.message ?? 'Invalid token' }, 422);
  }

  const body = await c.req.json().catch(() => null);
  const bodyParsed = answerFormBodySchema.safeParse(body);

  if (!bodyParsed.success) {
    const issue = bodyParsed.error.issues[0];
    return c.json({ error: issue?.message ?? 'Invalid request body' }, 422);
  }

  try {
    const response = await answerForm(c.env.D1, {
      token: tokenParsed.data.token,
      fields: bodyParsed.data.fields,
      photo: bodyParsed.data.photo,
    });

    return c.json(response, 200);
  } catch (error) {
    if (error instanceof AnswerFormError) {
      return c.json({ error: error.message }, error.status);
    }
    throw error;
  }
});

const retrieveTokenQuerySchema = z.object({
  rt: z
    .string()
    .regex(/^[0-9a-f]{64}$/, 'rt must be a 64-character lowercase hex string'),
});

formRoutes.get('/:token/return-card', async (c) => {
  const tokenParsed = formTokenParamSchema.safeParse(c.req.param());
  if (!tokenParsed.success) {
    const issue = tokenParsed.error.issues[0];
    return c.json({ error: issue?.message ?? 'Invalid token' }, 422);
  }

  const queryParsed = retrieveTokenQuerySchema.safeParse(c.req.query());
  if (!queryParsed.success) {
    const issue = queryParsed.error.issues[0];
    return c.json({ error: issue?.message ?? 'Missing or invalid rt parameter' }, 422);
  }

  const validation = await validateExchangeTokenForForm(
    c.env.D1,
    tokenParsed.data.token,
    queryParsed.data.rt,
  );
  if (!validation.ok) {
    return c.json({ error: validation.error }, validation.status);
  }

  const obj = await getOwnerVcf(c.env.R2);
  if (!obj) {
    return c.json({ error: 'Owner card not configured' }, 503);
  }

  return new Response(obj.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard',
      'Content-Disposition': 'attachment; filename="contactswap-admin.vcf"',
      'Cache-Control': 'no-store',
    },
  });
});

formRoutes.get('/:token/return-card-qr', async (c) => {
  const tokenParsed = formTokenParamSchema.safeParse(c.req.param());
  if (!tokenParsed.success) {
    const issue = tokenParsed.error.issues[0];
    return c.json({ error: issue?.message ?? 'Invalid token' }, 422);
  }

  const queryParsed = retrieveTokenQuerySchema.safeParse(c.req.query());
  if (!queryParsed.success) {
    const issue = queryParsed.error.issues[0];
    return c.json({ error: issue?.message ?? 'Missing or invalid rt parameter' }, 422);
  }

  const validation = await validateExchangeTokenForForm(
    c.env.D1,
    tokenParsed.data.token,
    queryParsed.data.rt,
  );
  if (!validation.ok) {
    return c.json({ error: validation.error }, validation.status);
  }

  const ownerCard = await getOwnerVcf(c.env.R2);
  if (!ownerCard) {
    return c.json({ error: 'Owner card not configured' }, 503);
  }

  const appBase = c.env.PUBLIC_APP_URL.replace(/\/$/, '');
  const downloadUrl = `${appBase}/v1/forms/${tokenParsed.data.token}/return-card?rt=${queryParsed.data.rt}`;

  const qr = qrcode(0, 'M');
  qr.addData(downloadUrl);
  qr.make();

  return new Response(qr.createSvgTag({ cellSize: 6, margin: 2 }), {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
});

interface ExchangeTokenValidationResult {
  ok: true;
}

interface ExchangeTokenValidationError {
  ok: false;
  status: 401 | 404 | 410;
  error: string;
}

async function validateExchangeTokenForForm(
  db: D1Database,
  formToken: string,
  retrieveToken: string,
): Promise<ExchangeTokenValidationResult | ExchangeTokenValidationError> {
  const formId = await getFormIdByToken(db, formToken);
  if (!formId) {
    return { ok: false, status: 404, error: 'Form not found' };
  }

  const rawBytes = Uint8Array.from(retrieveToken.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawBytes);
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const record = await getExchangeTokenByHash(db, tokenHash);
  if (!record || record.formId !== formId) {
    return { ok: false, status: 401, error: 'Invalid exchange token' };
  }

  if (record.expiresAt < new Date().toISOString()) {
    return { ok: false, status: 410, error: 'Exchange token has expired' };
  }

  return { ok: true };
}
