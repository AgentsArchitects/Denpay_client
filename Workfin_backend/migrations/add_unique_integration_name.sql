-- Add UNIQUE constraint on integration_name to prevent duplicates
-- Migration: Enforce unique integration names in soe.soe_integrations table
-- Date: 2026-02-04

BEGIN;

-- Step 1: Remove any duplicate integration names (keep the first one by integration_id)
DELETE FROM soe.soe_integrations a
USING soe.soe_integrations b
WHERE a.integration_id > b.integration_id
  AND a.integration_name = b.integration_name;

-- Step 2: Add UNIQUE constraint on integration_name
ALTER TABLE soe.soe_integrations
ADD CONSTRAINT soe_integrations_integration_name_key UNIQUE (integration_name);

-- Verification
SELECT
    'Constraint added successfully' as status,
    COUNT(*) as total_integrations,
    COUNT(DISTINCT integration_name) as unique_names
FROM soe.soe_integrations;

COMMIT;

-- Rollback script:
-- BEGIN;
-- ALTER TABLE soe.soe_integrations DROP CONSTRAINT IF EXISTS soe_integrations_integration_name_key;
-- COMMIT;
