/**
 * D1 template persistence layer
 */

export interface TemplateRecord {
  id: string;
  fields: string;
}

export interface TemplateSummaryRecord {
  id: string;
  name: string;
  description: string | null;
  isDefault: number;
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

export async function listTemplates(db: D1Database): Promise<TemplateSummaryRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, name, description, is_default as isDefault, fields FROM templates
       ORDER BY is_default DESC, name ASC`,
    )
    .all<TemplateSummaryRecord>();

  return result.results ?? [];
}
