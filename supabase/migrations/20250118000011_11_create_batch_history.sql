-- =====================================================
-- MIGRATION 11: CREATE BATCH_HISTORY TABLE
-- =====================================================
-- Creates the batch_history table to track batch status changes and locations
-- =====================================================

-- Create batch_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS batch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL, -- Will add FK constraint below if batches exists
    
    -- Event details
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Who made the update
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Additional notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_batch_history_batch_id ON batch_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_history_timestamp ON batch_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_batch_history_status ON batch_history(status);
CREATE INDEX IF NOT EXISTS idx_batch_history_updated_by ON batch_history(updated_by);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key to batches table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'batches') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'batch_history_batch_id_fkey'
            AND table_name = 'batch_history'
        ) THEN
            ALTER TABLE batch_history
            ADD CONSTRAINT batch_history_batch_id_fkey
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE batch_history ENABLE ROW LEVEL SECURITY;

-- Admin can see all batch history
CREATE POLICY admin_all_batch_history ON batch_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

-- Users can see history for batches in their organization
CREATE POLICY stakeholders_read_org_batch_history ON batch_history
    FOR SELECT USING (
        batch_id IN (
            SELECT b.id FROM batches b
            WHERE b.organization_id IN (
                SELECT organization_id FROM stakeholders
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        )
    );

-- Users can insert history for batches in their organization
CREATE POLICY stakeholders_insert_org_batch_history ON batch_history
    FOR INSERT WITH CHECK (
        batch_id IN (
            SELECT b.id FROM batches b
            WHERE b.organization_id IN (
                SELECT organization_id FROM stakeholders
                WHERE user_id = auth.uid()
                AND is_active = true
            )
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE batch_history IS 'Tracks batch status changes and location updates throughout the supply chain';
COMMENT ON COLUMN batch_history.batch_id IS 'Reference to the batch this history event belongs to';
COMMENT ON COLUMN batch_history.location IS 'Location where the status change occurred';
COMMENT ON COLUMN batch_history.status IS 'New status of the batch (Pending, Approved, In-Transit, Delivered, etc.)';
COMMENT ON COLUMN batch_history.updated_by IS 'User who made this status update';

-- =====================================================
-- END OF MIGRATION 11
-- =====================================================
