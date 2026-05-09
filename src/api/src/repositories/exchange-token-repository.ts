/**
 * D1 exchange token persistence layer
 */

export async function getFormIdByToken(
  db: D1Database,
  token: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT id FROM forms WHERE token = ?1')
    .bind(token)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export interface InsertExchangeTokenInput {
  id: string;
  formId: string;
  exchangeTokenHash: string;
  expiresAt: string;
}

export async function insertExchangeToken(
  db: D1Database,
  input: InsertExchangeTokenInput,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO form_exchange_tokens (id, form_id, exchange_token_hash, expires_at)
       VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(input.id, input.formId, input.exchangeTokenHash, input.expiresAt)
    .run();
}

interface ExchangeTokenRow {
  id: string;
  form_id: string;
  expires_at: string;
}

export async function getExchangeTokenByHash(
  db: D1Database,
  tokenHash: string,
): Promise<{ id: string; formId: string; expiresAt: string } | null> {
  const row = await db
    .prepare(
      'SELECT id, form_id, expires_at FROM form_exchange_tokens WHERE exchange_token_hash = ?1',
    )
    .bind(tokenHash)
    .first<ExchangeTokenRow>();

  if (!row) return null;
  return { id: row.id, formId: row.form_id, expiresAt: row.expires_at };
}
