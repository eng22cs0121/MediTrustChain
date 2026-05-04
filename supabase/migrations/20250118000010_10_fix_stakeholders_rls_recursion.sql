-- =====================================================
-- MIGRATION 10: FIX STAKEHOLDERS RLS INFINITE RECURSION
-- =====================================================
-- Fixes the infinite recursion issue in stakeholders RLS policies
-- =====================================================

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS stakeholders_read_own_org_stakeholders ON stakeholders;

-- Drop the overly permissive login lookup policy (security risk)
DROP POLICY IF EXISTS stakeholders_login_lookup ON stakeholders;

-- Fix admin policy to include WITH CHECK for INSERT operations
-- The current admin_all_stakeholders policy only has USING, which doesn't cover INSERT
DROP POLICY IF EXISTS admin_all_stakeholders ON stakeholders;

-- Recreate admin policy with both USING and WITH CHECK
CREATE POLICY admin_all_stakeholders ON stakeholders
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

-- Replace with a policy that uses the existing SECURITY DEFINER function to avoid recursion
-- The get_user_organization_id() function already exists and is SECURITY DEFINER
-- This means it bypasses RLS when querying stakeholders, preventing recursion
CREATE POLICY stakeholders_read_own_org_stakeholders ON stakeholders
    FOR SELECT USING (
        -- Use the existing SECURITY DEFINER function (bypasses RLS, no recursion)
        organization_id = get_user_organization_id()
        -- OR if user is an admin (admins can see all via admin_all_stakeholders policy)
        OR EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

-- Note: Login lookup is handled via the SECURITY DEFINER function below
-- We don't need a separate policy for login since:
-- 1. Login happens through Supabase Auth first
-- 2. After auth, we can use user_id to query stakeholders
-- 3. The get_stakeholder_by_email_for_login function handles pre-auth lookups

-- =====================================================
-- ALTERNATIVE: Use SECURITY DEFINER function for login lookup
-- =====================================================

-- Create a function for email lookup during login (bypasses RLS)
CREATE OR REPLACE FUNCTION get_stakeholder_by_email_for_login(p_email VARCHAR)
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    user_id UUID,
    organization_id UUID,
    role stakeholder_role,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.email,
        s.user_id,
        s.organization_id,
        s.role,
        s.is_active
    FROM stakeholders s
    WHERE s.email = LOWER(p_email)
    AND s.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated and anon (for login)
GRANT EXECUTE ON FUNCTION get_stakeholder_by_email_for_login TO authenticated, anon;

-- =====================================================
-- CREATE STAKEHOLDER FUNCTION (BYPASSES RLS FOR ADMINS)
-- =====================================================
-- This function allows admins to create stakeholders, bypassing RLS
-- It validates admin status and then inserts the stakeholder record

CREATE OR REPLACE FUNCTION create_stakeholder_by_admin(
    p_organization_id UUID,
    p_full_name VARCHAR,
    p_email VARCHAR,
    p_wallet_address VARCHAR,
    p_role stakeholder_role,
    p_user_id UUID, -- The auth.users.id from Supabase Auth
    p_created_by UUID, -- The admin user who is creating this
    p_phone VARCHAR DEFAULT NULL,
    p_position VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    full_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    "position" VARCHAR,
    user_id UUID,
    wallet_address VARCHAR,
    role stakeholder_role,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID,
    notes TEXT,
    metadata JSONB
) AS $$
DECLARE
    v_stakeholder_id UUID;
    v_is_admin BOOLEAN;
    v_admin_exists BOOLEAN;
    v_admin_active BOOLEAN;
    v_can_manage BOOLEAN;
BEGIN
    -- Check if the creator (p_created_by) is an admin
    SELECT EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = p_created_by 
        AND is_active = true
        AND can_manage_stakeholders = true
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        -- Provide detailed error message
        SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = p_created_by) INTO v_admin_exists;
        
        IF v_admin_exists THEN
            SELECT is_active, can_manage_stakeholders 
            INTO v_admin_active, v_can_manage
            FROM admin_users 
            WHERE id = p_created_by;
            
            RAISE EXCEPTION 'User not allowed: Admin user exists but is_active=%, can_manage_stakeholders=%. User ID: %. Please ensure your admin user has is_active=true and can_manage_stakeholders=true.', 
                v_admin_active, v_can_manage, p_created_by;
        ELSE
            RAISE EXCEPTION 'User not allowed: User ID % not found in admin_users table. Please create an admin user first. See CHECK_ADMIN_STATUS.sql for help.', p_created_by;
        END IF;
    END IF;
    
    -- Verify organization exists
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id AND is_active = true) THEN
        RAISE EXCEPTION 'Organization not found or inactive';
    END IF;
    
    -- Check for duplicate email
    IF EXISTS (SELECT 1 FROM stakeholders WHERE email = LOWER(p_email)) THEN
        RAISE EXCEPTION 'Email already registered: %', p_email;
    END IF;
    
    -- Check for duplicate wallet
    IF EXISTS (SELECT 1 FROM stakeholders WHERE wallet_address = LOWER(p_wallet_address)) THEN
        RAISE EXCEPTION 'Wallet address already registered';
    END IF;
    
    -- Insert stakeholder (bypasses RLS because function is SECURITY DEFINER)
    INSERT INTO stakeholders (
        organization_id,
        full_name,
        email,
        phone,
        position,
        wallet_address,
        role,
        user_id,
        created_by,
        notes,
        metadata,
        is_active
    ) VALUES (
        p_organization_id,
        p_full_name,
        LOWER(p_email),
        p_phone,
        p_position,
        LOWER(p_wallet_address),
        p_role,
        p_user_id,
        p_created_by,
        p_notes,
        p_metadata,
        true
    )
    RETURNING stakeholders.id INTO v_stakeholder_id;
    
    -- Return the created stakeholder (full record)
    RETURN QUERY
    SELECT 
        s.id,
        s.organization_id,
        s.full_name,
        s.email,
        s.phone,
        s."position",
        s.user_id,
        s.wallet_address,
        s.role,
        s.is_active,
        s.created_at,
        s.updated_at,
        s.created_by,
        s.notes,
        s.metadata
    FROM stakeholders s
    WHERE s.id = v_stakeholder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (admins will be validated inside the function)
GRANT EXECUTE ON FUNCTION create_stakeholder_by_admin TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_stakeholder_by_email_for_login IS 'Secure function for email lookup during login. Bypasses RLS to prevent recursion.';
COMMENT ON POLICY stakeholders_read_own_org_stakeholders ON stakeholders IS 'Allows stakeholders to read their organization members. Uses direct user_id check to avoid recursion.';
COMMENT ON FUNCTION create_stakeholder_by_admin IS 'Admin function to create stakeholders. Bypasses RLS but validates admin status. Use this instead of direct INSERT to avoid RLS issues.';

-- =====================================================
-- END OF MIGRATION 10
-- =====================================================
