-- =====================================================
-- MIGRATION 06: CREATE/UPDATE BATCHES TABLE
-- =====================================================
-- Creates batches table if it doesn't exist, then updates it
-- Batches are created by stakeholders but belong to organizations
-- =====================================================

-- Create batches table if it doesn't exist
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Batch identification
    name VARCHAR(255) NOT NULL, -- Product/drug name
    mfg VARCHAR(50) NOT NULL, -- Manufacturing date (ISO format or string)
    exp VARCHAR(50) NOT NULL, -- Expiry date (ISO format or string)
    qty INTEGER NOT NULL CHECK (qty > 0), -- Quantity/units
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected, In-Transit, Delivered, Flagged, Blocked
    
    -- Organization relationship
    organization_id UUID,
    
    -- Manufacturer info (legacy/optional)
    manufacturer VARCHAR(255), -- Manufacturer name (optional, can be derived from organization)
    manufacturer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Legacy field
    
    -- Anomaly tracking
    anomaly_reason TEXT, -- Reason if batch was flagged for anomalies
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_batches_organization ON batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_name ON batches(name);
CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_batches_updated_at'
    ) THEN
        CREATE TRIGGER update_batches_updated_at
            BEFORE UPDATE ON batches
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Update batches table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'batches') THEN
        -- Ensure organization_id foreign key exists and points to organizations
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_batches_organization'
            AND table_name = 'batches'
        ) THEN
            ALTER TABLE batches 
            ADD CONSTRAINT fk_batches_organization 
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
        
        -- Add created_by_stakeholder_id if it doesn't exist (optional - tracks which stakeholder created it)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'batches' 
            AND column_name = 'created_by_stakeholder_id'
        ) THEN
            ALTER TABLE batches
            ADD COLUMN created_by_stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE SET NULL;
        END IF;
        
        -- Drop all existing policies for batches (to avoid conflicts)
        DROP POLICY IF EXISTS "Admins can read all batches" ON batches;
        DROP POLICY IF EXISTS "Users can read org batches" ON batches;
        DROP POLICY IF EXISTS "Stakeholders can read org batches" ON batches;
        DROP POLICY IF EXISTS "Stakeholders can create org batches" ON batches;
        DROP POLICY IF EXISTS "Stakeholders can update org batches" ON batches;
        DROP POLICY IF EXISTS "Admins can create batches" ON batches;
        DROP POLICY IF EXISTS "Admins can update batches" ON batches;
        
        -- Admins can see all batches
        CREATE POLICY "Admins can read all batches" ON batches
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM admin_users 
                    WHERE admin_users.id = auth.uid() 
                    AND admin_users.is_active = true
                )
            );
        
        -- Stakeholders can see batches for their organization
        CREATE POLICY "Stakeholders can read org batches" ON batches
            FOR SELECT USING (
                organization_id IN (
                    SELECT organization_id FROM stakeholders
                    WHERE user_id = auth.uid()
                    AND is_active = true
                )
            );
        
        -- Stakeholders can create batches for their organization
        CREATE POLICY "Stakeholders can create org batches" ON batches
            FOR INSERT WITH CHECK (
                organization_id IN (
                    SELECT organization_id FROM stakeholders
                    WHERE user_id = auth.uid()
                    AND is_active = true
                )
            );
        
        -- Stakeholders can update batches for their organization
        CREATE POLICY "Stakeholders can update org batches" ON batches
            FOR UPDATE USING (
                organization_id IN (
                    SELECT organization_id FROM stakeholders
                    WHERE user_id = auth.uid()
                    AND is_active = true
                )
            );
    END IF;
    
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'batches' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =====================================================
-- END OF MIGRATION 06
-- =====================================================
