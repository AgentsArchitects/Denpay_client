"""
PMS Integration Database Models
Maps to the integrations and soe schema tables
"""
from sqlalchemy import Column, String, DateTime, Date, Boolean, Text, Integer, Numeric, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.database import Base
from app.db.utils import generate_alphanumeric_id
import uuid


INTEGRATIONS_SCHEMA = "integrations"
SOE_SCHEMA = "soe"


# =====================
# INTEGRATIONS SCHEMA
# =====================

class PMSConnection(Base):
    __tablename__ = "pms_connections"
    __table_args__ = {"schema": INTEGRATIONS_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), nullable=False)
    practice_id = Column(UUID(as_uuid=True), nullable=True)
    pms_type = Column(String, nullable=False)
    integration_id = Column(String(8), unique=True, nullable=True, default=generate_alphanumeric_id)
    integration_name = Column(String, nullable=False)
    external_practice_id = Column(String, nullable=True)
    external_site_code = Column(String, nullable=True)
    data_source = Column(String, nullable=True)
    sync_frequency = Column(String, nullable=True)
    sync_config = Column(JSONB, nullable=True)
    sync_patients = Column(Boolean, nullable=True, default=True)
    sync_appointments = Column(Boolean, nullable=True, default=True)
    sync_providers = Column(Boolean, nullable=True, default=True)
    sync_treatments = Column(Boolean, nullable=True, default=True)
    sync_billing = Column(Boolean, nullable=True, default=False)
    connection_status = Column(String, nullable=True, default="active")
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_status = Column(String, nullable=True)
    last_sync_error = Column(Text, nullable=True)
    last_sync_records_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), nullable=True)
    updated_by = Column(UUID(as_uuid=True), nullable=True)


class SyncHistory(Base):
    __tablename__ = "sync_history"
    __table_args__ = {"schema": INTEGRATIONS_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), nullable=False)
    sync_type = Column(String, nullable=False)
    sync_scope = Column(String, nullable=True)
    status = Column(String, nullable=False)
    records_processed = Column(Integer, nullable=True)
    records_created = Column(Integer, nullable=True)
    records_updated = Column(Integer, nullable=True)
    records_skipped = Column(Integer, nullable=True)
    records_failed = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    error_details = Column(JSONB, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    triggered_by = Column(String, nullable=True)
    triggered_by_user_id = Column(UUID(as_uuid=True), nullable=True)


class FieldMapping(Base):
    __tablename__ = "field_mappings"
    __table_args__ = {"schema": INTEGRATIONS_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), nullable=False)
    entity_type = Column(String, nullable=False)
    source_field = Column(String, nullable=False)
    target_field = Column(String, nullable=False)
    transformation = Column(String, nullable=True)
    transformation_config = Column(JSONB, nullable=True)
    is_active = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now())


# =====================
# SOE SCHEMA
# =====================

class SOEPatient(Base):
    __tablename__ = "patients"
    __table_args__ = (
        UniqueConstraint("connection_id", "external_patient_id", name="uq_patients_conn_ext_id"),
        {"schema": SOE_SCHEMA},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), nullable=False)
    external_patient_id = Column(String, nullable=False)
    title = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    preferred_name = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_mobile = Column(String, nullable=True)
    phone_home = Column(String, nullable=True)
    phone_work = Column(String, nullable=True)
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    county = Column(String, nullable=True)
    postcode = Column(String, nullable=True)
    country = Column(String, nullable=True)
    registration_date = Column(Date, nullable=True)
    patient_status = Column(String, nullable=True)
    preferred_provider_id = Column(String, nullable=True)
    patient_type = Column(String, nullable=True)
    nhs_number = Column(String, nullable=True)
    exemption_status = Column(String, nullable=True)
    raw_data = Column(JSONB, nullable=True)
    source_system = Column(String, nullable=True)
    first_synced_at = Column(DateTime(timezone=True), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    sync_hash = Column(String, nullable=True)


class SOEAppointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint("connection_id", "external_appointment_id", name="uq_appointments_conn_ext_id"),
        {"schema": SOE_SCHEMA},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), nullable=False)
    external_appointment_id = Column(String, nullable=False)
    patient_id = Column(String, nullable=True)
    provider_id = Column(String, nullable=True)
    practice_id = Column(String, nullable=True)
    appointment_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    appointment_type = Column(String, nullable=True)
    appointment_status = Column(String, nullable=True)
    cancellation_reason = Column(String, nullable=True)
    treatment_codes = Column(JSONB, nullable=True)
    treatment_description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    fee_charged = Column(Numeric, nullable=True)
    fee_nhs = Column(Numeric, nullable=True)
    fee_private = Column(Numeric, nullable=True)
    payment_status = Column(String, nullable=True)
    uda_value = Column(Numeric, nullable=True)
    uoa_value = Column(Numeric, nullable=True)
    raw_data = Column(JSONB, nullable=True)
    source_system = Column(String, nullable=True)
    first_synced_at = Column(DateTime(timezone=True), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)


class SOEProvider(Base):
    __tablename__ = "providers"
    __table_args__ = (
        UniqueConstraint("connection_id", "external_provider_id", name="uq_providers_conn_ext_id"),
        {"schema": SOE_SCHEMA},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), nullable=False)
    external_provider_id = Column(String, nullable=False)
    title = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    gdc_number = Column(String, nullable=True)
    provider_type = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)
    employment_status = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    works_monday = Column(Boolean, nullable=True)
    works_tuesday = Column(Boolean, nullable=True)
    works_wednesday = Column(Boolean, nullable=True)
    works_thursday = Column(Boolean, nullable=True)
    works_friday = Column(Boolean, nullable=True)
    works_saturday = Column(Boolean, nullable=True)
    works_sunday = Column(Boolean, nullable=True)
    raw_data = Column(JSONB, nullable=True)
    source_system = Column(String, nullable=True)
    first_synced_at = Column(DateTime(timezone=True), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)


class SOETreatment(Base):
    __tablename__ = "treatments"
    __table_args__ = (
        UniqueConstraint("connection_id", "external_treatment_id", name="uq_treatments_conn_ext_id"),
        {"schema": SOE_SCHEMA},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), nullable=False)
    external_treatment_id = Column(String, nullable=False)
    appointment_id = Column(String, nullable=True)
    patient_id = Column(String, nullable=True)
    provider_id = Column(String, nullable=True)
    treatment_date = Column(Date, nullable=True)
    treatment_code = Column(String, nullable=True)
    treatment_description = Column(String, nullable=True)
    tooth_notation = Column(String, nullable=True)
    surface = Column(String, nullable=True)
    fee = Column(Numeric, nullable=True)
    fee_type = Column(String, nullable=True)
    quantity = Column(Integer, nullable=True)
    treatment_status = Column(String, nullable=True)
    raw_data = Column(JSONB, nullable=True)
    source_system = Column(String, nullable=True)
    first_synced_at = Column(DateTime(timezone=True), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
