-- Fix photo field order so it appears first on the form (order 0).
-- Migration 0004 inserted photo with order 99; this corrects it.

UPDATE templates
SET
  fields = (
    SELECT json_group_array(
      CASE
        WHEN json_extract(field.value, '$.fieldKey') = 'photo'
          THEN json_set(field.value, '$.order', 0)
        ELSE field.value
      END
    )
    FROM json_each(templates.fields) AS field
  ),
  updated_at = datetime('now')
WHERE json_extract(fields, '$') LIKE '%"photo"%';
