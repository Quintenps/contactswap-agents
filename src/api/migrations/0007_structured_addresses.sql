-- Migrate templates to use structured address fields instead of flat address strings.
-- This migration replaces work_address and home_address with individual components:
-- street, city, state, postal_code, country

-- Update Standard Contact template
UPDATE templates
SET
  fields = json('[
    {"fieldKey":"photo","required":0,"order":0},
    {"fieldKey":"full_name","required":1,"order":1},
    {"fieldKey":"work_email","required":0,"order":2},
    {"fieldKey":"personal_email","required":0,"order":3},
    {"fieldKey":"cell_phone","required":0,"order":4},
    {"fieldKey":"work_phone","required":0,"order":5},
    {"fieldKey":"company","required":0,"order":6},
    {"fieldKey":"job_title","required":0,"order":7},
    {"fieldKey":"website","required":0,"order":8},
    {"fieldKey":"notes","required":0,"order":9}
  ]'),
  updated_at = datetime('now')
WHERE name = 'Standard Contact';

-- Update All Fields template to use structured addresses
UPDATE templates
SET
  fields = json('[
    {"fieldKey":"photo","required":0,"order":0},
    {"fieldKey":"full_name","required":1,"order":1},
    {"fieldKey":"work_email","required":0,"order":2},
    {"fieldKey":"personal_email","required":0,"order":3},
    {"fieldKey":"work_phone","required":0,"order":4},
    {"fieldKey":"cell_phone","required":0,"order":5},
    {"fieldKey":"home_phone","required":0,"order":6},
    {"fieldKey":"work_address_street","required":0,"order":7},
    {"fieldKey":"work_address_city","required":0,"order":8},
    {"fieldKey":"work_address_state","required":0,"order":9},
    {"fieldKey":"work_address_postal_code","required":0,"order":10},
    {"fieldKey":"work_address_country","required":0,"order":11},
    {"fieldKey":"home_address_street","required":0,"order":12},
    {"fieldKey":"home_address_city","required":0,"order":13},
    {"fieldKey":"home_address_state","required":0,"order":14},
    {"fieldKey":"home_address_postal_code","required":0,"order":15},
    {"fieldKey":"home_address_country","required":0,"order":16},
    {"fieldKey":"company","required":0,"order":17},
    {"fieldKey":"job_title","required":0,"order":18},
    {"fieldKey":"website","required":0,"order":19},
    {"fieldKey":"birthday","required":0,"order":20},
    {"fieldKey":"notes","required":0,"order":21}
  ]'),
  updated_at = datetime('now')
WHERE name = 'All Fields';
