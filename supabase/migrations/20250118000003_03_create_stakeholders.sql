-- =====================================================
-- MIGRATION 03: CREATE STAKEHOLDERS TABLE
-- =====================================================
-- Stakeholders are child entities belonging to organizations
-- Each stakeholder has: email, password (via Supabase Auth), wallet_address, role
-- =====================================================

-- =====================================================
-- STAKEHOLDERS TABLE
-- =====================================================
-- Child entity: Stakeholders belong to organizations
-- Each stakeholder has authentication credentials and blockchain wallet
CREATE TABLE stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Stakeholder information
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    position VARCHAR(100), -- e.g., "Supply Chain Manager", "Quality Officer"
    
    -- Authentication (managed by Supabase Auth)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Blockchain wallet address (required, unique)
    wallet_address VARCHAR(255) NOT NULL UNIQUE,
    
    -- Role (matches organization_type enum)
    role stakeholder_role NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), -- Admin who created this
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_stakeholders_org ON stakeholders(organization_id);
CREATE INDEX idx_stakeholders_email ON stakeholders(email);
CREATE INDEX idx_stakeholders_user ON stakeholders(user_id);
CREATE INDEX idx_stakeholders_wallet ON stakeholders(wallet_address);
CREATE INDEX idx_stakeholders_role ON stakeholders(role);
CREATE INDEX idx_stakeholders_active ON stakeholders(is_active);
CREATE INDEX idx_stakeholders_org_role ON stakeholders(organization_id, role);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for updated_at
CREATE TRIGGER update_stakeholders_updated_at
    BEFORE UPDATE ON stakeholders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;

-- Admin can do everything with stakeholders
CREATE POLICY admin_all_stakeholders ON stakeholders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

-- Stakeholders can read their own organization's stakeholders
CREATE POLICY stakeholders_read_own_org_stakeholders ON stakeholders
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM stakeholders
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

-- Stakeholders can update their own record
CREATE POLICY stakeholders_update_self ON stakeholders
    FOR UPDATE USING (user_id = auth.uid());

-- Public read for email lookup during login (pre-auth)
CREATE POLICY stakeholders_login_lookup ON stakeholders
    FOR SELECT USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get organization ID for current user
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM stakeholders
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1;
    
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get stakeholder role for current user
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS stakeholder_role AS $$
DECLARE
    v_role stakeholder_role;
BEGIN
    SELECT role INTO v_role
    FROM stakeholders
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1;
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS
-- =====================================================

-- View to see stakeholder details with organization info
CREATE OR REPLACE VIEW stakeholder_details AS
SELECT 
    s.id,
    s.organization_id,
    o.name as organization_name,
    o.organization_type as organization_type,
    s.full_name,
    s.email,
    s.phone,
    s.position,
    s.user_id,
    s.wallet_address,
    s.role,
    s.is_active,
    s.created_at,
    s.updated_at,
    s.notes,
    s.metadata
FROM stakeholders s
JOIN organizations o ON s.organization_id = o.id;

-- Grant access to view
GRANT SELECT ON stakeholder_details TO authenticated;

-- =====================================================
-- UPDATE ORGANIZATIONS RLS POLICY
-- =====================================================
-- Add stakeholder policy to organizations table (stakeholders table now exists)

-- Stakeholders can read their own organization
CREATE POLICY stakeholders_read_own_organization ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM stakeholders
            WHERE user_id = auth.uid()
            AND is_active = true
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE stakeholders IS 'Child entities - stakeholders belong to organizations. Each has email, password, wallet, and role.';
COMMENT ON COLUMN stakeholders.organization_id IS 'Parent organization this stakeholder belongs to';
COMMENT ON COLUMN stakeholders.user_id IS 'Reference to Supabase Auth user';
COMMENT ON COLUMN stakeholders.wallet_address IS 'Blockchain wallet address (unique, required)';
COMMENT ON COLUMN stakeholders.role IS 'Stakeholder role (manufacturer, distributor, regulator, pharmacy, logistics)';

-- =====================================================
-- END OF MIGRATION 03
-- =====================================================
