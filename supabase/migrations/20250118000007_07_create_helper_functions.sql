-- =====================================================
-- MIGRATION 07: CREATE HELPER FUNCTIONS
-- =====================================================
-- Utility functions for the hierarchical structure
-- =====================================================

-- Function to get all stakeholders for an organization
CREATE OR REPLACE FUNCTION get_organization_stakeholders(p_organization_id UUID)
RETURNS TABLE (
    id UUID,
    full_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    "position" VARCHAR,
    wallet_address VARCHAR,
    role stakeholder_role,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.full_name,
        s.email,
        s.phone,
        s."position",
        s.wallet_address,
        s.role,
        s.is_active,
        s.created_at
    FROM stakeholders s
    WHERE s.organization_id = p_organization_id
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid() 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is stakeholder
CREATE OR REPLACE FUNCTION is_stakeholder()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM stakeholders
        WHERE user_id = auth.uid()
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get stakeholder details for current user
CREATE OR REPLACE FUNCTION get_current_stakeholder()
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    organization_name VARCHAR,
    full_name VARCHAR,
    email VARCHAR,
    wallet_address VARCHAR,
    role stakeholder_role
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.organization_id,
        o.name as organization_name,
        s.full_name,
        s.email,
        s.wallet_address,
        s.role
    FROM stakeholders s
    JOIN organizations o ON s.organization_id = o.id
    WHERE s.user_id = auth.uid()
    AND s.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_organization_stakeholders IS 'Get all stakeholders for an organization';
COMMENT ON FUNCTION is_admin IS 'Check if current user is an admin';
COMMENT ON FUNCTION is_stakeholder IS 'Check if current user is a stakeholder';
COMMENT ON FUNCTION get_current_stakeholder IS 'Get stakeholder details for current authenticated user';

-- =====================================================
-- END OF MIGRATION 07
-- =====================================================
