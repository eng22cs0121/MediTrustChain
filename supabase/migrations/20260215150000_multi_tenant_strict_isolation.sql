-- =====================================================
-- MIGRATION: MULTI-TENANT ARCHITECTURE WITH STRICT DATA ISOLATION
-- =====================================================
-- Purpose: Implement production-ready multi-tenancy where:
-- 1. Admin creates independent organizations (A, B, C, etc.)
-- 2. Each organization is a completely isolated ecosystem
-- 3. No cross-organization data leakage
-- 4. Only Admin can view all organizations' data
-- =====================================================

-- =====================================================
-- STEP 1: MAKE ORGANIZATION TYPE OPTIONAL
-- =====================================================
-- Organizations are now neutral containers - they just hold company info.
-- The organization_type becomes optional (represents primary business type)
-- Stakeholders have their own roles within the organization.

ALTER TABLE organizations 
ALTER COLUMN organization_type DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN organizations.organization_type IS 
'Optional: Primary business type of the organization. Stakeholders have their own roles independent of this field.';

-- =====================================================
-- STEP 2: CREATE CBAC PERMISSIONS TABLE
-- =====================================================
-- Claims-Based Access Control for fine-grained permissions

CREATE TABLE IF NOT EXISTS cbac_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Permission flags
    can_create_batches BOOLEAN DEFAULT false,
    can_approve_batches BOOLEAN DEFAULT false,
    can_reject_batches BOOLEAN DEFAULT false,
    can_recall_batches BOOLEAN DEFAULT false,
    can_update_status BOOLEAN DEFAULT false,
    can_view_all_batches BOOLEAN DEFAULT false,
    can_view_analytics BOOLEAN DEFAULT false,
    can_export_data BOOLEAN DEFAULT false,
    can_manage_stakeholders BOOLEAN DEFAULT false,
    
    -- Custom permissions (JSON for extensibility)
    custom_permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- UNIQUE: One permission set per stakeholder per organization
    UNIQUE(stakeholder_id, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cbac_permissions_stakeholder ON cbac_permissions(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_cbac_permissions_org ON cbac_permissions(organization_id);

-- Create trigger for updated_at
CREATE TRIGGER update_cbac_permissions_updated_at
    BEFORE UPDATE ON cbac_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 3: CREATE ORGANIZATION ROLES TABLE (for role templates)
-- =====================================================
-- Pre-defined permission templates based on stakeholder roles

CREATE TABLE IF NOT EXISTS organization_role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL, -- manufacturer, regulator, distributor, logistics, pharmacy
    
    -- Default permissions for this role in this organization
    can_create_batches BOOLEAN DEFAULT false,
    can_approve_batches BOOLEAN DEFAULT false,
    can_reject_batches BOOLEAN DEFAULT false,
    can_recall_batches BOOLEAN DEFAULT false,
    can_update_status BOOLEAN DEFAULT false,
    can_view_all_batches BOOLEAN DEFAULT true,
    can_view_analytics BOOLEAN DEFAULT true,
    can_export_data BOOLEAN DEFAULT false,
    can_manage_stakeholders BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique indexes instead of UNIQUE constraint with COALESCE
-- For org-specific templates
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_role_templates_org_role 
ON organization_role_templates(organization_id, role_name) 
WHERE organization_id IS NOT NULL;

-- For global templates (where organization_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_role_templates_global_role 
ON organization_role_templates(role_name) 
WHERE organization_id IS NULL;

-- Insert default global role templates
INSERT INTO organization_role_templates (organization_id, role_name, can_create_batches, can_approve_batches, can_reject_batches, can_recall_batches, can_update_status, can_view_all_batches, can_view_analytics, can_export_data)
VALUES 
    (NULL, 'manufacturer', true, false, false, false, false, true, true, true),
    (NULL, 'regulator', false, true, true, true, false, true, true, true),
    (NULL, 'distributor', false, false, false, false, true, true, true, false),
    (NULL, 'logistics', false, false, false, false, true, true, true, false),
    (NULL, 'pharmacy', false, false, false, false, true, true, true, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 4: UPDATE RLS POLICIES FOR STRICT ISOLATION
-- =====================================================

-- 4.1 BATCHES - Strict organization isolation
DROP POLICY IF EXISTS "Admins can read all batches" ON batches;
DROP POLICY IF EXISTS "Stakeholders can read org batches" ON batches;
DROP POLICY IF EXISTS "Stakeholders can create org batches" ON batches;
DROP POLICY IF EXISTS "Stakeholders can update org batches" ON batches;
DROP POLICY IF EXISTS "admin_all_batches" ON batches;
DROP POLICY IF EXISTS "stakeholder_read_batches" ON batches;
DROP POLICY IF EXISTS "stakeholder_insert_batches" ON batches;
DROP POLICY IF EXISTS "stakeholder_update_batches" ON batches;

-- Admin can do everything
CREATE POLICY "admin_full_access_batches" ON batches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

-- Stakeholders: STRICT organization-scoped access
-- Uses direct organization_id check to prevent cross-org access
CREATE POLICY "stakeholder_select_own_org_batches" ON batches
    FOR SELECT USING (
        organization_id = (
            SELECT s.organization_id FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.is_active = true
            LIMIT 1
        )
    );

CREATE POLICY "stakeholder_insert_own_org_batches" ON batches
    FOR INSERT WITH CHECK (
        organization_id = (
            SELECT s.organization_id FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.is_active = true
            LIMIT 1
        )
    );

CREATE POLICY "stakeholder_update_own_org_batches" ON batches
    FOR UPDATE USING (
        organization_id = (
            SELECT s.organization_id FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.is_active = true
            LIMIT 1
        )
    );

-- 4.2 BATCH_HISTORY - Strict organization isolation
DROP POLICY IF EXISTS "admin_all_batch_history" ON batch_history;
DROP POLICY IF EXISTS "stakeholders_read_org_batch_history" ON batch_history;
DROP POLICY IF EXISTS "stakeholders_insert_org_batch_history" ON batch_history;

CREATE POLICY "admin_full_access_batch_history" ON batch_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

CREATE POLICY "stakeholder_select_own_org_batch_history" ON batch_history
    FOR SELECT USING (
        batch_id IN (
            SELECT b.id FROM batches b
            WHERE b.organization_id = (
                SELECT s.organization_id FROM stakeholders s
                WHERE s.user_id = auth.uid()
                AND s.is_active = true
                LIMIT 1
            )
        )
    );

CREATE POLICY "stakeholder_insert_own_org_batch_history" ON batch_history
    FOR INSERT WITH CHECK (
        batch_id IN (
            SELECT b.id FROM batches b
            WHERE b.organization_id = (
                SELECT s.organization_id FROM stakeholders s
                WHERE s.user_id = auth.uid()
                AND s.is_active = true
                LIMIT 1
            )
        )
    );

-- 4.3 ANOMALIES - Strict organization isolation  
DROP POLICY IF EXISTS "admin_all_anomalies" ON anomalies;
DROP POLICY IF EXISTS "stakeholders_view_org_anomalies" ON anomalies;
DROP POLICY IF EXISTS "stakeholders_manage_assigned_anomalies" ON anomalies;

CREATE POLICY "admin_full_access_anomalies" ON anomalies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

CREATE POLICY "stakeholder_select_own_org_anomalies" ON anomalies
    FOR SELECT USING (
        organization_id = (
            SELECT s.organization_id FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.is_active = true
            LIMIT 1
        )
    );

CREATE POLICY "stakeholder_update_own_org_anomalies" ON anomalies
    FOR UPDATE USING (
        organization_id = (
            SELECT s.organization_id FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.is_active = true
            LIMIT 1
        )
    );

-- 4.4 NOTIFICATIONS - User-scoped (already correct, but ensure)
DROP POLICY IF EXISTS "users_own_notifications" ON notifications;

CREATE POLICY "user_select_own_notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_update_own_notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "admin_full_access_notifications" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

-- 4.5 AUDIT_LOGS - Admin-only and organization-scoped
DROP POLICY IF EXISTS "admin_all_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "stakeholder_read_org_audit_logs" ON audit_logs;

CREATE POLICY "admin_full_access_audit_logs" ON audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

CREATE POLICY "stakeholder_select_own_org_audit_logs" ON audit_logs
    FOR SELECT USING (
        organization_id = (
            SELECT s.organization_id FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.is_active = true
            LIMIT 1
        )
    );

-- 4.6 CBAC_PERMISSIONS - Enable RLS
ALTER TABLE cbac_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_cbac_permissions" ON cbac_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

CREATE POLICY "stakeholder_select_own_cbac_permissions" ON cbac_permissions
    FOR SELECT USING (stakeholder_id IN (
        SELECT id FROM stakeholders WHERE user_id = auth.uid()
    ));

-- 4.7 ORGANIZATION_ROLE_TEMPLATES - Enable RLS
ALTER TABLE organization_role_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_role_templates" ON organization_role_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid() 
            AND admin_users.is_active = true
        )
    );

CREATE POLICY "stakeholder_select_role_templates" ON organization_role_templates
    FOR SELECT USING (
        organization_id IS NULL -- Global templates
        OR organization_id = (
            SELECT s.organization_id FROM stakeholders s
            WHERE s.user_id = auth.uid()
            AND s.is_active = true
            LIMIT 1
        )
    );

-- =====================================================
-- STEP 5: ADD ORGANIZATION_ID TO AUDIT_LOGS IF MISSING
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
    END IF;
END $$;

-- =====================================================
-- STEP 6: CREATE HELPER FUNCTIONS FOR MULTI-TENANCY
-- =====================================================

-- Get current user's organization_id (for use in queries)
CREATE OR REPLACE FUNCTION get_current_user_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT s.organization_id INTO org_id
    FROM stakeholders s
    WHERE s.user_id = auth.uid()
    AND s.is_active = true
    LIMIT 1;
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid() 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get stakeholder's CBAC permissions
CREATE OR REPLACE FUNCTION get_stakeholder_permissions(stakeholder_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    perms JSONB;
BEGIN
    SELECT row_to_json(cp)::jsonb INTO perms
    FROM cbac_permissions cp
    WHERE cp.stakeholder_id = stakeholder_uuid;
    
    -- If no custom permissions, get from role template
    IF perms IS NULL THEN
        SELECT row_to_json(rt)::jsonb INTO perms
        FROM stakeholders s
        JOIN organization_role_templates rt 
            ON (rt.organization_id = s.organization_id OR rt.organization_id IS NULL)
            AND rt.role_name = s.role::text
        WHERE s.id = stakeholder_uuid
        ORDER BY rt.organization_id NULLS LAST -- Prefer org-specific template
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(perms, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 7: CREATE VIEW FOR ORGANIZATION SUMMARY
-- =====================================================

CREATE OR REPLACE VIEW organization_summary AS
SELECT 
    o.id,
    o.name,
    o.organization_type,
    o.registration_number,
    o.country,
    o.is_active,
    o.created_at,
    (SELECT COUNT(*) FROM stakeholders s WHERE s.organization_id = o.id AND s.is_active = true) as stakeholder_count,
    (SELECT COUNT(*) FROM batches b WHERE b.organization_id = o.id) as batch_count,
    (SELECT COUNT(*) FROM anomalies a WHERE a.organization_id = o.id AND a.status = 'new') as active_anomalies,
    (SELECT json_agg(DISTINCT s.role) FROM stakeholders s WHERE s.organization_id = o.id AND s.is_active = true) as active_roles
FROM organizations o
WHERE o.is_active = true;

-- Grant access to view
GRANT SELECT ON organization_summary TO authenticated;

-- =====================================================
-- STEP 8: ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE cbac_permissions IS 'Claims-Based Access Control permissions for stakeholders. Overrides role template defaults.';
COMMENT ON TABLE organization_role_templates IS 'Default permission templates for each role. Can be global (organization_id NULL) or organization-specific.';
COMMENT ON FUNCTION get_current_user_organization_id() IS 'Returns the organization_id of the current authenticated user (stakeholder)';
COMMENT ON FUNCTION is_current_user_admin() IS 'Returns true if the current user is a system admin';
COMMENT ON FUNCTION get_stakeholder_permissions(UUID) IS 'Returns CBAC permissions for a stakeholder, falling back to role templates';
COMMENT ON VIEW organization_summary IS 'Summary view of all organizations with stakeholder and batch counts';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
