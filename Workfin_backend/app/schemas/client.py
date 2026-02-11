from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


# =====================
# NESTED SCHEMAS FOR RELATED DATA
# =====================

class PracticeResponse(BaseModel):
    """Practice/Location response schema"""
    id: str  # practice_id (8-char alphanumeric)
    name: str
    location_id: str
    status: str
    external_system_id: Optional[str] = None
    acquisition_date: Optional[date] = None

    class Config:
        from_attributes = True


class ClientAddressBase(BaseModel):
    """Address information for a client"""
    line1: str = Field(..., description="Address line 1")
    line2: Optional[str] = Field(None, description="Address line 2")
    city: str = Field(..., description="City")
    postcode: str = Field(..., description="Postal code")
    country: str = Field(default="United Kingdom", description="Country")


class ClientAddressCreate(ClientAddressBase):
    pass


class ClientAddressResponse(ClientAddressBase):
    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    """Admin user to be created with the client (Contact Information)"""
    email: EmailStr = Field(..., description="Email address of admin user")

    # Accept either combined name OR separate first/last names
    name: Optional[str] = Field(None, description="Full name (backward compatibility)")
    first_name: Optional[str] = Field(None, description="First name of admin user")
    last_name: Optional[str] = Field(None, description="Last name of admin user")
    phone: Optional[str] = Field(None, description="Phone number of admin user")

    def model_post_init(self, __context) -> None:
        """Split name into first_name and last_name if provided as single field"""
        if self.name and not self.first_name and not self.last_name:
            # Split name into first and last
            parts = self.name.strip().split(maxsplit=1)
            self.first_name = parts[0] if len(parts) > 0 else ""
            self.last_name = parts[1] if len(parts) > 1 else ""
        elif self.first_name and self.last_name and not self.name:
            # Combine first and last into name
            self.name = f"{self.first_name} {self.last_name}".strip()
        elif not self.name and not self.first_name:
            raise ValueError("Either 'name' or 'first_name' and 'last_name' must be provided")


class UserResponse(BaseModel):
    """User response schema"""
    id: UUID
    name: str
    email: EmailStr

    class Config:
        from_attributes = True


class AdjustmentTypeBase(BaseModel):
    """Adjustment type for payroll adjustments"""
    name: str = Field(..., description="Name of the adjustment type")


class AdjustmentTypeCreate(AdjustmentTypeBase):
    pass


class AdjustmentTypeResponse(AdjustmentTypeBase):
    id: UUID

    class Config:
        from_attributes = True


class DenpayPeriodBase(BaseModel):
    """Denpay payment period"""
    month: date = Field(..., description="Month (first day)")
    from_date: date = Field(..., description="Period start date")
    to_date: date = Field(..., description="Period end date")


class DenpayPeriodCreate(DenpayPeriodBase):
    pass


class DenpayPeriodResponse(DenpayPeriodBase):
    id: UUID

    class Config:
        from_attributes = True


class FYEndPeriodBase(BaseModel):
    """Financial year end period"""
    month: date = Field(..., description="Month (first day)")
    from_date: date = Field(..., description="Period start date")
    to_date: date = Field(..., description="Period end date")


class FYEndPeriodCreate(FYEndPeriodBase):
    pass


class FYEndPeriodResponse(FYEndPeriodBase):
    id: UUID

    class Config:
        from_attributes = True


# =====================
# CLIENT SCHEMAS
# =====================

class ClientBase(BaseModel):
    """Base schema for client with all form fields"""

    # Tab 1: Client Information - Basic Details
    legal_trading_name: str = Field(..., alias="legal_client_trading_name", description="Legal trading name")
    workfin_reference: str = Field(..., alias="workfin_legal_entity_reference", description="WorkFin reference code")

    # Tab 1: Client Information - Branding
    expanded_logo_url: Optional[str] = Field(None, description="Expanded logo URL")
    logo_url: Optional[str] = Field(None, description="Logo URL")
    client_type: Optional[str] = Field(None, description="Type: sole-trader, partnership, ltd-company")
    company_registration_no: Optional[str] = Field(None, alias="company_registration", description="Company registration number")
    xero_vat_tax_type: Optional[str] = Field(None, alias="xero_vat_type", description="Xero VAT tax type")

    # Tab 2: Contact Information
    contact_phone: str = Field(..., alias="phone", description="Primary contact phone")
    contact_email: EmailStr = Field(..., alias="email", description="Primary contact email")
    contact_first_name: Optional[str] = Field(None, description="Primary contact first name")
    contact_last_name: Optional[str] = Field(None, description="Primary contact last name")

    # Tab 3: License Information
    accounting_system: Optional[str] = Field(None, description="Accounting system: xero, sage")
    xero_app: Optional[str] = Field(None, description="Xero app identifier")
    license_workfin_users: Optional[int] = Field(0, alias="workfin_users_count")
    license_compass_connections: Optional[int] = Field(0, alias="compass_connections_count")
    license_finance_system_connections: Optional[int] = Field(0, alias="finance_system_connections_count")
    license_pms_connections: Optional[int] = Field(0, alias="pms_connections_count")
    license_purchasing_system_connections: Optional[int] = Field(0, alias="purchasing_system_connections_count")

    # Tab 4: Accountant Details
    accountant_name: Optional[str] = Field(None, description="Accountant name")
    accountant_address: Optional[str] = Field(None, description="Accountant address")
    accountant_contact_no: Optional[str] = Field(None, alias="accountant_contact")
    accountant_email: Optional[EmailStr] = Field(None, description="Accountant email")

    # Tab 5: IT Provider Details
    it_provider_name: Optional[str] = Field(None)
    it_provider_address: Optional[str] = Field(None)
    it_provider_postcode: Optional[str] = Field(None)
    it_provider_contact_name: Optional[str] = Field(None)
    it_provider_phone_1: Optional[str] = Field(None)
    it_provider_phone_2: Optional[str] = Field(None)
    it_provider_email: Optional[EmailStr] = Field(None)
    it_provider_notes: Optional[str] = Field(None)

    # Tab 10: Feature Access
    feature_clinician_pay_enabled: Optional[bool] = Field(True, alias="clinician_pay_system_enabled")
    feature_powerbi_enabled: Optional[bool] = Field(False, alias="power_bi_reports_enabled")

    class Config:
        populate_by_name = True
        from_attributes = True


class ClientCreate(ClientBase):
    """Schema for creating a new client with all related data"""
    address: ClientAddressCreate = Field(..., description="Client address")
    admin_user: AdminUserCreate = Field(..., description="Admin user to create")
    adjustment_types: Optional[List[AdjustmentTypeCreate]] = Field(default_factory=list)
    denpay_periods: Optional[List[DenpayPeriodCreate]] = Field(default_factory=list)
    fy_end_periods: Optional[List[FYEndPeriodCreate]] = Field(default_factory=list)


class ClientUpdate(BaseModel):
    """Schema for updating a client - all fields optional"""
    legal_trading_name: Optional[str] = Field(None, alias="legal_client_trading_name")
    workfin_reference: Optional[str] = Field(None, alias="workfin_legal_entity_reference")
    expanded_logo_url: Optional[str] = None
    logo_url: Optional[str] = None
    client_type: Optional[str] = None
    company_registration_no: Optional[str] = Field(None, alias="company_registration")
    xero_vat_tax_type: Optional[str] = Field(None, alias="xero_vat_type")
    contact_phone: Optional[str] = Field(None, alias="phone")
    contact_email: Optional[EmailStr] = Field(None, alias="email")
    accounting_system: Optional[str] = None
    xero_app: Optional[str] = None
    license_workfin_users: Optional[int] = Field(None, alias="workfin_users_count")
    license_compass_connections: Optional[int] = Field(None, alias="compass_connections_count")
    license_finance_system_connections: Optional[int] = Field(None, alias="finance_system_connections_count")
    license_pms_connections: Optional[int] = Field(None, alias="pms_connections_count")
    license_purchasing_system_connections: Optional[int] = Field(None, alias="purchasing_system_connections_count")
    accountant_name: Optional[str] = None
    accountant_address: Optional[str] = None
    accountant_contact_no: Optional[str] = Field(None, alias="accountant_contact")
    accountant_email: Optional[EmailStr] = None
    it_provider_name: Optional[str] = None
    it_provider_address: Optional[str] = None
    it_provider_postcode: Optional[str] = None
    it_provider_contact_name: Optional[str] = None
    it_provider_phone_1: Optional[str] = None
    it_provider_phone_2: Optional[str] = None
    it_provider_email: Optional[EmailStr] = None
    it_provider_notes: Optional[str] = None
    feature_clinician_pay_enabled: Optional[bool] = Field(None, alias="clinician_pay_system_enabled")
    feature_powerbi_enabled: Optional[bool] = Field(None, alias="power_bi_reports_enabled")
    status: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class ClientResponse(BaseModel):
    """Schema for client response with all related data"""
    id: str  # tenant_id (8-char alphanumeric)
    tenant_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    legal_trading_name: str
    workfin_reference: str
    expanded_logo_url: Optional[str] = None
    logo_url: Optional[str] = None
    client_type: Optional[str] = None
    company_registration_no: Optional[str] = None
    xero_vat_tax_type: Optional[str] = None
    contact_phone: str
    contact_email: str
    accounting_system: Optional[str] = None
    xero_app: Optional[str] = None
    license_workfin_users: Optional[int] = 0
    license_compass_connections: Optional[int] = 0
    license_finance_system_connections: Optional[int] = 0
    license_pms_connections: Optional[int] = 0
    license_purchasing_system_connections: Optional[int] = 0
    accountant_name: Optional[str] = None
    accountant_address: Optional[str] = None
    accountant_contact_no: Optional[str] = None
    accountant_email: Optional[str] = None
    it_provider_name: Optional[str] = None
    it_provider_address: Optional[str] = None
    it_provider_postcode: Optional[str] = None
    it_provider_contact_name: Optional[str] = None
    it_provider_phone_1: Optional[str] = None
    it_provider_phone_2: Optional[str] = None
    it_provider_email: Optional[str] = None
    it_provider_notes: Optional[str] = None
    feature_clinician_pay_enabled: Optional[bool] = True
    feature_powerbi_enabled: Optional[bool] = False

    address: Optional[ClientAddressResponse] = None
    users: List[UserResponse] = Field(default_factory=list)
    practices: List[PracticeResponse] = Field(default_factory=list)
    adjustment_types: List[AdjustmentTypeResponse] = Field(default_factory=list)
    denpay_periods: List[DenpayPeriodResponse] = Field(default_factory=list)
    fy_end_periods: List[FYEndPeriodResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ClientListItem(BaseModel):
    """Schema for client list items (summary view)"""
    id: str  # tenant_id (8-char alphanumeric)
    tenant_id: str
    legal_trading_name: str
    workfin_reference: str
    status: str
    contact_email: str
    contact_phone: str
    client_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
