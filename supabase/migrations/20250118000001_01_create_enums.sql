-- =====================================================
-- MIGRATION 01: CREATE ENUMS
-- =====================================================
-- Creates all enum types needed for the hierarchical structure
-- =====================================================

-- Organization Types (roles that stakeholders can have)
CREATE TYPE organization_type AS ENUM (
    'manufacturer',
    'distributor',
    'regulator',
    'pharmacy',
    'logistics'
);

-- Stakeholder Role (matches organization_type)
CREATE TYPE stakeholder_role AS ENUM (
    'manufacturer',
    'distributor',
    'regulator',
    'pharmacy',
    'logistics'
);

-- =====================================================
-- END OF MIGRATION 01
-- =====================================================
