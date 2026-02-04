-- Cleanup Script: Remove backup tables and temporary objects after successful migration
-- Run this ONLY after verifying the migration was successful and everything is working

BEGIN;

-- =====================
-- STEP 1: Drop backup tables (if they exist)
-- =====================

DROP TABLE IF EXISTS soe.soe_integrations_backup CASCADE;
DROP TABLE IF EXISTS integrations.pms_connections_backup CASCADE;

-- =====================
-- STEP 2: Drop old/unused tables from previous structure
-- =====================

-- Check and drop any old migration artifacts
DROP TABLE IF EXISTS integrations.pms_connections_old CASCADE;
DROP TABLE IF EXISTS soe.soe_integrations_old CASCADE;

-- =====================
-- STEP 3: Clean up unused indexes (if any exist from old structure)
-- =====================

-- Drop any duplicate or old indexes that might exist
DROP INDEX IF EXISTS soe.idx_soe_integrations_id;
DROP INDEX IF EXISTS integrations.idx_pms_connections_client_id;

-- =====================
-- STEP 4: Vacuum and analyze tables for optimal performance
-- =====================

-- Note: VACUUM cannot run inside a transaction block, so these are commented out
-- Run them separately after this script completes

-- VACUUM ANALYZE soe.soe_integrations;
-- VACUUM ANALYZE integrations.pms_connections;
-- VACUUM ANALYZE integrations.sync_history;
-- VACUUM ANALYZE soe.patients;
-- VACUUM ANALYZE soe.appointments;
-- VACUUM ANALYZE soe.providers;

COMMIT;

-- =====================
-- VERIFICATION: Check what tables remain
-- =====================

-- List all tables in soe schema
SELECT
    'soe schema tables' as info,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'soe'
ORDER BY tablename;

-- List all tables in integrations schema
SELECT
    'integrations schema tables' as info,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'integrations'
ORDER BY tablename;

-- List all views in integrations schema
SELECT
    'integrations schema views' as info,
    schemaname,
    viewname
FROM pg_views
WHERE schemaname = 'integrations'
ORDER BY viewname;

-- =====================
-- FINAL SUMMARY
-- =====================

SELECT
    'Cleanup completed successfully' as status,
    current_timestamp as cleanup_time;

SELECT
    'Next: Run VACUUM ANALYZE on main tables outside transaction' as next_step;
