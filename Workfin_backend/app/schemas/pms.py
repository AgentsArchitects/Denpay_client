"""
PMS Integration Schemas
Pydantic models for PMS API requests and responses
"""
from pydantic import BaseModel, field_validator, Field
from typing import Optional, List, Any
from datetime import datetime, date, time
from enum import Enum
import uuid as uuid_mod


class PMSType(str, Enum):
    SOE = "SOE"
    DENTALLY = "DENTALLY"
    SFD = "SFD"
    CARESTACK = "CARESTACK"
    XERO = "XERO"
    COMPASS = "COMPASS"


class ConnectionStatus(str, Enum):
    PENDING = "PENDING"
    TESTING = "TESTING"
    CONNECTED = "CONNECTED"
    ERROR = "ERROR"
    DISABLED = "DISABLED"


class SyncStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


# ==================
# Connection Schemas
# ==================

class PMSConnectionCreate(BaseModel):
    tenant_id: str  # 8-char alphanumeric tenant ID
    tenant_name: Optional[str] = None
    practice_id: Optional[str] = None
    practice_name: Optional[str] = None
    integration_type: PMSType = Field(alias='pms_type')  # Accept both pms_type and integration_type
    integration_id: str  # 8-char alphanumeric integration ID (from soe_integrations for SOE)
    integration_name: str
    xero_tenant_name: Optional[str] = None
    external_practice_id: Optional[str] = None
    external_site_code: Optional[str] = None
    data_source: Optional[str] = "GOLD_LAYER"
    sync_frequency: Optional[str] = "DAILY"
    sync_config: Optional[dict] = None
    sync_patients: bool = True
    sync_appointments: bool = True
    sync_providers: bool = True
    sync_treatments: bool = True
    sync_billing: bool = False

    class Config:
        populate_by_name = True


class PMSConnectionUpdate(BaseModel):
    integration_name: Optional[str] = None
    external_practice_id: Optional[str] = None
    external_site_code: Optional[str] = None
    data_source: Optional[str] = None
    sync_frequency: Optional[str] = None
    sync_config: Optional[dict] = None
    sync_patients: Optional[bool] = None
    sync_appointments: Optional[bool] = None
    sync_providers: Optional[bool] = None
    sync_treatments: Optional[bool] = None
    sync_billing: Optional[bool] = None
    connection_status: Optional[str] = None


class PMSConnectionResponse(BaseModel):
    id: str
    tenant_id: str  # 8-char alphanumeric
    tenant_name: Optional[str] = None
    practice_id: Optional[str] = None
    practice_name: Optional[str] = None
    integration_type: str = Field(alias='pms_type')  # SOE, SFD, DENTALLY, CARESTACK, XERO
    integration_id: str  # 8-char alphanumeric
    integration_name: str
    xero_tenant_name: Optional[str] = None
    external_practice_id: Optional[str] = None
    external_site_code: Optional[str] = None
    data_source: Optional[str] = None
    sync_frequency: Optional[str] = None
    sync_config: Optional[dict] = None
    sync_patients: Optional[bool] = None
    sync_appointments: Optional[bool] = None
    sync_providers: Optional[bool] = None
    sync_treatments: Optional[bool] = None
    sync_billing: Optional[bool] = None
    connection_status: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_error: Optional[str] = None
    last_sync_records_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator('id', 'practice_id', mode='before')
    @classmethod
    def uuid_to_str(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, uuid_mod.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True
        populate_by_name = True


# ==================
# Sync Schemas
# ==================

class PMSSyncResponse(BaseModel):
    connection_id: str
    sync_type: str
    status: SyncStatus
    records_processed: int = 0
    records_created: int = 0
    records_updated: int = 0
    records_skipped: int = 0
    records_failed: int = 0
    message: Optional[str] = None
    duration_seconds: Optional[int] = None


class SyncHistoryResponse(BaseModel):
    id: str
    connection_id: str
    sync_type: str
    sync_scope: Optional[str] = None
    status: str
    records_processed: Optional[int] = None
    records_created: Optional[int] = None
    records_updated: Optional[int] = None
    records_skipped: Optional[int] = None
    records_failed: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    triggered_by: Optional[str] = None

    class Config:
        from_attributes = True


# ==================
# SOE Data Schemas
# ==================

class SOEPatientResponse(BaseModel):
    id: str
    connection_id: str
    external_patient_id: str
    title: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    preferred_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone_mobile: Optional[str] = None
    phone_home: Optional[str] = None
    phone_work: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    registration_date: Optional[date] = None
    patient_status: Optional[str] = None
    patient_type: Optional[str] = None
    nhs_number: Optional[str] = None
    source_system: Optional[str] = None
    last_synced_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SOEAppointmentResponse(BaseModel):
    id: str
    connection_id: str
    external_appointment_id: str
    patient_id: Optional[str] = None
    provider_id: Optional[str] = None
    appointment_date: Optional[date] = None
    start_time: Optional[time] = None
    duration_minutes: Optional[int] = None
    appointment_type: Optional[str] = None
    appointment_status: Optional[str] = None
    cancellation_reason: Optional[str] = None
    fee_charged: Optional[float] = None
    fee_nhs: Optional[float] = None
    fee_private: Optional[float] = None
    payment_status: Optional[str] = None
    uda_value: Optional[float] = None
    source_system: Optional[str] = None
    last_synced_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SOEProviderResponse(BaseModel):
    id: str
    connection_id: str
    external_provider_id: str
    title: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gdc_number: Optional[str] = None
    provider_type: Optional[str] = None
    specialization: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    employment_type: Optional[str] = None
    employment_status: Optional[str] = None
    start_date: Optional[date] = None
    source_system: Optional[str] = None
    last_synced_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SOETreatmentResponse(BaseModel):
    id: str
    connection_id: str
    external_treatment_id: str
    appointment_id: Optional[str] = None
    patient_id: Optional[str] = None
    provider_id: Optional[str] = None
    treatment_date: Optional[date] = None
    treatment_code: Optional[str] = None
    treatment_description: Optional[str] = None
    tooth_notation: Optional[str] = None
    fee: Optional[float] = None
    fee_type: Optional[str] = None
    quantity: Optional[int] = None
    treatment_status: Optional[str] = None
    source_system: Optional[str] = None
    last_synced_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================
# Paginated Response
# ==================

class PaginatedResponse(BaseModel):
    data: list
    total: int
    page: int
    page_size: int
    total_pages: int
