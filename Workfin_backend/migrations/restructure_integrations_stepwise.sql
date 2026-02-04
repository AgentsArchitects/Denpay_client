-- Migration: Restructure soe_integrations and pms_connections (STEP-BY-STEP)
-- Run each section separately to identify any issues

-- =====================
-- STEP 1: Add UNIQUE constraint to clients.tenant_id
-- =====================
-- Run this first, then verify before proceeding

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = '"denpay-dev".clients'::regclass
        AND conname = 'clients_tenant_id_key'
    ) THEN
        ALTER TABLE "denpay-dev".clients
            ADD CONSTRAINT clients_tenant_id_key UNIQUE (tenant_id);
        RAISE NOTICE 'Added UNIQUE constraint to clients.tenant_id';
    ELSE
        RAISE NOTICE 'UNIQUE constraint already exists on clients.tenant_id';
    END IF;
END $$;

-- Verify Step 1:
SELECT
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = '"denpay-dev".clients'::regclass
  AND conname = 'clients_tenant_id_key';
-- Expected: One row with constraint_name = 'clients_tenant_id_key', constraint_type = 'u'


-- =====================
-- STEP 2: Backup existing data (OPTIONAL but RECOMMENDED)
-- =====================

-- CREATE TABLE soe.soe_integrations_backup AS SELECT * FROM soe.soe_integrations;
-- CREATE TABLE integrations.pms_connections_backup AS SELECT * FROM integrations.pms_connections;


-- =====================
-- STEP 3: Recreate soe.soe_integrations
-- =====================

DROP TABLE IF EXISTS soe.soe_integrations CASCADE;

CREATE TABLE soe.soe_integrations (
    integration_id VARCHAR(8) PRIMARY KEY,
    integration_name VARCHAR NOT NULL,
    source_table VARCHAR,
    tenant_id VARCHAR(8),
    tenant_name VARCHAR,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key
ALTER TABLE soe.soe_integrations
    ADD CONSTRAINT fk_soe_integrations_tenant
    FOREIGN KEY (tenant_id) REFERENCES "denpay-dev".clients(tenant_id)
    ON DELETE CASCADE;

-- Add indexes
CREATE INDEX idx_soe_integrations_tenant ON soe.soe_integrations(tenant_id);
CREATE INDEX idx_soe_integrations_name ON soe.soe_integrations(integration_name);

-- Verify Step 3:
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'soe' AND table_name = 'soe_integrations'
ORDER BY ordinal_position;
-- Expected: integration_id (varchar), integration_name (varchar), source_table (varchar),
--           tenant_id (varchar), tenant_name (varchar), last_synced_at (timestamp)


-- =====================
-- STEP 4: Add columns to pms_connections
-- =====================

ALTER TABLE integrations.pms_connections
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(8),
    ADD COLUMN IF NOT EXISTS tenant_name VARCHAR;

-- Verify Step 4:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'integrations'
  AND table_name = 'pms_connections'
  AND column_name IN ('tenant_id', 'tenant_name', 'client_id');
-- Expected: tenant_id (varchar, YES), tenant_name (varchar, YES), client_id (uuid, YES)


-- =====================
-- STEP 5: Migrate data from client_id to tenant_id
-- =====================

-- First, check how many rows need migration
SELECT
    'Rows to migrate' as status,
    COUNT(*) as count
FROM integrations.pms_connections
WHERE client_id IS NOT NULL AND tenant_id IS NULL;

-- Migrate client_id to tenant_id
UPDATE integrations.pms_connections pms
SET tenant_id = c.tenant_id,
    tenant_name = c.legal_trading_name
FROM "denpay-dev".clients c
WHERE pms.client_id = c.id
  AND pms.tenant_id IS NULL;

-- Check if any rows still have NULL tenant_id
SELECT
    'Rows with NULL tenant_id' as status,
    COUNT(*) as count
FROM integrations.pms_connections
WHERE tenant_id IS NULL;

-- For rows with NULL tenant_id, use integration_id as fallback
UPDATE integrations.pms_connections
SET tenant_id = COALESCE(tenant_id, integration_id),
    tenant_name = COALESCE(tenant_name, integration_name)
WHERE tenant_id IS NULL;

-- Verify Step 5:
SELECT
    tenant_id,
    tenant_name,
    integration_id,
    integration_name,
    pms_type
FROM integrations.pms_connections
ORDER BY created_at DESC
LIMIT 5;
-- Expected: All rows should have tenant_id populated


-- =====================
-- STEP 6: Make columns NOT NULL
-- =====================

-- Check for any NULLs before making columns NOT NULL
SELECT
    COUNT(*) FILTER (WHERE integration_id IS NULL) as null_integration_ids,
    COUNT(*) FILTER (WHERE tenant_id IS NULL) as null_tenant_ids
FROM integrations.pms_connections;
-- Expected: Both should be 0

-- If both are 0, proceed:
ALTER TABLE integrations.pms_connections
    ALTER COLUMN integration_id SET NOT NULL,
    ALTER COLUMN tenant_id SET NOT NULL;


-- =====================
-- STEP 7: Add foreign key constraint
-- =====================

ALTER TABLE integrations.pms_connections
    ADD CONSTRAINT fk_pms_connections_tenant
    FOREIGN KEY (tenant_id) REFERENCES "denpay-dev".clients(tenant_id)
    ON DELETE CASCADE;

-- Verify Step 7:
SELECT
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'integrations.pms_connections'::regclass
  AND conname = 'fk_pms_connections_tenant';
-- Expected: One row showing the foreign key constraint


-- =====================
-- STEP 8: Drop client_id column
-- =====================

ALTER TABLE integrations.pms_connections
    DROP COLUMN IF EXISTS client_id;

-- Verify Step 8:
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'integrations'
  AND table_name = 'pms_connections'
  AND column_name = 'client_id';
-- Expected: No rows (client_id should be gone)


-- =====================
-- STEP 9: Update CHECK constraints
-- =====================

ALTER TABLE integrations.pms_connections
    DROP CONSTRAINT IF EXISTS pms_connections_pms_type_check;

ALTER TABLE integrations.pms_connections
    ADD CONSTRAINT pms_connections_pms_type_check
    CHECK (pms_type IN ('SOE', 'SFD', 'DENTALLY', 'CARESTACK', 'COMPASS', 'XERO'));

-- Verify Step 9:
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'integrations.pms_connections'::regclass
  AND conname = 'pms_connections_pms_type_check';
-- Expected: Should show CHECK constraint with all 6 PMS types


-- =====================
-- STEP 10: Create indexes
-- =====================

CREATE INDEX IF NOT EXISTS idx_pms_connections_tenant ON integrations.pms_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pms_connections_integration ON integrations.pms_connections(integration_id);
CREATE INDEX IF NOT EXISTS idx_pms_connections_pms_type ON integrations.pms_connections(pms_type);

-- Verify Step 10:
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'integrations'
  AND tablename = 'pms_connections'
  AND indexname LIKE 'idx_pms_connections_%';
-- Expected: Three indexes (tenant, integration, pms_type)


-- =====================
-- FINAL VERIFICATION
-- =====================

-- Check soe_integrations structure
SELECT
    'soe.soe_integrations' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT integration_id) as unique_integrations,
    COUNT(DISTINCT tenant_id) as unique_tenants,
    COUNT(*) FILTER (WHERE tenant_id IS NULL) as null_tenant_ids
FROM soe.soe_integrations;

-- Check pms_connections structure
SELECT
    'integrations.pms_connections' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT tenant_id) as unique_tenants,
    COUNT(DISTINCT integration_id) as unique_integrations,
    COUNT(*) FILTER (WHERE tenant_id IS NULL) as null_tenant_ids,
    COUNT(*) FILTER (WHERE integration_id IS NULL) as null_integration_ids
FROM integrations.pms_connections;

-- Verify tenant_id linkage
SELECT
    'Tenant linkage' as check_name,
    c.tenant_id,
    c.legal_trading_name,
    COUNT(DISTINCT pms.id) as pms_connections_count,
    COUNT(DISTINCT soe.integration_id) as soe_integrations_count
FROM "denpay-dev".clients c
LEFT JOIN integrations.pms_connections pms ON pms.tenant_id = c.tenant_id
LEFT JOIN soe.soe_integrations soe ON soe.tenant_id = c.tenant_id
GROUP BY c.tenant_id, c.legal_trading_name
ORDER BY c.legal_trading_name;

-- SUCCESS! Migration complete.
