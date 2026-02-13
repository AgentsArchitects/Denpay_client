"""
Xero Database Models
Maps to the xero schema tables for storing synced Xero data
"""
from sqlalchemy import Column, String, DateTime, Date, Boolean, Text, Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.database import Base
from app.db.utils import generate_alphanumeric_id
import uuid


# Backward-compatible alias
generate_integration_id = generate_alphanumeric_id

# Xero schema name
XERO_SCHEMA = "xero"


class XeroToken(Base):
    """Store Xero OAuth tokens per client"""
    __tablename__ = "tokens"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False)  # Xero tenant/org ID
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True, unique=True, default=generate_integration_id)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    token_type = Column(String(50), default="Bearer")
    scope = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class XeroAccount(Base):
    """Xero Chart of Accounts"""
    __tablename__ = "accounts"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(String(100), nullable=False, unique=True)  # Xero AccountID
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    code = Column(String(50), nullable=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=True)  # BANK, CURRENT, EQUITY, etc.
    bank_account_number = Column(String(100), nullable=True)
    status = Column(String(50), nullable=True)  # ACTIVE, ARCHIVED
    description = Column(Text, nullable=True)
    bank_account_type = Column(String(50), nullable=True)
    currency_code = Column(String(10), nullable=True)
    tax_type = Column(String(50), nullable=True)
    enable_payments_to_account = Column(Boolean, default=False)
    show_in_expense_claims = Column(Boolean, default=False)
    class_ = Column("class", String(50), nullable=True)  # ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    system_account = Column(String(100), nullable=True)
    reporting_code = Column(String(50), nullable=True)
    reporting_code_name = Column(String(255), nullable=True)
    has_attachments = Column(Boolean, default=False)
    updated_date_utc = Column(DateTime(timezone=True), nullable=True)
    add_to_watchlist = Column(Boolean, default=False)
    raw_data = Column(JSONB, nullable=True)  # Store full Xero response
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XeroContact(Base):
    """Xero Contacts (Customers/Suppliers)"""
    __tablename__ = "contacts"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(String(100), nullable=False, unique=True)  # Xero ContactID
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    contact_number = Column(String(100), nullable=True)
    account_number = Column(String(100), nullable=True)
    contact_status = Column(String(50), nullable=True)  # ACTIVE, ARCHIVED
    name = Column(String(500), nullable=False)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    email_address = Column(String(255), nullable=True)
    skype_user_name = Column(String(255), nullable=True)
    bank_account_details = Column(Text, nullable=True)
    tax_number = Column(String(100), nullable=True)
    accounts_receivable_tax_type = Column(String(50), nullable=True)
    accounts_payable_tax_type = Column(String(50), nullable=True)
    is_supplier = Column(Boolean, default=False)
    is_customer = Column(Boolean, default=False)
    default_currency = Column(String(10), nullable=True)
    updated_date_utc = Column(DateTime(timezone=True), nullable=True)
    raw_data = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XeroContactGroup(Base):
    """Xero Contact Groups"""
    __tablename__ = "contactgroups"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_group_id = Column(String(100), nullable=False, unique=True)
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    name = Column(String(255), nullable=False)
    status = Column(String(50), nullable=True)  # ACTIVE, DELETED
    raw_data = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XeroInvoice(Base):
    """Xero Invoices"""
    __tablename__ = "invoices"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(String(100), nullable=False, unique=True)  # Xero InvoiceID
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    type = Column(String(50), nullable=True)  # ACCPAY, ACCREC
    invoice_number = Column(String(100), nullable=True)
    reference = Column(String(255), nullable=True)
    contact_id = Column(String(100), nullable=True)
    contact_name = Column(String(500), nullable=True)
    date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=True)  # DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED
    line_amount_types = Column(String(50), nullable=True)  # Exclusive, Inclusive, NoTax
    sub_total = Column(Numeric(18, 2), nullable=True)
    total_tax = Column(Numeric(18, 2), nullable=True)
    total = Column(Numeric(18, 2), nullable=True)
    total_discount = Column(Numeric(18, 2), nullable=True)
    currency_code = Column(String(10), nullable=True)
    currency_rate = Column(Numeric(18, 6), nullable=True)
    amount_due = Column(Numeric(18, 2), nullable=True)
    amount_paid = Column(Numeric(18, 2), nullable=True)
    amount_credited = Column(Numeric(18, 2), nullable=True)
    fully_paid_on_date = Column(Date, nullable=True)
    sent_to_contact = Column(Boolean, default=False)
    expected_payment_date = Column(Date, nullable=True)
    planned_payment_date = Column(Date, nullable=True)
    has_attachments = Column(Boolean, default=False)
    has_errors = Column(Boolean, default=False)
    updated_date_utc = Column(DateTime(timezone=True), nullable=True)
    raw_data = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XeroCreditNote(Base):
    """Xero Credit Notes"""
    __tablename__ = "creditnotes"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    credit_note_id = Column(String(100), nullable=False, unique=True)
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    type = Column(String(50), nullable=True)  # ACCPAYCREDIT, ACCRECCREDIT
    credit_note_number = Column(String(100), nullable=True)
    reference = Column(String(255), nullable=True)
    contact_id = Column(String(100), nullable=True)
    contact_name = Column(String(500), nullable=True)
    date = Column(Date, nullable=True)
    status = Column(String(50), nullable=True)
    line_amount_types = Column(String(50), nullable=True)
    sub_total = Column(Numeric(18, 2), nullable=True)
    total_tax = Column(Numeric(18, 2), nullable=True)
    total = Column(Numeric(18, 2), nullable=True)
    currency_code = Column(String(10), nullable=True)
    currency_rate = Column(Numeric(18, 6), nullable=True)
    remaining_credit = Column(Numeric(18, 2), nullable=True)
    has_attachments = Column(Boolean, default=False)
    updated_date_utc = Column(DateTime(timezone=True), nullable=True)
    raw_data = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XeroPayment(Base):
    """Xero Payments"""
    __tablename__ = "payments"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(String(100), nullable=False, unique=True)
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    date = Column(Date, nullable=True)
    currency_rate = Column(Numeric(18, 6), nullable=True)
    amount = Column(Numeric(18, 2), nullable=True)
    reference = Column(String(255), nullable=True)
    is_reconciled = Column(Boolean, default=False)
    status = Column(String(50), nullable=True)  # AUTHORISED, DELETED
    payment_type = Column(String(50), nullable=True)  # ACCRECPAYMENT, ACCPAYPAYMENT
    account_id = Column(String(100), nullable=True)
    invoice_id = Column(String(100), nullable=True)
    credit_note_id = Column(String(100), nullable=True)
    prepayment_id = Column(String(100), nullable=True)
    overpayment_id = Column(String(100), nullable=True)
    updated_date_utc = Column(DateTime(timezone=True), nullable=True)
    raw_data = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XeroBankTransaction(Base):
    """Xero Bank Transactions"""
    __tablename__ = "bankTransactions"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_transaction_id = Column(String(100), nullable=False, unique=True)
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    type = Column(String(50), nullable=True)  # RECEIVE, SPEND, etc.
    contact_id = Column(String(100), nullable=True)
    contact_name = Column(String(500), nullable=True)
    bank_account_id = Column(String(100), nullable=True)
    is_reconciled = Column(Boolean, default=False)
    date = Column(Date, nullable=True)
    reference = Column(String(255), nullable=True)
    currency_code = Column(String(10), nullable=True)
    currency_rate = Column(Numeric(18, 6), nullable=True)
    status = Column(String(50), nullable=True)  # AUTHORISED, DELETED
    line_amount_types = Column(String(50), nullable=True)
    sub_total = Column(Numeric(18, 2), nullable=True)
    total_tax = Column(Numeric(18, 2), nullable=True)
    total = Column(Numeric(18, 2), nullable=True)
    has_attachments = Column(Boolean, default=False)
    updated_date_utc = Column(DateTime(timezone=True), nullable=True)
    raw_data = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XeroBankTransfer(Base):
    """Xero Bank Transfers"""
    __tablename__ = "BankTransfer"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_transfer_id = Column(String(100), nullable=False, unique=True)
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    from_bank_account_id = Column(String(100), nullable=True)
    to_bank_account_id = Column(String(100), nullable=True)
    from_bank_transaction_id = Column(String(100), nullable=True)
    to_bank_transaction_id = Column(String(100), nullable=True)
    amount = Column(Numeric(18, 2), nullable=True)
    date = Column(Date, nullable=True)
    currency_rate = Column(Numeric(18, 6), nullable=True)
    has_attachments = Column(Boolean, default=False)
    created_date_utc = Column(DateTime(timezone=True), nullable=True)
    raw_data = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XeroJournal(Base):
    """Xero Journals"""
    __tablename__ = "journals"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journal_id = Column(String(100), nullable=False, unique=True)
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    journal_date = Column(Date, nullable=True)
    journal_number = Column(Integer, nullable=True)
    created_date_utc = Column(DateTime(timezone=True), nullable=True)
    reference = Column(String(255), nullable=True)
    source_id = Column(String(100), nullable=True)
    source_type = Column(String(50), nullable=True)  # ACCREC, ACCPAY, etc.
    raw_data = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XeroJournalLine(Base):
    """Xero Journal Lines"""
    __tablename__ = "journalsLines"
    __table_args__ = {"schema": XERO_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journal_line_id = Column(String(100), nullable=False, unique=True)
    journal_id = Column(String(100), nullable=False)
    tenant_id = Column(String(100), nullable=False)
    tenant_name = Column(String(255), nullable=True)
    integration_id = Column(String(8), nullable=True)
    account_id = Column(String(100), nullable=True)
    account_code = Column(String(50), nullable=True)
    account_type = Column(String(50), nullable=True)
    account_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    net_amount = Column(Numeric(18, 2), nullable=True)
    gross_amount = Column(Numeric(18, 2), nullable=True)
    tax_amount = Column(Numeric(18, 2), nullable=True)
    tax_type = Column(String(50), nullable=True)
    tax_name = Column(String(100), nullable=True)
    tracking_categories = Column(JSONB, nullable=True)
    raw_data = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
