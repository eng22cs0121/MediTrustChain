-- =====================================================
-- DIAGNOSTIC: Check why batch INSERT is failing
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Check the current user's stakeholder record
SELECT 
    s.id,
    s.user_id,
    s.email,
    s.role,
    s.organization_id,
    s.is_active,
    o.name as organization_name
FROM stakeholders s
LEFT JOIN organizations o ON o.id = s.organization_id
WHERE s.user_id = auth.uid();

-- 2. Check if there's an active stakeholder with organization
SELECT 
    COUNT(*) as active_stakeholder_count,
    organization_id
FROM stakeholders 
WHERE user_id = auth.uid() 
AND is_active = true
GROUP BY organization_id;

-- 3. Check existing batches for that organization
SELECT 
    b.id,
    b.name,
    b.organization_id,
    b.status,
    b.created_at
FROM batches b
WHERE b.organization_id = (
    SELECT s.organization_id 
    FROM stakeholders s 
    WHERE s.user_id = auth.uid() 
    AND s.is_active = true 
    LIMIT 1
)
ORDER BY b.created_at DESC
LIMIT 10;

-- 4. Test if INSERT would work (dry run - won't actually insert)
-- Change the values below to match what you're trying to insert
DO $$
DECLARE
    user_org_id UUID;
BEGIN
    SELECT s.organization_id INTO user_org_id
    FROM stakeholders s
    WHERE s.user_id = auth.uid()
    AND s.is_active = true
    LIMIT 1;
    
    IF user_org_id IS NULL THEN
        RAISE NOTICE '❌ PROBLEM: User has no active stakeholder with organization_id';
    ELSE
        RAISE NOTICE '✅ User organization_id: %', user_org_id;
    END IF;
END $$;

-- 5. QUICK FIX: If stakeholder is_active is false, run this:
-- UPDATE stakeholders SET is_active = true WHERE user_id = auth.uid();
