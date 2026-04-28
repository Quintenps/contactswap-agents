/**
 * Admin route: Forms
 *
 * POST /v1/forms — create a new form from an uploaded VCF file.
 * Protected by x-api-secret middleware.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { requireApiSecret } from '../middleware/require-api-secret';
import { createForm, CreateFormServiceError } from '../services/create-form';
import { listFormRecords } from '../repositories/form-repository';

type AppEnv = { Bindings: Env };

export const formRoutes = new Hono<AppEnv>();

// All form admin routes require the API secret
formRoutes.use('*', requireApiSecret);

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

formRoutes.get('/', async (c) => {
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
