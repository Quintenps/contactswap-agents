-- Add an all-fields template for comprehensive contact collection.
-- Idempotent upsert so this can be safely applied multiple times.

INSERT INTO templates (id, name, description, fields, is_default)
VALUES (
  '36f1b5f2-4f8b-4f24-9dc3-6d2c6de4ab52',
  'All Fields',
  'Comprehensive template with every available contact field.',
  '[{"fieldKey":"photo","required":0,"order":0},{"fieldKey":"full_name","required":1,"order":1},{"fieldKey":"work_email","required":0,"order":2},{"fieldKey":"personal_email","required":0,"order":3},{"fieldKey":"work_phone","required":0,"order":4},{"fieldKey":"cell_phone","required":0,"order":5},{"fieldKey":"home_phone","required":0,"order":6},{"fieldKey":"work_address","required":0,"order":7},{"fieldKey":"home_address","required":0,"order":8},{"fieldKey":"company","required":0,"order":9},{"fieldKey":"job_title","required":0,"order":10},{"fieldKey":"website","required":0,"order":11},{"fieldKey":"birthday","required":0,"order":12},{"fieldKey":"notes","required":0,"order":13}]',
  0
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  fields = excluded.fields,
  is_default = excluded.is_default,
  updated_at = datetime('now');
