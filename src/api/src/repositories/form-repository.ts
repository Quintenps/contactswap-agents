/**
 * D1 form persistence layer
 */

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
