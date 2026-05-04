-- =====================================================
-- MIGRATION 05: UPDATE AUDIT LOGS
-- =====================================================
-- Update audit_logs table to work with new structure
-- =====================================================

-- Update foreign key constraint for organization_id in audit_logs
-- (if audit_logs table exists from previous migrations)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        -- Drop old foreign key if it exists
        ALTER TABLE audit_logs 
        DROP CONSTRAINT IF EXISTS fk_audit_logs_organization;
        
        -- Add new foreign key to organizations
        ALTER TABLE audit_logs 
        ADD CONSTRAINT fk_audit_logs_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
        
        -- Update RLS policies for audit_logs
        DROP POLICY IF EXISTS "Admins can read all audit logs" ON audit_logs;
        DROP POLICY IF EXISTS "Users can read their own audit logs" ON audit_logs;
        DROP POLICY IF EXISTS "Users can read audit logs" ON audit_logs;
        DROP POLICY IF EXISTS "Stakeholders can read org audit logs" ON audit_logs;
        
        -- Admins can see all audit logs
        CREATE POLICY "Admins can read all audit logs" ON audit_logs
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM admin_users 
                    WHERE admin_users.id = auth.uid() 
                    AND admin_users.is_active = true
                )
            );
        
        -- Stakeholders can see audit logs for their organization
        CREATE POLICY "Stakeholders can read org audit logs" ON audit_logs
            FOR SELECT USING (
                organization_id IN (
                    SELECT organization_id FROM stakeholders
                    WHERE user_id = auth.uid()
                    AND is_active = true
                )
            );
        
        -- Users can see their own audit logs
        CREATE POLICY "Users can read their own audit logs" ON audit_logs
            FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

-- =====================================================
-- END OF MIGRATION 05
-- =====================================================
