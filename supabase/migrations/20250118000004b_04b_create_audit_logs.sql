-- =====================================================
-- MIGRATION 04B: CREATE AUDIT LOGS TABLE
-- =====================================================
-- Creates the audit_logs table for system audit trail
-- This should run AFTER migration 04 (admin_users) and BEFORE migration 05
-- IMPORTANT: Run this migration manually in Supabase SQL Editor
-- =====================================================

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    resource VARCHAR(255),
    action VARCHAR(100),
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'denied')),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (from migration 05)
DROP POLICY IF EXISTS "Admins can read all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Stakeholders can read org audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can read their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

-- RLS Policies
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

-- Anyone authenticated can insert audit logs (for logging purposes)
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- END OF MIGRATION 04B
-- =====================================================
