-- =====================================================
-- MIGRATION 12: PRODUCTION HARDENING
-- =====================================================
-- Fixes critical schema issues found during database audit:
-- 1. batches.id: UUID → VARCHAR(100) for human-readable IDs
-- 2. Adds missing blockchain columns to batches
-- 3. Fixes FK type mismatches in batch_history, anomalies, notifications
-- 4. Makes organization_id NOT NULL on batches
-- 5. Adds missing indexes
-- 6. Formalizes manually-added columns
-- =====================================================

-- =====================================================
-- STEP 1: Drop FK constraints referencing batches.id
-- (must drop before changing column type)
-- =====================================================

DO $$
BEGIN
    -- Drop batch_history FK
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'batch_history_batch_id_fkey'
        AND table_name = 'batch_history'
    ) THEN
        ALTER TABLE batch_history DROP CONSTRAINT batch_history_batch_id_fkey;
    END IF;

    -- Drop anomalies FK
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'anomalies_batch_id_fkey'
        AND table_name = 'anomalies'
    ) THEN
        ALTER TABLE anomalies DROP CONSTRAINT anomalies_batch_id_fkey;
    END IF;

    -- Drop notifications FK
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'notifications_batch_id_fkey'
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_batch_id_fkey;
    END IF;
END $$;

-- =====================================================
-- STEP 2: Change batches.id from UUID to VARCHAR(100)
-- =====================================================
-- This allows human-readable batch IDs like "BCH-005"

-- Drop default (gen_random_uuid) since IDs are now user-provided strings
ALTER TABLE batches ALTER COLUMN id DROP DEFAULT;

-- Change column type
ALTER TABLE batches ALTER COLUMN id TYPE VARCHAR(100) USING id::text;

-- =====================================================
-- STEP 3: Fix FK columns to match new VARCHAR type
-- =====================================================

-- batch_history.batch_id: UUID → VARCHAR(100)
ALTER TABLE batch_history ALTER COLUMN batch_id TYPE VARCHAR(100) USING batch_id::text;

-- anomalies.batch_id: UUID → VARCHAR(100)
ALTER TABLE anomalies ALTER COLUMN batch_id TYPE VARCHAR(100) USING batch_id::text;

-- notifications.batch_id: UUID → VARCHAR(100)
ALTER TABLE notifications ALTER COLUMN batch_id TYPE VARCHAR(100) USING batch_id::text;

-- =====================================================
-- STEP 4: Re-add FK constraints with correct types
-- =====================================================

ALTER TABLE batch_history
    ADD CONSTRAINT batch_history_batch_id_fkey
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

ALTER TABLE anomalies
    ADD CONSTRAINT anomalies_batch_id_fkey
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_batch_id_fkey
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

-- =====================================================
-- STEP 5: Add missing blockchain columns to batches
-- (these may already exist if added manually)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'blockchain_tx_hash') THEN
        ALTER TABLE batches ADD COLUMN blockchain_tx_hash VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'blockchain_block_number') THEN
        ALTER TABLE batches ADD COLUMN blockchain_block_number INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'data_hash') THEN
        ALTER TABLE batches ADD COLUMN data_hash VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'on_chain_batch_id') THEN
        ALTER TABLE batches ADD COLUMN on_chain_batch_id INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'current_holder') THEN
        ALTER TABLE batches ADD COLUMN current_holder VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'is_blockchain_synced') THEN
        ALTER TABLE batches ADD COLUMN is_blockchain_synced BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =====================================================
-- STEP 6: Add blockchain_tx_hash to batch_history
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batch_history' AND column_name = 'blockchain_tx_hash') THEN
        ALTER TABLE batch_history ADD COLUMN blockchain_tx_hash VARCHAR(255);
    END IF;
END $$;

-- =====================================================
-- STEP 7: Add blockchain_tx_hash to audit_logs
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'blockchain_tx_hash') THEN
        ALTER TABLE audit_logs ADD COLUMN blockchain_tx_hash VARCHAR(255);
    END IF;
END $$;

-- =====================================================
-- STEP 8: Make organization_id NOT NULL with safe default
-- =====================================================
-- First update any existing NULL values (shouldn't be any since table is empty)

UPDATE batches SET organization_id = (
    SELECT id FROM organizations LIMIT 1
) WHERE organization_id IS NULL;

-- Now add NOT NULL constraint
ALTER TABLE batches ALTER COLUMN organization_id SET NOT NULL;

-- =====================================================
-- STEP 9: Add missing indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_batches_manufacturer_id ON batches(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_batches_created_by_stakeholder ON batches(created_by_stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_batches_blockchain_tx ON batches(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_batches_data_hash ON batches(data_hash);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN batches.id IS 'Human-readable batch ID (e.g., BCH-005). Not a UUID.';
COMMENT ON COLUMN batches.blockchain_tx_hash IS 'Transaction hash from blockchain batch creation';
COMMENT ON COLUMN batches.data_hash IS 'On-chain data hash computed by smart contract at creation (immutable)';
COMMENT ON COLUMN batches.on_chain_batch_id IS 'Numeric batch ID assigned by the smart contract';
COMMENT ON COLUMN batches.current_holder IS 'Current holder/custodian of the batch in supply chain';
COMMENT ON COLUMN batches.is_blockchain_synced IS 'Whether batch data has been confirmed on-chain';

-- =====================================================
-- END OF MIGRATION 12
-- =====================================================
