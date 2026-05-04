-- =====================================================
-- MIGRATION 04: CREATE ADMIN USERS TABLE
-- =====================================================
-- Admin users (project owners) manage organizations and stakeholders
-- =====================================================

-- =====================================================
-- ADMIN USERS TABLE
-- =====================================================
-- Track admin users (linked to auth.users)
-- Project owners have full control over the system
CREATE TABLE admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- Admin metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ,
    
    -- Permissions (all true by default for project owner)
    can_manage_organizations BOOLEAN DEFAULT true,
    can_manage_stakeholders BOOLEAN DEFAULT true,
    
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin can read their own admin record
CREATE POLICY admin_read_self ON admin_users
    FOR SELECT USING (id = auth.uid());

-- Admins can update their own record
CREATE POLICY admin_update_self ON admin_users
    FOR UPDATE USING (id = auth.uid());

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE admin_users IS 'Project owners (system admins) with full control over organizations and stakeholders';

-- =====================================================
-- END OF MIGRATION 04
-- =====================================================
