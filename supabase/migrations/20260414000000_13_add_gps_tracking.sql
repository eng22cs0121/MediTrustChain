-- Migration: Add GPS tracking capabilities
ALTER TABLE batch_history ADD COLUMN IF NOT EXISTS latitude FLOAT8;
ALTER TABLE batch_history ADD COLUMN IF NOT EXISTS longitude FLOAT8;

ALTER TABLE stakeholder_details ADD COLUMN IF NOT EXISTS latitude FLOAT8;
ALTER TABLE stakeholder_details ADD COLUMN IF NOT EXISTS longitude FLOAT8;
