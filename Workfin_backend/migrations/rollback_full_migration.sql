-- Full Rollback: Undo the multi-tenant architecture migration
-- This will restore the database to its pre-migration state
-- WARNING: Only run this if the migration failed and you want to start over

BEGIN;

-- =====================
-- STEP 1: Check if you have backups
-- =====================

-- If you created backups, restore from them:
-- DROP TABLE IF EXISTS soe.soe_integrations;
-- DROP TABLE IF EXISTS integrations.pms_connections;
--
-- CREATE TABLE soe.soe_integrations AS SELECT * FROM soe.soe_integrations_backup;
-- CREATE TABLE integrations.pms_connections AS SELECT * FROM integrations.pms_connections_backup;
--
-- Then skip to COMMIT at the end


-- =====================
-- STEP 2: Remove new foreign key constraints
-- =====================

ALTER TABLE integrations.pms_connections
    DROP CONSTRAINT IF EXISTS fk_pms_connections_tenant CASCADE;

ALTER TABLE soe.soe_integrations
    DROP CONSTRAINT IF EXISTS fk_soe_integrations_tenant CASCADE;


-- =====================
-- STEP 3: Drop new indexes
-- =====================

DROP INDEX IF EXISTS integrations.idx_pms_connections_tenant;
DROP INDEX IF EXISTS integrations.idx_pms_connections_integration;
DROP INDEX IF EXISTS integrations.idx_pms_connections_pms_type;
DROP INDEX IF EXISTS soe.idx_soe_integrations_tenant;
DROP INDEX IF EXISTS soe.idx_soe_integrations_name;


-- =====================
-- STEP 4: Restore pms_connections table structure
-- =====================

-- If tenant_id column exists, remove it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'integrations'
        AND table_name = 'pms_connections'
        AND column_name = 'tenant_id'
    ) THEN
        -- Add back client_id if it was dropped
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'integrations'
            AND table_name = 'pms_connections'
            AND column_name = 'client_id'
        ) THEN
            ALTER TABLE integrations.pms_connections
                ADD COLUMN client_id UUID;
        END IF;

        -- Remove tenant columns
        ALTER TABLE integrations.pms_connections
            DROP COLUMN IF EXISTS tenant_id,
            DROP COLUMN IF EXISTS tenant_name;

        RAISE NOTICE 'Removed tenant_id columns from pms_connections';
    END IF;
END $$;


-- =====================
-- STEP 5: Restore old CHECK constraints
-- =====================

ALTER TABLE integrations.pms_connections
    DROP CONSTRAINT IF EXISTS pms_connections_pms_type_check;

ALTER TABLE integrations.pms_connections
    ADD CONSTRAINT pms_connections_pms_type_check
    CHECK (pms_type IN ('SOE', 'SFD', 'DENTALLY', 'CARESTACK'));
-- Note: Removed XERO and COMPASS


-- =====================
-- STEP 6: Restore soe.soe_integrations with UUID id
-- =====================

-- Drop the new table
DROP TABLE IF EXISTS soe.soe_integrations CASCADE;

-- Recreate with old structure (UUID id as PK)
CREATE TABLE soe.soe_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id VARCHAR NOT NULL UNIQUE,
    integration_name VARCHAR NOT NULL,
    source_table VARCHAR DEFAULT 'vw_DimPatients',
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_soe_integrations_integration_id ON soe.soe_integrations(integration_id);


-- =====================
-- STEP 7: Remove UNIQUE constraint from clients.tenant_id (optional)
-- =====================

-- Uncomment if you want to remove the UNIQUE constraint
-- ALTER TABLE "denpay-dev".clients
--     DROP CONSTRAINT IF EXISTS clients_tenant_id_key;


-- =====================
-- STEP 8: Recreate old v_connection_summary view (if you know the original definition)
-- =====================

DROP VIEW IF EXISTS integrations.v_connection_summary CASCADE;

-- Uncomment and adjust if you know the original view definition:
-- CREATE OR REPLACE VIEW integrations.v_connection_summary AS
-- SELECT
--     pms.id,
--     pms.client_id,
--     pms.pms_type,
--     pms.integration_id,
--     pms.integration_name,
--     ...
-- FROM integrations.pms_connections pms
-- ...;

COMMIT;


-- =====================
-- VERIFICATION
-- =====================

-- Check pms_connections structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'integrations'
  AND table_name = 'pms_connections'
ORDER BY ordinal_position;
-- Expected: Should have client_id (UUID), no tenant_id

-- Check soe_integrations structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'soe'
  AND table_name = 'soe_integrations'
ORDER BY ordinal_position;
-- Expected: Should have id (UUID) as PK, integration_id (varchar) as unique

-- Check constraints
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid IN (
    'integrations.pms_connections'::regclass,
    'soe.soe_integrations'::regclass
)
ORDER BY table_name, constraint_name;

-- =====================
-- ROLLBACK COMPLETE
-- =====================

SELECT 'Rollback completed successfully - database restored to pre-migration state' as status;
