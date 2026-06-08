-- Store the answer VCF object key for completed forms.
-- Nullable for compatibility with forms completed before this migration.

ALTER TABLE forms ADD COLUMN answer_vcf_key TEXT;
