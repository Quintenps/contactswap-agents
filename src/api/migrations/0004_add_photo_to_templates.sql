-- Add photo field to all existing templates
-- Photo is appended as the last optional field in each template.

UPDATE templates
SET
  fields = json_insert(fields, '$[#]', json('{"fieldKey":"photo","required":0,"order":0}')),
  updated_at = datetime('now')
WHERE
  -- Only update rows that don't already have photo, making this idempotent
  json_extract(fields, '$[#-1].fieldKey') != 'photo'
  OR json_array_length(fields) = 0;
