PRAGMA foreign_keys = OFF;
DELETE FROM forms WHERE template_id = (SELECT id FROM templates WHERE name = 'Quick Intro');
DELETE FROM templates WHERE name = 'Quick Intro';
PRAGMA foreign_keys = ON;