from sqlalchemy import Column, String, DateTime, ForeignKey, Date, Boolean, Text, Integer, Numeric, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
from app.db.utils import generate_alphanumeric_id
import uuid
import enum

# Define schema name
SCHEMA = "denpay-dev"

# Enum types (matching database enums)
class EntityStatus(str, enum.Enum):
    Active = "Active"
    Inactive = "Inactive"

class UserRole(str, enum.Enum):
    SuperAdmin = "SuperAdmin"
    ClientAdmin = "ClientAdmin"
    PracticeManager = "PracticeManager"
    ManagerReadonly = "ManagerReadonly"
    HR = "HR"
    Operation = "Operation"
    Finance = "Finance"
    DenpayAdmin = "DenpayAdmin"
    Clinician = "Clinician"

class ApprovalStatus(str, enum.Enum):
    Draft = "Draft"
    Pending = "Pending"
    Approved = "Approved"
    Rejected = "Rejected"


# =====================
# CORE TABLES
# =====================

class Client(Base):
    __tablename__ = "clients"
    __table_args__ = {"schema": SCHEMA}

    tenant_id = Column(String(8), primary_key=True, default=generate_alphanumeric_id)

    # Basic Information
    legal_trading_name = Column(String(255), nullable=False)
    workfin_reference = Column(String(100), nullable=False, unique=True)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    contact_first_name = Column(String(100), nullable=True)
    contact_last_name = Column(String(100), nullable=True)
    status = Column(ENUM('Active', 'Inactive', name='entity_status', schema=SCHEMA, create_type=False), nullable=False, default="Active")

    # Branding & Identity (Tab 1)
    expanded_logo_url = Column(String(500), nullable=True)
    logo_url = Column(String(500), nullable=True)
    client_type = Column(String(50), nullable=True)
    company_registration_no = Column(String(50), nullable=True)
    xero_vat_tax_type = Column(String(100), nullable=True)

    # License Information (Tab 3)
    accounting_system = Column(String(50), nullable=True)
    xero_app = Column(String(100), nullable=True)
    license_workfin_users = Column(Integer, nullable=True, default=0)
    license_compass_connections = Column(Integer, nullable=True, default=0)
    license_finance_system_connections = Column(Integer, nullable=True, default=0)
    license_pms_connections = Column(Integer, nullable=True, default=0)
    license_purchasing_system_connections = Column(Integer, nullable=True, default=0)

    # Accountant Details (Tab 4)
    accountant_name = Column(String(255), nullable=True)
    accountant_address = Column(String(500), nullable=True)
    accountant_contact_no = Column(String(50), nullable=True)
    accountant_email = Column(String(255), nullable=True)

    # IT Provider Details (Tab 5)
    it_provider_name = Column(String(255), nullable=True)
    it_provider_address = Column(String(500), nullable=True)
    it_provider_postcode = Column(String(20), nullable=True)
    it_provider_contact_name = Column(String(255), nullable=True)
    it_provider_phone_1 = Column(String(50), nullable=True)
    it_provider_phone_2 = Column(String(50), nullable=True)
    it_provider_email = Column(String(255), nullable=True)
    it_provider_notes = Column(Text, nullable=True)

    # Feature Access (Tab 10)
    feature_clinician_pay_enabled = Column(Boolean, nullable=False, default=True)
    feature_powerbi_enabled = Column(Boolean, nullable=False, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Alias for schema compatibility (ClientResponse expects 'id')
    @property
    def id(self):
        return self.tenant_id

    # Relationships
    address = relationship("ClientAddress", back_populates="client", uselist=False, cascade="all, delete-orphan")
    users = relationship("User", back_populates="client", cascade="all, delete-orphan")
    practices = relationship("Practice", back_populates="client", cascade="all, delete-orphan")
    adjustment_types = relationship("ClientAdjustmentType", back_populates="client", cascade="all, delete-orphan")
    denpay_periods = relationship("ClientDenpayPeriod", back_populates="client", cascade="all, delete-orphan")
    fy_end_periods = relationship("ClientFYEndPeriod", back_populates="client", cascade="all, delete-orphan")


class ClientAddress(Base):
    __tablename__ = "client_addresses"
    __table_args__ = {"schema": SCHEMA}

    tenant_id = Column(String(8), ForeignKey(f'{SCHEMA}.clients.tenant_id'), primary_key=True)
    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    postcode = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False, default="United Kingdom")

    # Relationships
    client = relationship("Client", back_populates="address")


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    tenant_id = Column(String(8), ForeignKey(f'{SCHEMA}.clients.tenant_id'), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    client = relationship("Client", back_populates="users")
    roles = relationship("UserRoleAssignment", back_populates="user", cascade="all, delete-orphan")


class UserRoleAssignment(Base):
    __tablename__ = "user_roles"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.users.id'), nullable=False)
    role = Column(ENUM('SuperAdmin', 'ClientAdmin', 'PracticeManager', 'ManagerReadonly', 'HR', 'Operation', 'Finance', 'DenpayAdmin', 'Clinician', name='user_role', schema=SCHEMA, create_type=False), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="roles")


# =====================
# PRACTICE TABLES
# =====================

class Practice(Base):
    __tablename__ = "practices"
    __table_args__ = {"schema": SCHEMA}

    practice_id = Column(String(8), primary_key=True, default=generate_alphanumeric_id)
    tenant_id = Column(String(8), ForeignKey(f'{SCHEMA}.clients.tenant_id'), nullable=False)
    name = Column(String(255), nullable=False)
    location_id = Column(String(100), nullable=False)
    acquisition_date = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="Active")
    external_system_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Alias for schema compatibility (PracticeResponse expects 'id')
    @property
    def id(self):
        return self.practice_id

    # Relationships
    client = relationship("Client", back_populates="practices")
    address = relationship("PracticeAddress", back_populates="practice", uselist=False)


class PracticeAddress(Base):
    __tablename__ = "practice_addresses"
    __table_args__ = {"schema": SCHEMA}

    practice_id = Column(String(8), ForeignKey(f'{SCHEMA}.practices.practice_id'), primary_key=True)
    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    postcode = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False, default="United Kingdom")

    # Relationships
    practice = relationship("Practice", back_populates="address")


# =====================
# CLINICIAN TABLES
# =====================

class Clinician(Base):
    __tablename__ = "clinicians"
    __table_args__ = {"schema": SCHEMA}

    clinician_id = Column(String(8), primary_key=True, default=generate_alphanumeric_id)
    title = Column(String, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(50), nullable=True)
    gender = Column(String, nullable=False)
    nationality = Column(String(100), nullable=False)
    contractual_status = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Active")
    reporting_manager = Column(String, nullable=True)
    pms_ref_no = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    address = relationship("ClinicianAddress", back_populates="clinician", uselist=False)


class ClinicianAddress(Base):
    __tablename__ = "clinician_addresses"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinician_id = Column(String(8), ForeignKey(f'{SCHEMA}.clinicians.clinician_id'), nullable=False, unique=True)
    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    postcode = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False, default="United Kingdom")

    # Relationships
    clinician = relationship("Clinician", back_populates="address")


# =====================
# SYSTEM TABLES
# =====================

class CompassDate(Base):
    __tablename__ = "compass_dates"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    month = Column(String(7), nullable=False, unique=True)
    schedule_period = Column(String(50), nullable=False)
    adjustment_deadline = Column(Date, nullable=False)
    processing_cutoff = Column(Date, nullable=False)
    pay_statements_available = Column(Date, nullable=False)
    pay_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


# =====================
# CLIENT ONBOARDING RELATED TABLES
# =====================

class ClientAdjustmentType(Base):
    """Tab 6: Adjustment Types - Client-specific adjustment types"""
    __tablename__ = "client_adjustment_types"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(8), ForeignKey(f'{SCHEMA}.clients.tenant_id'), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="adjustment_types")


class ClientDenpayPeriod(Base):
    """Tab 8: Denpay Period - Client-specific Denpay payment periods"""
    __tablename__ = "client_denpay_periods"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(8), ForeignKey(f'{SCHEMA}.clients.tenant_id'), nullable=False)
    month = Column(Date, nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="denpay_periods")


class ClientFYEndPeriod(Base):
    """Tab 9: FY End - Client-specific financial year end periods"""
    __tablename__ = "client_fy_end_periods"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(8), ForeignKey(f'{SCHEMA}.clients.tenant_id'), nullable=False)
    month = Column(Date, nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="fy_end_periods")


class XeroConnection(Base):
    """Xero connection linked to a client via tenant_id"""
    __tablename__ = "xero_connections"
    __table_args__ = {"schema": SCHEMA}

    xero_tenant_id = Column(String(8), primary_key=True, default=generate_alphanumeric_id)
    xero_tenant_name = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    token_expires_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), nullable=False, default="CONNECTED")
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    connected_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    tenant_id = Column(String(8), ForeignKey(f'{SCHEMA}.clients.tenant_id'), nullable=False)
    tenant_name = Column(String(255), nullable=True)  # Client's legal_trading_name
