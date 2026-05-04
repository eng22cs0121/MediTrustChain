-- =====================================================
-- MIGRATION: Fix Status Enum to Match Blockchain
-- =====================================================
-- Fixes:
-- 1. Removes 'Flagged' status (not in blockchain)
-- 2. Adds proper status mapping
-- 3. Updates CHECK constraints
-- =====================================================

-- Update batches status CHECK constraint
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_status_check;

ALTER TABLE batches ADD CONSTRAINT batches_status_check 
    CHECK (status IN ('Pending', 'Approved', 'Rejected', 'In-Transit', 'At-Pharmacy', 'Sold', 'Expired', 'Recalled'));

-- Update batch_history status CHECK constraint  
ALTER TABLE batch_history DROP CONSTRAINT IF EXISTS batch_history_status_check;

ALTER TABLE batch_history ADD CONSTRAINT batch_history_status_check
    CHECK (status IN ('Pending', 'Approved', 'Rejected', 'In-Transit', 'At-Pharmacy', 'Sold', 'Expired', 'Recalled'));

-- =====================================================
-- Create status mapping function
-- =====================================================
CREATE OR REPLACE FUNCTION get_blockchain_status(db_status TEXT)
RETURNS INTEGER AS $$
BEGIN
    CASE db_status
        WHEN 'Pending' THEN RETURN 0;  -- CREATED (not PENDING_APPROVAL, that's 1)
        WHEN 'Approved' THEN RETURN 2;
        WHEN 'Rejected' THEN RETURN 3;
        WHEN 'In-Transit' THEN RETURN 4;
        WHEN 'At-Pharmacy' THEN RETURN 5;
        WHEN 'Sold' THEN RETURN 6;
        WHEN 'Expired' THEN RETURN 7;
        WHEN 'Recalled' THEN RETURN 8;
        ELSE RETURN 0; -- Default to CREATED
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Create reverse mapping function
-- =====================================================
CREATE OR REPLACE FUNCTION get_db_status(blockchain_status INTEGER)
RETURNS TEXT AS $$
BEGIN
    CASE blockchain_status
        WHEN 0 THEN RETURN 'Pending';  -- CREATED
        WHEN 1 THEN RETURN 'Pending';  -- PENDING_APPROVAL maps to Pending
        WHEN 2 THEN RETURN 'Approved';
        WHEN 3 THEN RETURN 'Rejected';
        WHEN 4 THEN RETURN 'In-Transit';
        WHEN 5 THEN RETURN 'At-Pharmacy';
        WHEN 6 THEN RETURN 'Sold';
        WHEN 7 THEN RETURN 'Expired';
        WHEN 8 THEN RETURN 'Recalled';
        ELSE RETURN 'Pending'; -- Default
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Add comment
-- =====================================================
COMMENT ON FUNCTION get_blockchain_status(TEXT) IS 'Maps database status to blockchain status (uint256)';
COMMENT ON FUNCTION get_db_status(INTEGER) IS 'Maps blockchain status to database status';

-- =====================================================
-- END
-- =====================================================
