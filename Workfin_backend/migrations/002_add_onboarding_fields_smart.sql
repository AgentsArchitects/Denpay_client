-- Smart Migration: Only adds what's missing for Client Onboarding
-- Date: 2026-01-08
-- This script safely adds only the columns and tables that don't already exist

SET search_path TO "denpay-dev", public;

-- =====================================================
-- PART 1: Add columns to clients table (only if missing)
-- =====================================================

-- Each column is added with IF NOT EXISTS, so it won't error if it already exists

-- Tab 1: Branding & Identity
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='expanded_logo_url') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN expanded_logo_url VARCHAR(500);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='logo_url') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN logo_url VARCHAR(500);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='client_type') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN client_type VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='company_registration_no') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN company_registration_no VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='xero_vat_tax_type') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN xero_vat_tax_type VARCHAR(100);
    END IF;
END $$;

-- Tab 3: License Information
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='accounting_system') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN accounting_system VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='xero_app') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN xero_app VARCHAR(100);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='license_workfin_users') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN license_workfin_users INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='license_compass_connections') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN license_compass_connections INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='license_finance_system_connections') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN license_finance_system_connections INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='license_pms_connections') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN license_pms_connections INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='license_purchasing_system_connections') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN license_purchasing_system_connections INTEGER DEFAULT 0;
    END IF;
END $$;

-- Tab 4: Accountant Details
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='accountant_name') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN accountant_name VARCHAR(255);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='accountant_address') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN accountant_address VARCHAR(500);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='accountant_contact_no') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN accountant_contact_no VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='accountant_email') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN accountant_email VARCHAR(255);
    END IF;
END $$;

-- Tab 5: IT Provider Details
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='it_provider_name') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN it_provider_name VARCHAR(255);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='it_provider_address') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN it_provider_address VARCHAR(500);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='it_provider_postcode') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN it_provider_postcode VARCHAR(20);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='it_provider_contact_name') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN it_provider_contact_name VARCHAR(255);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='it_provider_phone_1') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN it_provider_phone_1 VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='it_provider_phone_2') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN it_provider_phone_2 VARCHAR(50);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='it_provider_email') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN it_provider_email VARCHAR(255);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='it_provider_notes') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN it_provider_notes TEXT;
    END IF;
END $$;

-- Tab 10: Feature Access
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='feature_clinician_pay_enabled') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN feature_clinician_pay_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='denpay-dev' AND table_name='clients' AND column_name='feature_powerbi_enabled') THEN
        ALTER TABLE "denpay-dev".clients ADD COLUMN feature_powerbi_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =====================================================
-- PART 2: Create new tables (only if they don't exist)
-- =====================================================

-- Tab 6: Adjustment Types
CREATE TABLE IF NOT EXISTS "denpay-dev".client_adjustment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES "denpay-dev".clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_adjustment_types_client_id
    ON "denpay-dev".client_adjustment_types(client_id);

-- Tab 7: PMS Integrations (optional for now)
CREATE TABLE IF NOT EXISTS "denpay-dev".client_pms_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES "denpay-dev".clients(id) ON DELETE CASCADE,
    pms_type VARCHAR(50) NOT NULL CHECK (pms_type IN ('SOE', 'DENTALLY', 'SFD', 'CARESTACK')),
    integration_config TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_pms_integrations_client_id
    ON "denpay-dev".client_pms_integrations(client_id);

-- Tab 8: Denpay Periods
CREATE TABLE IF NOT EXISTS "denpay-dev".client_denpay_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES "denpay-dev".clients(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL CHECK (to_date >= from_date),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_denpay_periods_client_id
    ON "denpay-dev".client_denpay_periods(client_id);

-- Tab 9: FY End Periods
CREATE TABLE IF NOT EXISTS "denpay-dev".client_fy_end_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES "denpay-dev".clients(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL CHECK (to_date >= from_date),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_fy_end_periods_client_id
    ON "denpay-dev".client_fy_end_periods(client_id);

-- =====================================================
-- PART 3: Add default adjustment types for existing clients (if table was just created)
-- =====================================================

DO $$
BEGIN
    -- Only insert if the table is empty or doesn't have defaults for all clients
    IF EXISTS (SELECT 1 FROM "denpay-dev".clients) THEN
        INSERT INTO "denpay-dev".client_adjustment_types (client_id, name)
        SELECT
            c.id,
            unnest(ARRAY[
                'Mentoring Fee',
                'Retainer Fee',
                'Therapist - Invoice',
                'Locum - Days',
                'Reconciliation Adjustment',
                'Payment on Account',
                'Previous Period Payment',
                'Training and Other'
            ]) as name
        FROM "denpay-dev".clients c
        WHERE NOT EXISTS (
            SELECT 1
            FROM "denpay-dev".client_adjustment_types cat
            WHERE cat.client_id = c.id
        );
    END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show what was added
SELECT 'Migration completed successfully!' as status;

-- Show column count
SELECT COUNT(*) as total_columns_in_clients
FROM information_schema.columns
WHERE table_schema = 'denpay-dev' AND table_name = 'clients';

-- Show new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'denpay-dev'
AND table_name LIKE 'client_%'
ORDER BY table_name;

COMMIT;
