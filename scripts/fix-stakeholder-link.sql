-- =====================================================
-- DIAGNOSTIC: Find why user has no stakeholder record
-- =====================================================

-- 1. Who am I? (Current authenticated user)
SELECT 
    auth.uid() as my_user_id,
    auth.email() as my_email;

-- 2. Check ALL stakeholders (to see what exists)
SELECT id, user_id, email, role, organization_id, is_active 
FROM stakeholders 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check if there's a stakeholder with MY email (but wrong user_id)
SELECT * FROM stakeholders WHERE email = auth.email();

-- 4. Check admin_users table
SELECT * FROM admin_users WHERE id = auth.uid();

-- =====================================================
-- FIX: Link existing stakeholder to your user_id
-- =====================================================
-- If query #3 shows a stakeholder with your email but wrong user_id, run:
-- UPDATE stakeholders SET user_id = auth.uid() WHERE email = auth.email();

-- OR create a new stakeholder (replace EMAIL/ORG_ID):
/*
INSERT INTO stakeholders (email, role, organization_id, user_id, is_active, wallet_address)
SELECT 
    'YOUR_EMAIL@example.com',
    'manufacturer',
    (SELECT id FROM organizations WHERE name = 'ANEKAL' LIMIT 1),
    auth.uid(),
    true,
    '0xYOUR_WALLET_ADDRESS';
*/
