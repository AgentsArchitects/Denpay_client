-- Migration: Clean restructure for multi-tenant architecture
-- Date: 2026-02-04
-- WARNING: This will DELETE existing data in soe.soe_integrations and integrations.pms_connections
-- Data can be re-synced from Gold Layer after migration

BEGIN;

-- =====================
-- STEP 0: Check if clients.tenant_id can be PRIMARY KEY
-- =====================

-- Option A: If clients table has few records and you can recreate it
-- Option B: If clients table is critical, we'll add UNIQUE constraint instead

-- Let's check the current structure
DO $$
DECLARE
    has_data boolean;
BEGIN
    -- Check if clients table exists and has the id column as PK
    SELECT EXISTS(
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'denpay-dev'
        AND table_name = 'clients'
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name LIKE '%_pkey'
    ) INTO has_data;

    IF has_data THEN
        RAISE NOTICE 'Clients table exists with PRIMARY KEY on id column';
        RAISE NOTICE 'Adding UNIQUE constraint to tenant_id instead';
    END IF;
END $$;

-- Add UNIQUE constraint to tenant_id (safer than changing PK)
ALTER TABLE "denpay-dev".clients
    DROP CONSTRAINT IF EXISTS clients_tenant_id_key;

ALTER TABLE "denpay-dev".clients
    ADD CONSTRAINT clients_tenant_id_key UNIQUE (tenant_id);

-- Ensure tenant_id is NOT NULL
ALTER TABLE "denpay-dev".clients
    ALTER COLUMN tenant_id SET NOT NULL;


-- =====================
-- STEP 1: Clean up integrations.pms_connections
-- =====================

-- Drop dependent views
DROP VIEW IF EXISTS integrations.v_connection_summary CASCADE;

-- Drop all existing connections (data will be recreated from UI)
TRUNCATE TABLE integrations.pms_connections CASCADE;

-- Drop and recreate table with new structure
DROP TABLE IF EXISTS integrations.pms_connections CASCADE;

CREATE TABLE integrations.pms_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(8) NOT NULL,
    tenant_name VARCHAR,
    practice_id UUID,
    pms_type VARCHAR NOT NULL,
    integration_id VARCHAR(8) NOT NULL,
    integration_name VARCHAR NOT NULL,
    external_practice_id VARCHAR,
    external_site_code VARCHAR,
    data_source VARCHAR,
    sync_frequency VARCHAR,
    sync_config JSONB,
    sync_patients BOOLEAN DEFAULT TRUE,
    sync_appointments BOOLEAN DEFAULT TRUE,
    sync_providers BOOLEAN DEFAULT TRUE,
    sync_treatments BOOLEAN DEFAULT FALSE,
    sync_billing BOOLEAN DEFAULT FALSE,
    connection_status VARCHAR DEFAULT 'CONNECTED',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR,
    last_sync_error TEXT,
    last_sync_records_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- Foreign key to master clients table
    CONSTRAINT fk_pms_connections_tenant
        FOREIGN KEY (tenant_id) REFERENCES "denpay-dev".clients(tenant_id)
        ON DELETE CASCADE,

    -- CHECK constraints
    CONSTRAINT pms_connections_pms_type_check
        CHECK (pms_type IN ('SOE', 'SFD', 'DENTALLY', 'CARESTACK', 'COMPASS', 'XERO')),
    CONSTRAINT pms_connections_connection_status_check
        CHECK (connection_status IN ('PENDING', 'TESTING', 'CONNECTED', 'ERROR', 'DISABLED')),
    CONSTRAINT pms_connections_data_source_check
        CHECK (data_source IN ('GOLD_LAYER', 'DIRECT_API', 'FILE_UPLOAD')),
    CONSTRAINT pms_connections_sync_frequency_check
        CHECK (sync_frequency IN ('REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MANUAL'))
);

-- Create indexes
CREATE INDEX idx_pms_connections_tenant ON integrations.pms_connections(tenant_id);
CREATE INDEX idx_pms_connections_integration ON integrations.pms_connections(integration_id);
CREATE INDEX idx_pms_connections_pms_type ON integrations.pms_connections(pms_type);
CREATE INDEX idx_pms_connections_status ON integrations.pms_connections(connection_status);


-- =====================
-- STEP 2: Clean up soe.soe_integrations
-- =====================

-- Drop and recreate with correct structure
DROP TABLE IF EXISTS soe.soe_integrations CASCADE;

CREATE TABLE soe.soe_integrations (
    integration_id VARCHAR(8) PRIMARY KEY,
    integration_name VARCHAR NOT NULL,
    source_table VARCHAR,
    tenant_id VARCHAR(8),
    tenant_name VARCHAR,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key to master clients table (nullable for now)
    CONSTRAINT fk_soe_integrations_tenant
        FOREIGN KEY (tenant_id) REFERENCES "denpay-dev".clients(tenant_id)
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_soe_integrations_tenant ON soe.soe_integrations(tenant_id);
CREATE INDEX idx_soe_integrations_name ON soe.soe_integrations(integration_name);


-- =====================
-- STEP 3: Clean up SOE data tables (optional - keeps existing patient/appointment data)
-- =====================

-- Option A: Keep existing SOE data (patients, appointments, providers will be orphaned)
-- They will be re-linked when connections are recreated

-- Option B: Delete all SOE data to start fresh
-- Uncomment the following lines to delete all SOE data:

-- TRUNCATE TABLE soe.patients CASCADE;
-- TRUNCATE TABLE soe.appointments CASCADE;
-- TRUNCATE TABLE soe.providers CASCADE;
-- TRUNCATE TABLE soe.treatments CASCADE;


-- =====================
-- STEP 4: Clean up sync_history
-- =====================

-- Delete all sync history (will be recreated when syncs run)
TRUNCATE TABLE integrations.sync_history CASCADE;


-- =====================
-- STEP 5: Recreate v_connection_summary view
-- =====================

CREATE OR REPLACE VIEW integrations.v_connection_summary AS
SELECT
    pms.id,
    pms.tenant_id,
    pms.tenant_name,
    pms.pms_type,
    pms.integration_id,
    pms.integration_name,
    pms.connection_status,
    pms.last_sync_at,
    pms.last_sync_status,
    pms.created_at,
    COUNT(DISTINCT sp.id) as patient_count,
    COUNT(DISTINCT sa.id) as appointment_count,
    COUNT(DISTINCT spr.id) as provider_count
FROM integrations.pms_connections pms
LEFT JOIN soe.patients sp ON sp.connection_id = pms.id
LEFT JOIN soe.appointments sa ON sa.connection_id = pms.id
LEFT JOIN soe.providers spr ON spr.connection_id = pms.id
GROUP BY pms.id, pms.tenant_id, pms.tenant_name, pms.pms_type, pms.integration_id,
         pms.integration_name, pms.connection_status, pms.last_sync_at, pms.last_sync_status,
         pms.created_at;

COMMIT;


-- =====================
-- STEP 6: Verify migration
-- =====================

-- Check clients.tenant_id constraint
SELECT
    'clients.tenant_id constraint' as check_name,
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = '"denpay-dev".clients'::regclass
  AND conname = 'clients_tenant_id_key';
-- Expected: One row showing UNIQUE constraint

-- Check soe_integrations structure
SELECT
    'soe.soe_integrations' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT integration_id) as unique_integrations,
    COUNT(DISTINCT tenant_id) as unique_tenants
FROM soe.soe_integrations;
-- Expected: 0 rows (will be populated after running POST /api/soe/sync/integrations)

-- Check pms_connections structure
SELECT
    'integrations.pms_connections' as table_name,
    COUNT(*) as row_count
FROM integrations.pms_connections;
-- Expected: 0 rows (will be populated from Client Portal UI)

-- Check sync_history
SELECT
    'integrations.sync_history' as table_name,
    COUNT(*) as row_count
FROM integrations.sync_history;
-- Expected: 0 rows

-- Verify all constraints exist
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid IN (
    'integrations.pms_connections'::regclass,
    'soe.soe_integrations'::regclass
)
ORDER BY table_name, constraint_type, constraint_name;
-- Expected: All foreign keys and CHECK constraints

-- =====================
-- MIGRATION COMPLETE
-- =====================

-- Next steps:
-- 1. Deploy backend code changes
-- 2. Run: POST /api/soe/sync/integrations (to populate soe.soe_integrations)
-- 3. Create connections from Client Portal UI (will populate pms_connections)
-- 4. Run sync on each connection (will populate patients/appointments/providers)
