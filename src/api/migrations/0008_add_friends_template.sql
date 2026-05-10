-- Add a Friends template for casual contact collection.
-- Includes: full_name, birthday, cell_phone, home address, job_title, company, personal_email, photo, website.
-- Idempotent upsert so this can be safely applied multiple times.

INSERT INTO templates (id, name, description, fields, is_default)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Friends',
  'Casual template for collecting essential contact info from friends.',
  '[{"fieldKey":"photo","required":0,"order":0},{"fieldKey":"full_name","required":1,"order":1},{"fieldKey":"personal_email","required":0,"order":2},{"fieldKey":"cell_phone","required":0,"order":3},{"fieldKey":"job_title","required":0,"order":4},{"fieldKey":"company","required":0,"order":5},{"fieldKey":"home_address_street","required":0,"order":6},{"fieldKey":"home_address_city","required":0,"order":7},{"fieldKey":"home_address_state","required":0,"order":8},{"fieldKey":"home_address_postal_code","required":0,"order":9},{"fieldKey":"home_address_country","required":0,"order":10},{"fieldKey":"website","required":0,"order":11},{"fieldKey":"birthday","required":0,"order":12}]',
  0
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  fields = excluded.fields,
  is_default = excluded.is_default,
  updated_at = datetime('now');
