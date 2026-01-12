-- Migration: Add Client Onboarding Form Fields
-- Date: 2026-01-08
-- Description: Adds all fields required for the 10-tab client onboarding form

-- Set schema search path
SET search_path TO "denpay-dev", public;

-- =====================================================
-- STEP 1: Add new columns to clients table
-- =====================================================

-- Tab 1: Branding & Identity
ALTER TABLE "denpay-dev".clients
ADD COLUMN IF NOT EXISTS expanded_logo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS client_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_registration_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS xero_vat_tax_type VARCHAR(100);

-- Tab 3: License Information
ALTER TABLE "denpay-dev".clients
ADD COLUMN IF NOT EXISTS accounting_system VARCHAR(50),
ADD COLUMN IF NOT EXISTS xero_app VARCHAR(100),
ADD COLUMN IF NOT EXISTS license_workfin_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS license_compass_connections INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS license_finance_system_connections INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS license_pms_connections INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS license_purchasing_system_connections INTEGER DEFAULT 0;

-- Tab 4: Accountant Details
ALTER TABLE "denpay-dev".clients
ADD COLUMN IF NOT EXISTS accountant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS accountant_address VARCHAR(500),
ADD COLUMN IF NOT EXISTS accountant_contact_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS accountant_email VARCHAR(255);

-- Tab 5: IT Provider Details
ALTER TABLE "denpay-dev".clients
ADD COLUMN IF NOT EXISTS it_provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS it_provider_address VARCHAR(500),
ADD COLUMN IF NOT EXISTS it_provider_postcode VARCHAR(20),
ADD COLUMN IF NOT EXISTS it_provider_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS it_provider_phone_1 VARCHAR(50),
ADD COLUMN IF NOT EXISTS it_provider_phone_2 VARCHAR(50),
ADD COLUMN IF NOT EXISTS it_provider_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS it_provider_notes TEXT;

-- Tab 10: Feature Access
ALTER TABLE "denpay-dev".clients
ADD COLUMN IF NOT EXISTS feature_clinician_pay_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS feature_powerbi_enabled BOOLEAN DEFAULT FALSE;

-- Add comments to columns for documentation
COMMENT ON COLUMN "denpay-dev".clients.expanded_logo_url IS 'URL to expanded logo image';
COMMENT ON COLUMN "denpay-dev".clients.logo_url IS 'URL to standard logo image';
COMMENT ON COLUMN "denpay-dev".clients.client_type IS 'Type of client: sole-trader, partnership, ltd-company';
COMMENT ON COLUMN "denpay-dev".clients.company_registration_no IS 'Company House registration number';
COMMENT ON COLUMN "denpay-dev".clients.xero_vat_tax_type IS 'Xero VAT tax type configuration';
COMMENT ON COLUMN "denpay-dev".clients.accounting_system IS 'Accounting system used: xero, sage';
COMMENT ON COLUMN "denpay-dev".clients.feature_clinician_pay_enabled IS 'Enable clinician pay system feature';
COMMENT ON COLUMN "denpay-dev".clients.feature_powerbi_enabled IS 'Enable Power BI reports feature';

-- =====================================================
-- STEP 2: Create client_adjustment_types table
-- =====================================================

CREATE TABLE IF NOT EXISTS "denpay-dev".client_adjustment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_client_adjustment_types_client
        FOREIGN KEY (client_id)
        REFERENCES "denpay-dev".clients(id)
        ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_adjustment_types_client_id
    ON "denpay-dev".client_adjustment_types(client_id);

COMMENT ON TABLE "denpay-dev".client_adjustment_types IS 'Client-specific payroll adjustment types';
COMMENT ON COLUMN "denpay-dev".client_adjustment_types.name IS 'Name of the adjustment type (e.g., Mentoring Fee, Retainer Fee)';

-- =====================================================
-- STEP 3: Create client_pms_integrations table
-- =====================================================

CREATE TABLE IF NOT EXISTS "denpay-dev".client_pms_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    pms_type VARCHAR(50) NOT NULL,
    integration_config TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_client_pms_integrations_client
        FOREIGN KEY (client_id)
        REFERENCES "denpay-dev".clients(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_pms_type
        CHECK (pms_type IN ('SOE', 'DENTALLY', 'SFD', 'CARESTACK')),

    CONSTRAINT chk_pms_status
        CHECK (status IN ('Active', 'Inactive', 'Error'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_pms_integrations_client_id
    ON "denpay-dev".client_pms_integrations(client_id);

CREATE INDEX IF NOT EXISTS idx_client_pms_integrations_pms_type
    ON "denpay-dev".client_pms_integrations(pms_type);

COMMENT ON TABLE "denpay-dev".client_pms_integrations IS 'Practice Management System integrations for clients';
COMMENT ON COLUMN "denpay-dev".client_pms_integrations.pms_type IS 'Type of PMS: SOE, DENTALLY, SFD, CARESTACK';
COMMENT ON COLUMN "denpay-dev".client_pms_integrations.integration_config IS 'JSON configuration for the integration';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION "denpay-dev".update_client_pms_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_pms_integrations_updated_at
    BEFORE UPDATE ON "denpay-dev".client_pms_integrations
    FOR EACH ROW
    EXECUTE FUNCTION "denpay-dev".update_client_pms_integrations_updated_at();

-- =====================================================
-- STEP 4: Create client_denpay_periods table
-- =====================================================

CREATE TABLE IF NOT EXISTS "denpay-dev".client_denpay_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    month DATE NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_client_denpay_periods_client
        FOREIGN KEY (client_id)
        REFERENCES "denpay-dev".clients(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_denpay_period_dates
        CHECK (to_date >= from_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_denpay_periods_client_id
    ON "denpay-dev".client_denpay_periods(client_id);

CREATE INDEX IF NOT EXISTS idx_client_denpay_periods_month
    ON "denpay-dev".client_denpay_periods(month);

COMMENT ON TABLE "denpay-dev".client_denpay_periods IS 'Client-specific Denpay payment period configurations';
COMMENT ON COLUMN "denpay-dev".client_denpay_periods.month IS 'Month reference (first day of month)';
COMMENT ON COLUMN "denpay-dev".client_denpay_periods.from_date IS 'Period start date';
COMMENT ON COLUMN "denpay-dev".client_denpay_periods.to_date IS 'Period end date';

-- =====================================================
-- STEP 5: Create client_fy_end_periods table
-- =====================================================

CREATE TABLE IF NOT EXISTS "denpay-dev".client_fy_end_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    month DATE NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_client_fy_end_periods_client
        FOREIGN KEY (client_id)
        REFERENCES "denpay-dev".clients(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_fy_end_period_dates
        CHECK (to_date >= from_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_fy_end_periods_client_id
    ON "denpay-dev".client_fy_end_periods(client_id);

CREATE INDEX IF NOT EXISTS idx_client_fy_end_periods_month
    ON "denpay-dev".client_fy_end_periods(month);

COMMENT ON TABLE "denpay-dev".client_fy_end_periods IS 'Client-specific financial year end period configurations';
COMMENT ON COLUMN "denpay-dev".client_fy_end_periods.month IS 'Month reference (first day of month)';
COMMENT ON COLUMN "denpay-dev".client_fy_end_periods.from_date IS 'FY period start date';
COMMENT ON COLUMN "denpay-dev".client_fy_end_periods.to_date IS 'FY period end date';

-- =====================================================
-- STEP 6: Insert default adjustment types for existing clients
-- =====================================================

-- Insert default adjustment types for all existing clients
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

-- =====================================================
-- STEP 7: Set default values for existing clients
-- =====================================================

-- Set default feature flags for existing clients
UPDATE "denpay-dev".clients
SET
    feature_clinician_pay_enabled = TRUE,
    feature_powerbi_enabled = FALSE
WHERE feature_clinician_pay_enabled IS NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check new columns in clients table
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'denpay-dev'
-- AND table_name = 'clients'
-- ORDER BY ordinal_position;

-- Check new tables created
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'denpay-dev'
-- AND table_name LIKE 'client_%'
-- ORDER BY table_name;

-- Check default adjustment types inserted
-- SELECT c.legal_trading_name, COUNT(cat.id) as adjustment_type_count
-- FROM "denpay-dev".clients c
-- LEFT JOIN "denpay-dev".client_adjustment_types cat ON c.id = cat.client_id
-- GROUP BY c.id, c.legal_trading_name;

COMMIT;
