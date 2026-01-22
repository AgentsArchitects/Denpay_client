-- Create xero schema
CREATE SCHEMA IF NOT EXISTS xero;

-- Xero Tokens table
CREATE TABLE IF NOT EXISTS xero.tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    tenant_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_name VARCHAR(255),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Accounts (Chart of Accounts)
CREATE TABLE IF NOT EXISTS xero.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_id VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    bank_account_number VARCHAR(100),
    status VARCHAR(50),
    description TEXT,
    bank_account_type VARCHAR(50),
    currency_code VARCHAR(10),
    tax_type VARCHAR(50),
    enable_payments_to_account BOOLEAN DEFAULT FALSE,
    show_in_expense_claims BOOLEAN DEFAULT FALSE,
    class VARCHAR(50),
    system_account VARCHAR(100),
    reporting_code VARCHAR(50),
    reporting_code_name VARCHAR(255),
    has_attachments BOOLEAN DEFAULT FALSE,
    updated_date_utc TIMESTAMPTZ,
    add_to_watchlist BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Contacts
CREATE TABLE IF NOT EXISTS xero.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_id VARCHAR(100) NOT NULL,
    contact_number VARCHAR(100),
    account_number VARCHAR(100),
    contact_status VARCHAR(50),
    name VARCHAR(500) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email_address VARCHAR(255),
    skype_user_name VARCHAR(255),
    bank_account_details TEXT,
    tax_number VARCHAR(100),
    accounts_receivable_tax_type VARCHAR(50),
    accounts_payable_tax_type VARCHAR(50),
    is_supplier BOOLEAN DEFAULT FALSE,
    is_customer BOOLEAN DEFAULT FALSE,
    default_currency VARCHAR(10),
    updated_date_utc TIMESTAMPTZ,
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Contact Groups
CREATE TABLE IF NOT EXISTS xero.contactgroups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_group_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50),
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Invoices
CREATE TABLE IF NOT EXISTS xero.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_id VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    invoice_number VARCHAR(100),
    reference VARCHAR(255),
    contact_id VARCHAR(100),
    contact_name VARCHAR(500),
    date DATE,
    due_date DATE,
    status VARCHAR(50),
    line_amount_types VARCHAR(50),
    sub_total NUMERIC(18,2),
    total_tax NUMERIC(18,2),
    total NUMERIC(18,2),
    total_discount NUMERIC(18,2),
    currency_code VARCHAR(10),
    currency_rate NUMERIC(18,6),
    amount_due NUMERIC(18,2),
    amount_paid NUMERIC(18,2),
    amount_credited NUMERIC(18,2),
    fully_paid_on_date DATE,
    sent_to_contact BOOLEAN DEFAULT FALSE,
    expected_payment_date DATE,
    planned_payment_date DATE,
    has_attachments BOOLEAN DEFAULT FALSE,
    has_errors BOOLEAN DEFAULT FALSE,
    updated_date_utc TIMESTAMPTZ,
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Credit Notes
CREATE TABLE IF NOT EXISTS xero.creditnotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_id VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    credit_note_number VARCHAR(100),
    reference VARCHAR(255),
    contact_id VARCHAR(100),
    contact_name VARCHAR(500),
    date DATE,
    status VARCHAR(50),
    line_amount_types VARCHAR(50),
    sub_total NUMERIC(18,2),
    total_tax NUMERIC(18,2),
    total NUMERIC(18,2),
    currency_code VARCHAR(10),
    currency_rate NUMERIC(18,6),
    remaining_credit NUMERIC(18,2),
    has_attachments BOOLEAN DEFAULT FALSE,
    updated_date_utc TIMESTAMPTZ,
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Payments
CREATE TABLE IF NOT EXISTS xero.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_id VARCHAR(100) NOT NULL,
    date DATE,
    currency_rate NUMERIC(18,6),
    amount NUMERIC(18,2),
    reference VARCHAR(255),
    is_reconciled BOOLEAN DEFAULT FALSE,
    status VARCHAR(50),
    payment_type VARCHAR(50),
    account_id VARCHAR(100),
    invoice_id VARCHAR(100),
    credit_note_id VARCHAR(100),
    prepayment_id VARCHAR(100),
    overpayment_id VARCHAR(100),
    updated_date_utc TIMESTAMPTZ,
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Bank Transactions
CREATE TABLE IF NOT EXISTS xero."bankTransactions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_transaction_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_id VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    contact_id VARCHAR(100),
    contact_name VARCHAR(500),
    bank_account_id VARCHAR(100),
    is_reconciled BOOLEAN DEFAULT FALSE,
    date DATE,
    reference VARCHAR(255),
    currency_code VARCHAR(10),
    currency_rate NUMERIC(18,6),
    status VARCHAR(50),
    line_amount_types VARCHAR(50),
    sub_total NUMERIC(18,2),
    total_tax NUMERIC(18,2),
    total NUMERIC(18,2),
    has_attachments BOOLEAN DEFAULT FALSE,
    updated_date_utc TIMESTAMPTZ,
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Bank Transfers
CREATE TABLE IF NOT EXISTS xero."BankTransfer" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_transfer_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_id VARCHAR(100) NOT NULL,
    from_bank_account_id VARCHAR(100),
    to_bank_account_id VARCHAR(100),
    from_bank_transaction_id VARCHAR(100),
    to_bank_transaction_id VARCHAR(100),
    amount NUMERIC(18,2),
    date DATE,
    currency_rate NUMERIC(18,6),
    has_attachments BOOLEAN DEFAULT FALSE,
    created_date_utc TIMESTAMPTZ,
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Journals
CREATE TABLE IF NOT EXISTS xero.journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id VARCHAR(100) NOT NULL UNIQUE,
    tenant_id VARCHAR(100) NOT NULL,
    journal_date DATE,
    journal_number INTEGER,
    created_date_utc TIMESTAMPTZ,
    reference VARCHAR(255),
    source_id VARCHAR(100),
    source_type VARCHAR(50),
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Xero Journal Lines
CREATE TABLE IF NOT EXISTS xero."journalsLines" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_line_id VARCHAR(100) NOT NULL UNIQUE,
    journal_id VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    account_id VARCHAR(100),
    account_code VARCHAR(50),
    account_type VARCHAR(50),
    account_name VARCHAR(255),
    description TEXT,
    net_amount NUMERIC(18,2),
    gross_amount NUMERIC(18,2),
    tax_amount NUMERIC(18,2),
    tax_type VARCHAR(50),
    tax_name VARCHAR(100),
    tracking_categories JSONB,
    raw_data JSONB,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_xero_accounts_tenant ON xero.accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xero_contacts_tenant ON xero.contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_tenant ON xero.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xero_invoices_status ON xero.invoices(status);
CREATE INDEX IF NOT EXISTS idx_xero_payments_tenant ON xero.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xero_journals_tenant ON xero.journals(tenant_id);
