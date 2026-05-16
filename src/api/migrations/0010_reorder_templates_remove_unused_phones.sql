-- Reorder template fields and remove unused phone fields.
-- Requested order:
-- full name, phone, personal email, birthday, website, home address,
-- company, job title, work email, work address, notes.

-- Update All Fields template
UPDATE templates
SET
  fields = json('[
    {"fieldKey":"photo","required":0,"order":0},
    {"fieldKey":"full_name","required":1,"order":1},
    {"fieldKey":"cell_phone","required":0,"order":2},
    {"fieldKey":"personal_email","required":0,"order":3},
    {"fieldKey":"birthday","required":0,"order":4},
    {"fieldKey":"website","required":0,"order":5},
    {"fieldKey":"home_address_street","required":0,"order":6},
    {"fieldKey":"home_address_city","required":0,"order":7},
    {"fieldKey":"home_address_state","required":0,"order":8},
    {"fieldKey":"home_address_postal_code","required":0,"order":9},
    {"fieldKey":"home_address_country","required":0,"order":10},
    {"fieldKey":"company","required":0,"order":11},
    {"fieldKey":"job_title","required":0,"order":12},
    {"fieldKey":"work_email","required":0,"order":13},
    {"fieldKey":"work_address_street","required":0,"order":14},
    {"fieldKey":"work_address_city","required":0,"order":15},
    {"fieldKey":"work_address_state","required":0,"order":16},
    {"fieldKey":"work_address_postal_code","required":0,"order":17},
    {"fieldKey":"work_address_country","required":0,"order":18},
    {"fieldKey":"notes","required":0,"order":19}
  ]'),
  updated_at = datetime('now')
WHERE name = 'All Fields';

-- Keep Quick Intro minimal, but align ordering style if this template exists.
UPDATE templates
SET
  fields = json('[
    {"fieldKey":"full_name","required":1,"order":1},
    {"fieldKey":"cell_phone","required":0,"order":2},
    {"fieldKey":"personal_email","required":0,"order":3},
    {"fieldKey":"company","required":0,"order":4}
  ]'),
  updated_at = datetime('now')
WHERE name = 'Quick Intro';