-- =====================================================
-- MIGRATION 09: CREATE AI-RELATED TABLES
-- =====================================================
-- Creates tables for AI features: anomalies and notifications
-- =====================================================

-- =====================================================
-- ANOMALY SEVERITY ENUM
-- =====================================================
CREATE TYPE anomaly_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- =====================================================
-- ANOMALY TYPE ENUM
-- =====================================================
CREATE TYPE anomaly_type AS ENUM (
    'timing',
    'location',
    'quantity',
    'verification',
    'tampering',
    'status_regression',
    'expiry',
    'pattern'
);

-- =====================================================
-- ANOMALY STATUS ENUM
-- =====================================================
CREATE TYPE anomaly_status AS ENUM (
    'new',
    'investigating',
    'resolved',
    'false_positive'
);

-- =====================================================
-- NOTIFICATION TYPE ENUM
-- =====================================================
CREATE TYPE notification_type AS ENUM (
    'info',
    'success',
    'warning',
    'danger'
);

-- =====================================================
-- ANOMALIES TABLE
-- =====================================================
-- Stores AI-detected anomalies in the supply chain
-- Note: Only creates foreign keys if batches table exists
CREATE TABLE IF NOT EXISTS anomalies (
    id VARCHAR(255) PRIMARY KEY, -- Format: "ANM-{batchId}-{type}-{index}"
    batch_id UUID,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Anomaly details
    type anomaly_type NOT NULL,
    severity anomaly_severity NOT NULL,
    description TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status anomaly_status DEFAULT 'new',
    
    -- AI analysis metadata
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100), -- 0-100
    location VARCHAR(255),
    expected_value TEXT,
    actual_value TEXT,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- Stores drugName, etc.
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
-- Stores user notifications (including AI-generated alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification content
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type notification_type DEFAULT 'info',
    
    -- Related entities (foreign keys added conditionally below)
    batch_id UUID,
    anomaly_id VARCHAR(255),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Status
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Anomalies indexes
CREATE INDEX idx_anomalies_batch ON anomalies(batch_id);
CREATE INDEX idx_anomalies_org ON anomalies(organization_id);
CREATE INDEX idx_anomalies_type ON anomalies(type);
CREATE INDEX idx_anomalies_severity ON anomalies(severity);
CREATE INDEX idx_anomalies_status ON anomalies(status);
CREATE INDEX idx_anomalies_detected_at ON anomalies(detected_at);
CREATE INDEX idx_anomalies_assigned_to ON anomalies(assigned_to);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_batch ON notifications(batch_id);
CREATE INDEX idx_notifications_anomaly ON notifications(anomaly_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at for anomalies
CREATE TRIGGER update_anomalies_updated_at
    BEFORE UPDATE ON anomalies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Admin can see all anomalies
CREATE POLICY admin_all_anomalies ON anomalies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

-- Stakeholders can see anomalies for their organization
CREATE POLICY stakeholders_read_org_anomalies ON anomalies
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM stakeholders
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

-- Regulators can see all anomalies (for compliance)
CREATE POLICY regulators_read_all_anomalies ON anomalies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stakeholders
            WHERE user_id = auth.uid()
            AND role = 'regulator'
            AND is_active = true
        )
    );

-- Users can only see their own notifications
CREATE POLICY users_own_notifications ON notifications
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS (if batches table exists)
-- =====================================================

-- Add foreign key for anomalies.batch_id if batches table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'batches') THEN
        -- Add foreign key constraint for anomalies.batch_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'anomalies_batch_id_fkey'
            AND table_name = 'anomalies'
        ) THEN
            ALTER TABLE anomalies
            ADD CONSTRAINT anomalies_batch_id_fkey
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
        END IF;
        
        -- Add foreign key constraint for notifications.batch_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'notifications_batch_id_fkey'
            AND table_name = 'notifications'
        ) THEN
            ALTER TABLE notifications
            ADD CONSTRAINT notifications_batch_id_fkey
            FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add self-referencing foreign key for notifications.anomaly_id
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'anomalies') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'notifications_anomaly_id_fkey'
            AND table_name = 'notifications'
        ) THEN
            ALTER TABLE notifications
            ADD CONSTRAINT notifications_anomaly_id_fkey
            FOREIGN KEY (anomaly_id) REFERENCES anomalies(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE anomalies IS 'AI-detected anomalies in the pharmaceutical supply chain';
COMMENT ON TABLE notifications IS 'User notifications including AI-generated alerts';
COMMENT ON COLUMN anomalies.confidence IS 'AI confidence score (0-100)';
COMMENT ON COLUMN anomalies.metadata IS 'Additional AI analysis data (drugName, etc.)';

-- =====================================================
-- END OF MIGRATION 09
-- =====================================================
