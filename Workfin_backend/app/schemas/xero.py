"""
Xero API Schemas
Pydantic models for Xero API requests and responses
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class XeroSyncStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


# ==================
# Connection Schemas
# ==================

class XeroConnectionBase(BaseModel):
    client_id: str
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None


class XeroConnectionCreate(XeroConnectionBase):
    pass


class XeroConnectionInDB(XeroConnectionBase):
    id: str
    status: str
    connected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class XeroConnectionResponse(XeroConnectionInDB):
    pass


class XeroConnectRequest(BaseModel):
    client_id: str
    authorization_code: Optional[str] = None


# ==================
# Tenant Schemas
# ==================

class XeroTenant(BaseModel):
    tenant_id: str
    tenant_name: str
    tenant_type: str = "ORGANISATION"


# ==================
# Sync Response Schemas
# ==================

class XeroSyncResponse(BaseModel):
    entity_type: str
    synced_count: int
    status: XeroSyncStatus
    message: Optional[str] = None


# ==================
# Account Schemas
# ==================

class XeroAccountResponse(BaseModel):
    id: str
    account_id: str
    code: Optional[str] = None
    name: str
    type: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    class_: Optional[str] = None
    synced_at: datetime

    class Config:
        from_attributes = True


# ==================
# Contact Schemas
# ==================

class XeroContactResponse(BaseModel):
    id: str
    contact_id: str
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email_address: Optional[str] = None
    is_supplier: bool = False
    is_customer: bool = False
    contact_status: Optional[str] = None
    synced_at: datetime

    class Config:
        from_attributes = True


# ==================
# Invoice Schemas
# ==================

class XeroInvoiceResponse(BaseModel):
    id: str
    invoice_id: str
    type: Optional[str] = None
    invoice_number: Optional[str] = None
    contact_name: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    total: Optional[float] = None
    amount_due: Optional[float] = None
    amount_paid: Optional[float] = None
    synced_at: datetime

    class Config:
        from_attributes = True


# ==================
# Payment Schemas
# ==================

class XeroPaymentResponse(BaseModel):
    id: str
    payment_id: str
    date: Optional[str] = None
    amount: Optional[float] = None
    reference: Optional[str] = None
    status: Optional[str] = None
    is_reconciled: bool = False
    synced_at: datetime

    class Config:
        from_attributes = True


# ==================
# Bank Transaction Schemas
# ==================

class XeroBankTransactionResponse(BaseModel):
    id: str
    bank_transaction_id: str
    type: Optional[str] = None
    contact_name: Optional[str] = None
    date: Optional[str] = None
    total: Optional[float] = None
    status: Optional[str] = None
    is_reconciled: bool = False
    synced_at: datetime

    class Config:
        from_attributes = True


# ==================
# Journal Schemas
# ==================

class XeroJournalResponse(BaseModel):
    id: str
    journal_id: str
    journal_date: Optional[str] = None
    journal_number: Optional[int] = None
    reference: Optional[str] = None
    source_type: Optional[str] = None
    synced_at: datetime

    class Config:
        from_attributes = True
