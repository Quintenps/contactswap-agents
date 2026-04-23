-- Add prefilled contact fields column to forms table
-- Stores the parsed VCF fields as JSON at creation time to avoid R2 read + re-parse on form view

ALTER TABLE forms ADD COLUMN prefilled TEXT NOT NULL DEFAULT '{}';
