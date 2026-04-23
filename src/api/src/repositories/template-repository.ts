/**
 * D1 template persistence layer
 */

export interface TemplateRecord {
  id: string;
  fields: string;
}

export async function findTemplateById(
  db: D1Database,
  templateId: string,
): Promise<TemplateRecord | null> {
  return db
    .prepare('SELECT id, fields FROM templates WHERE id = ?1')
    .bind(templateId)
    .first<TemplateRecord>();
}
