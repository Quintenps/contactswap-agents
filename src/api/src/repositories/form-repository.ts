/**
 * D1 form persistence layer
 */

import type { FormStatus, ListFormsResponse } from '@contactswap/shared';

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
