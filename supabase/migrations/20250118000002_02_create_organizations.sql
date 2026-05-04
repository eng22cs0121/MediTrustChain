-- =====================================================
-- MIGRATION 02: CREATE ORGANIZATIONS TABLE
-- =====================================================
-- Organizations are parent entities - NO email, NO password, NO wallet
-- =====================================================

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================
-- Parent entity: Organizations contain stakeholders
-- No authentication credentials at organization level
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    organization_type organization_type NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    country VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), -- Admin who created this
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Additional verification info
    verification_documents JSONB DEFAULT '[]'::jsonb
);

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_organizations_type ON organizations(organization_type);
CREATE INDEX idx_organizations_registration ON organizations(registration_number);
CREATE INDEX idx_organizations_active ON organizations(is_active);
CREATE INDEX idx_organizations_created_by ON organizations(created_by);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Admin can do everything with organizations
CREATE POLICY admin_all_organizations ON organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

-- Note: Stakeholder policy will be added in migration 03 after stakeholders table is created

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE organizations IS 'Parent entities - organizations contain stakeholders. No authentication at organization level.';
COMMENT ON COLUMN organizations.created_by IS 'Admin user who created this organization';

-- =====================================================
-- END OF MIGRATION 02
-- =====================================================
