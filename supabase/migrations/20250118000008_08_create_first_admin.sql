-- =====================================================
-- MIGRATION 08: CREATE FIRST ADMIN (OPTIONAL)
-- =====================================================
-- This migration creates the first admin user
-- NOTE: This is a TEMPLATE - you must create the admin user manually
-- =====================================================

-- ⚠️ IMPORTANT: This migration is OPTIONAL and requires manual setup
-- 
-- BEFORE RUNNING THIS MIGRATION:
-- 1. Create admin user in Supabase Auth Dashboard:
--    - Go to: Authentication > Users > Add user
--    - Email: admin@yourdomain.com
--    - Password: (set secure password)
--    - Auto Confirm User: ✅ (check this!)
--    - Copy the User UUID
--
-- 2. Then either:
--    A) Uncomment and update the code below, OR
--    B) Skip this migration and use direct SQL (see ADMIN_SETUP_GUIDE.md)
--
-- =====================================================
-- OPTION 1: Automated (Uncomment and update email)
-- =====================================================
-- Replace 'admin@example.com' with your actual admin email

/*
DO $$
DECLARE
    v_admin_user_id UUID;
    v_admin_email VARCHAR := 'admin@example.com';  -- ⬅️ UPDATE THIS
    v_admin_name VARCHAR := 'System Administrator';  -- ⬅️ UPDATE THIS (optional)
BEGIN
    -- Get the admin user ID from auth.users
    SELECT id INTO v_admin_user_id
    FROM auth.users
    WHERE email = v_admin_email
    LIMIT 1;
    
    -- If admin user exists in auth, create admin_users record
    IF v_admin_user_id IS NOT NULL THEN
        INSERT INTO admin_users (id, full_name, email, is_active)
        VALUES (v_admin_user_id, v_admin_name, v_admin_email, true)
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Admin user created successfully: %', v_admin_email;
    ELSE
        RAISE EXCEPTION 'Admin user not found in auth.users. Please create the user in Supabase Auth Dashboard first.';
    END IF;
END $$;
*/

-- =====================================================
-- OPTION 2: Manual SQL (Recommended for first-time setup)
-- =====================================================
-- Run this directly in SQL Editor after creating auth user:
--
-- INSERT INTO admin_users (id, full_name, email, is_active)
-- VALUES (
--     'YOUR_USER_ID_HERE',        -- ⬅️ Paste UUID from auth.users
--     'System Administrator',      -- ⬅️ Your preferred name
--     'admin@yourdomain.com',      -- ⬅️ Your admin email
--     true
-- )
-- ON CONFLICT (id) DO NOTHING;
--
-- =====================================================
-- FIND YOUR USER ID (if you forgot)
-- =====================================================
-- Run this query to find your admin user ID:
--
-- SELECT id, email, created_at 
-- FROM auth.users 
-- WHERE email = 'admin@yourdomain.com';
--
-- =====================================================
-- DETAILED INSTRUCTIONS
-- =====================================================
-- See ADMIN_SETUP_GUIDE.md for complete step-by-step instructions
-- =====================================================

-- =====================================================
-- END OF MIGRATION 08
-- =====================================================
