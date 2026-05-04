-- Migration: 20260311000002_batches_add_drug_master_fk
-- Adds drug master linkage columns to the batches table.
-- Manufacturers must reference an approved drug_master template.
-- composition_hash is stored redundantly for fast tamper detection without a join.

ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS drug_master_id UUID REFERENCES drug_master(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS composition_hash VARCHAR(66),
    ADD COLUMN IF NOT EXISTS composition TEXT,
    ADD COLUMN IF NOT EXISTS strength VARCHAR(100);

-- Index for fast batch-to-template lookups and hash verification queries
CREATE INDEX IF NOT EXISTS idx_batches_drug_master_id ON batches (drug_master_id);
CREATE INDEX IF NOT EXISTS idx_batches_composition_hash ON batches (composition_hash);
