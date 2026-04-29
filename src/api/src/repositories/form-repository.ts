/**
 * D1 form persistence layer
 */

import type { FieldConfig, FormData, FormStatus, ListFormsResponse } from '@contactswap/shared';

export interface InsertFormRecordInput {
  id: string;
  token: string;
  templateId: string;
  fieldConfigJson: string;
  prefilledJson: string;
  originalContactKey: string;
  originalContactName: string;
  expiresAt: string;
}

export async function insertFormRecord(
  db: D1Database,
  input: InsertFormRecordInput,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO forms
        (id, token, template_id, field_config, prefilled, original_contact_url, original_contact_name, status, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8)`,
    )
    .bind(
      input.id,
      input.token,
      input.templateId,
      input.fieldConfigJson,
      input.prefilledJson,
      input.originalContactKey,
      input.originalContactName,
      input.expiresAt,
    )
    .run();
}

export interface ListFormRecordsInput {
  limit: number;
  offset: number;
  status?: FormStatus;
}

interface ListFormRow {
  id: string;
  token: string;
  original_contact_name: string;
  status: FormStatus;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
}

interface CountRow {
  total: number;
}

interface DeleteFormRow {
  id: string;
  token: string;
  original_contact_url: string;
}

export async function listFormRecords(
  db: D1Database,
  input: ListFormRecordsInput,
): Promise<ListFormsResponse> {
  const formsQuery = input.status
    ? `SELECT id, token, original_contact_name, status, created_at, completed_at, expires_at
       FROM forms
       WHERE status = ?1
       ORDER BY created_at DESC
       LIMIT ?2 OFFSET ?3`
    : `SELECT id, token, original_contact_name, status, created_at, completed_at, expires_at
       FROM forms
       ORDER BY created_at DESC
       LIMIT ?1 OFFSET ?2`;

  const formsResult = input.status
    ? await db.prepare(formsQuery).bind(input.status, input.limit, input.offset).all<ListFormRow>()
    : await db.prepare(formsQuery).bind(input.limit, input.offset).all<ListFormRow>();

  const countQuery = input.status
    ? 'SELECT COUNT(*) AS total FROM forms WHERE status = ?1'
    : 'SELECT COUNT(*) AS total FROM forms';

  const countRow = input.status
    ? await db.prepare(countQuery).bind(input.status).first<CountRow>()
    : await db.prepare(countQuery).first<CountRow>();

  return {
    forms: (formsResult.results ?? []).map((row) => ({
      id: row.id,
      token: row.token,
      originalContactName: row.original_contact_name,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      expiresAt: row.expires_at,
    })),
    total: Number(countRow?.total ?? 0),
    limit: input.limit,
    offset: input.offset,
  };
}

export async function getFormForDelete(
  db: D1Database,
  id: string,
): Promise<{ id: string; token: string; originalContactKey: string } | null> {
  const row = await db
    .prepare('SELECT id, token, original_contact_url FROM forms WHERE id = ?1')
    .bind(id)
    .first<DeleteFormRow>();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    token: row.token,
    originalContactKey: row.original_contact_url,
  };
}

export async function deleteFormById(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM forms WHERE id = ?1').bind(id).run();
}

interface RetrieveFormRow {
  token: string;
  original_contact_name: string;
  field_config: string;
  prefilled: string;
  status: FormStatus;
  expires_at: string;
}

export async function getFormByToken(
  db: D1Database,
  token: string,
): Promise<FormData | null> {
  const row = await db
    .prepare(
      'SELECT token, original_contact_name, field_config, prefilled, status, expires_at FROM forms WHERE token = ?1',
    )
    .bind(token)
    .first<RetrieveFormRow>();

  if (!row) {
    return null;
  }

  return {
    token: row.token,
    contactName: row.original_contact_name,
    fields: JSON.parse(row.field_config) as FieldConfig[],
    prefilled: JSON.parse(row.prefilled) as Record<string, string>,
    status: row.status,
    expiresAt: row.expires_at,
  };
}
