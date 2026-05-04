-- Migration: 20260311000001_drug_master
-- Creates the drug_master table for regulator-controlled pharmaceutical composition templates.
-- Regulators approve drug templates which lock composition/strength on blockchain.
-- Manufacturers must select from these approved templates when creating batches.

CREATE TABLE IF NOT EXISTS drug_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drug_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    drug_code VARCHAR(50) NOT NULL UNIQUE,
    composition TEXT NOT NULL,
    strength VARCHAR(100) NOT NULL,
    dosage_form VARCHAR(100) NOT NULL,
    approved_expiry_months INTEGER NOT NULL DEFAULT 24,

    -- Security: SHA-256 hex digest of (drug_name || composition || strength)
    composition_hash VARCHAR(66) NOT NULL,

    -- Blockchain confirmation fields (filled after on-chain TX)
    blockchain_tx_hash VARCHAR(255),
    blockchain_block INTEGER,

    -- Which manufacturers are authorised to produce this drug
    approved_manufacturer_ids UUID[] DEFAULT '{}',

    -- Regulator who approved this template
    approved_by UUID REFERENCES stakeholders(id) ON DELETE SET NULL,

    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at current on any change
CREATE OR REPLACE FUNCTION update_drug_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drug_master_updated_at
    BEFORE UPDATE ON drug_master
    FOR EACH ROW EXECUTE FUNCTION update_drug_master_updated_at();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_drug_master_drug_code ON drug_master (drug_code);
CREATE INDEX IF NOT EXISTS idx_drug_master_composition_hash ON drug_master (composition_hash);
CREATE INDEX IF NOT EXISTS idx_drug_master_approved_by ON drug_master (approved_by);
CREATE INDEX IF NOT EXISTS idx_drug_master_is_active ON drug_master (is_active);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE drug_master ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY drug_master_admin_all
    ON drug_master
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.is_active = true
        )
    );

-- Regulator: can INSERT and UPDATE (cannot delete)
CREATE POLICY drug_master_regulator_write
    ON drug_master
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.role = 'regulator'
            AND s.is_active = true
        )
    );

CREATE POLICY drug_master_regulator_update
    ON drug_master
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.role = 'regulator'
            AND s.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.role = 'regulator'
            AND s.is_active = true
        )
    );

-- All active stakeholders: SELECT (manufacturer needs to see approved drugs)
CREATE POLICY drug_master_stakeholder_select
    ON drug_master
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.is_active = true
        )
    );
