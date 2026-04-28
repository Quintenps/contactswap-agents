-- Seed baseline templates (idempotent)
-- This migration is safe to re-run in local/staging/production.

INSERT INTO templates (id, name, description, fields, is_default)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Standard Contact',
  'Balanced default for most contact swaps.',
  '[{"fieldKey":"full_name","required":1,"order":1},{"fieldKey":"work_email","required":0,"order":2},{"fieldKey":"personal_email","required":0,"order":3},{"fieldKey":"cell_phone","required":0,"order":4},{"fieldKey":"work_phone","required":0,"order":5},{"fieldKey":"company","required":0,"order":6},{"fieldKey":"job_title","required":0,"order":7},{"fieldKey":"website","required":0,"order":8},{"fieldKey":"notes","required":0,"order":9}]',
  1
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  fields = excluded.fields,
  is_default = excluded.is_default,
  updated_at = datetime('now');

INSERT INTO templates (id, name, description, fields, is_default)
VALUES (
  '8b95f5f3-5c3c-4ab9-8f0d-c6e5e8d3d5a1',
  'Quick Intro',
  'Minimal template for fast exchanges.',
  '[{"fieldKey":"full_name","required":1,"order":1},{"fieldKey":"personal_email","required":0,"order":2},{"fieldKey":"cell_phone","required":0,"order":3},{"fieldKey":"company","required":0,"order":4}]',
  0
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  fields = excluded.fields,
  is_default = excluded.is_default,
  updated_at = datetime('now');
