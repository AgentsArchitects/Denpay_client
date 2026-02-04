-- Add UNIQUE constraint on (tenant_id, integration_name) to prevent duplicate integration names per client
-- Migration: Enforce unique integration names per tenant
-- Date: 2026-02-04

BEGIN;

-- Step 1: Remove any duplicate integration names for the same tenant (keep the first one)
DELETE FROM integrations.pms_connections a
USING integrations.pms_connections b
WHERE a.id > b.id
  AND a.tenant_id = b.tenant_id
  AND a.integration_name = b.integration_name;

-- Step 2: Add UNIQUE constraint on (tenant_id, integration_name)
ALTER TABLE integrations.pms_connections
ADD CONSTRAINT pms_connections_tenant_integration_name_key
UNIQUE (tenant_id, integration_name);

-- Verification
SELECT
    'Constraint added successfully' as status,
    tenant_id,
    COUNT(*) as total_integrations,
    COUNT(DISTINCT integration_name) as unique_names
FROM integrations.pms_connections
GROUP BY tenant_id
ORDER BY tenant_id;

COMMIT;

-- Rollback script:
-- BEGIN;
-- ALTER TABLE integrations.pms_connections DROP CONSTRAINT IF EXISTS pms_connections_tenant_integration_name_key;
-- COMMIT;
