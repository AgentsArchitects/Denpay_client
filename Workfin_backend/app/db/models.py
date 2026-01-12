from sqlalchemy import Column, String, DateTime, ForeignKey, Date, Boolean, Text, Integer, Numeric, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic Information
    legal_trading_name = Column(String(255), nullable=False)
    workfin_reference = Column(String(100), nullable=False, unique=True)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    status = Column(ENUM('Active', 'Inactive', name='entity_status', schema=SCHEMA, create_type=False), nullable=False, default="Active")

    # Branding & Identity (Tab 1)
    expanded_logo_url = Column(String(500), nullable=True)
    logo_url = Column(String(500), nullable=True)
    client_type = Column(String(50), nullable=True)  # sole-trader, partnership, ltd-company
    company_registration_no = Column(String(50), nullable=True)
    xero_vat_tax_type = Column(String(100), nullable=True)

    # License Information (Tab 3)
    accounting_system = Column(String(50), nullable=True)  # xero, sage
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

    # Relationships
    address = relationship("ClientAddress", back_populates="client", uselist=False, cascade="all, delete-orphan")
    users = relationship("User", back_populates="client", cascade="all, delete-orphan")
    practices = relationship("Practice", back_populates="client", cascade="all, delete-orphan")
    adjustment_types = relationship("ClientAdjustmentType", back_populates="client", cascade="all, delete-orphan")
    denpay_periods = relationship("ClientDenpayPeriod", back_populates="client", cascade="all, delete-orphan")
    fy_end_periods = relationship("ClientFYEndPeriod", back_populates="client", cascade="all, delete-orphan")
    pms_integrations = relationship("ClientPMSIntegration", back_populates="client", cascade="all, delete-orphan")


class ClientAddress(Base):
    __tablename__ = "client_addresses"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.clients.id'), nullable=False, unique=True)
    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    county = Column(String(100), nullable=True)
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
    client_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.clients.id'), nullable=False)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.clients.id'), nullable=False)
    name = Column(String(255), nullable=False)
    location_id = Column(String(100), nullable=False)
    acquisition_date = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="Active")
    integration_id = Column(String(100), nullable=False)
    external_system_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    client = relationship("Client", back_populates="practices")
    address = relationship("PracticeAddress", back_populates="practice", uselist=False)


class PracticeAddress(Base):
    __tablename__ = "practice_addresses"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.practices.id'), nullable=False, unique=True)
    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    county = Column(String(100), nullable=True)
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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
    clinician_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.clinicians.id'), nullable=False, unique=True)
    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    county = Column(String(100), nullable=True)
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
    client_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.clients.id'), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="adjustment_types")


class ClientPMSIntegration(Base):
    """Tab 7: PMS Integration Details - Practice Management System integrations"""
    __tablename__ = "client_pms_integrations"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.clients.id'), nullable=False)
    pms_type = Column(String(50), nullable=False)  # SOE, DENTALLY, SFD, CARESTACK
    integration_config = Column(Text, nullable=True)  # JSON configuration
    status = Column(String(50), nullable=False, default="Active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    client = relationship("Client", back_populates="pms_integrations")


class ClientDenpayPeriod(Base):
    """Tab 8: Denpay Period - Client-specific Denpay payment periods"""
    __tablename__ = "client_denpay_periods"
    __table_args__ = {"schema": SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.clients.id'), nullable=False)
    month = Column(Date, nullable=False)  # First day of month
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
    client_id = Column(UUID(as_uuid=True), ForeignKey(f'{SCHEMA}.clients.id'), nullable=False)
    month = Column(Date, nullable=False)  # First day of month
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="fy_end_periods")
