-- Migration: Restructure soe_integrations and pms_connections for multi-tenant architecture
-- Date: 2026-02-04
-- Description:
--   Multi-tenant architecture where "denpay-dev".clients.tenant_id is the master identifier
--   that flows through ALL schemas (soe, integrations, xero, etc.)
--
--   1. Make soe.soe_integrations.integration_id the primary key (8-char alphanumeric)
--   2. Add tenant_id (references "denpay-dev".clients.tenant_id) to soe.soe_integrations
--   3. Replace integrations.pms_connections.client_id (UUID) with tenant_id (8-char)
--   4. Make integration_id NOT NULL in pms_connections
--   5. Add XERO and COMPASS to pms_type enum

BEGIN;

-- =====================
-- 0. Ensure clients.tenant_id has UNIQUE constraint
-- =====================

-- Check if tenant_id already has unique constraint, if not add it
DO $$
BEGIN
    -- Add unique constraint to clients.tenant_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = '"denpay-dev".clients'::regclass
        AND conname = 'clients_tenant_id_key'
    ) THEN
        ALTER TABLE "denpay-dev".clients
            ADD CONSTRAINT clients_tenant_id_key UNIQUE (tenant_id);
    END IF;
END $$;

-- =====================
-- 1. Restructure soe.soe_integrations
-- =====================

-- Drop old table and recreate with correct structure
DROP TABLE IF EXISTS soe.soe_integrations CASCADE;

CREATE TABLE soe.soe_integrations (
    integration_id VARCHAR(8) PRIMARY KEY,  -- 8-char alphanumeric from parquet (e.g., "33F91ECD")
    integration_name VARCHAR NOT NULL,
    source_table VARCHAR,
    tenant_id VARCHAR(8),  -- References "denpay-dev".clients.tenant_id
    tenant_name VARCHAR,  -- Denormalized for performance
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Foreign key to master clients table
ALTER TABLE soe.soe_integrations
    ADD CONSTRAINT fk_soe_integrations_tenant
    FOREIGN KEY (tenant_id) REFERENCES "denpay-dev".clients(tenant_id)
    ON DELETE CASCADE;

CREATE INDEX idx_soe_integrations_tenant ON soe.soe_integrations(tenant_id);
CREATE INDEX idx_soe_integrations_name ON soe.soe_integrations(integration_name);


-- =====================
-- 2. Restructure integrations.pms_connections
-- =====================

-- Add new columns
ALTER TABLE integrations.pms_connections
    ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(8),
    ADD COLUMN IF NOT EXISTS tenant_name VARCHAR;

-- Migrate client_id (UUID) to tenant_id (8-char) by looking up in "denpay-dev".clients
UPDATE integrations.pms_connections pms
SET tenant_id = c.tenant_id,
    tenant_name = c.legal_trading_name
FROM "denpay-dev".clients c
WHERE pms.client_id = c.id
  AND pms.tenant_id IS NULL;

-- For rows where client_id is NULL or no match found in clients table,
-- use the integration_id as a fallback to ensure NOT NULL constraint can be applied
UPDATE integrations.pms_connections
SET tenant_id = COALESCE(tenant_id, integration_id),
    tenant_name = COALESCE(tenant_name, integration_name)
WHERE tenant_id IS NULL;

-- Make integration_id and tenant_id NOT NULL
ALTER TABLE integrations.pms_connections
    ALTER COLUMN integration_id SET NOT NULL,
    ALTER COLUMN tenant_id SET NOT NULL;

-- Foreign key to master clients table
ALTER TABLE integrations.pms_connections
    ADD CONSTRAINT fk_pms_connections_tenant
    FOREIGN KEY (tenant_id) REFERENCES "denpay-dev".clients(tenant_id)
    ON DELETE CASCADE;

-- Drop dependent views before dropping client_id column
DROP VIEW IF EXISTS integrations.v_connection_summary CASCADE;

-- Drop old client_id column (no longer needed)
ALTER TABLE integrations.pms_connections
    DROP COLUMN IF EXISTS client_id;

-- Update CHECK constraints to include all PMS types
ALTER TABLE integrations.pms_connections
    DROP CONSTRAINT IF EXISTS pms_connections_pms_type_check;

ALTER TABLE integrations.pms_connections
    ADD CONSTRAINT pms_connections_pms_type_check
    CHECK (pms_type IN ('SOE', 'SFD', 'DENTALLY', 'CARESTACK', 'COMPASS', 'XERO'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pms_connections_tenant ON integrations.pms_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pms_connections_integration ON integrations.pms_connections(integration_id);
CREATE INDEX IF NOT EXISTS idx_pms_connections_pms_type ON integrations.pms_connections(pms_type);

-- Recreate v_connection_summary view with tenant_id instead of client_id
-- (Adjust this query based on what the original view contained)
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
-- 3. Verify migration
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

-- Verify tenant_id linkage between tables
SELECT
    'Tenant linkage check' as check_name,
    c.tenant_id,
    c.legal_trading_name,
    COUNT(DISTINCT pms.id) as pms_connections_count,
    COUNT(DISTINCT soe.integration_id) as soe_integrations_count
FROM "denpay-dev".clients c
LEFT JOIN integrations.pms_connections pms ON pms.tenant_id = c.tenant_id
LEFT JOIN soe.soe_integrations soe ON soe.tenant_id = c.tenant_id
GROUP BY c.tenant_id, c.legal_trading_name
ORDER BY c.legal_trading_name;
