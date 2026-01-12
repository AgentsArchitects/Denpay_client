# Client Onboarding Form - Field Mapping to Backend

## Overview
This document maps all fields from the 10-tab Client Onboarding form to the backend database schema.

---

## Tab 1: Client Information

### Form Field → Database Mapping

| Form Field | Form Name | Database Table | Database Column | Type | Notes |
|------------|-----------|----------------|-----------------|------|-------|
| Expanded Logo | expandedLogo | clients | expanded_logo_url | VARCHAR(500) | **NEW** - Store file URL after upload |
| Upload Logo | uploadLogo | clients | logo_url | VARCHAR(500) | **NEW** - Store file URL after upload |
| Type | type | clients | client_type | VARCHAR(50) | **NEW** - Values: sole-trader, partnership, ltd-company |
| Legal Client Trading Name | tradingName | clients | legal_trading_name | VARCHAR(255) | **EXISTS** |
| WorkFin Legal Entity Reference | entityReference | clients | workfin_reference | VARCHAR(100) | **EXISTS** (mapped to workfin_reference) |
| Address Line 1 | addressLine1 | client_addresses | line1 | VARCHAR(255) | **EXISTS** |
| Post Code | postCode | client_addresses | postcode | VARCHAR(20) | **EXISTS** |
| Address Line 2 | addressLine2 | client_addresses | line2 | VARCHAR(255) | **EXISTS** |
| City | city | client_addresses | city | VARCHAR(100) | **EXISTS** |
| County | county | client_addresses | county | VARCHAR(100) | **EXISTS** |
| Country | country | client_addresses | country | VARCHAR(100) | **EXISTS** |
| Company House Registration No. | companyRegNo | clients | company_registration_no | VARCHAR(50) | **NEW** |
| Xero VAT Tax Type | xeroVatTaxType | clients | xero_vat_tax_type | VARCHAR(100) | **NEW** |

---

## Tab 2: Contact Information

### Form Field → Database Mapping

| Form Field | Form Name | Database Table | Database Column | Type | Notes |
|------------|-----------|----------------|-----------------|------|-------|
| Phone Number | phoneNumber | clients | contact_phone | VARCHAR(50) | **EXISTS** |
| Email ID | emailId | clients | contact_email | VARCHAR(255) | **EXISTS** |
| Admin User Full Name | adminUserFullName | users | name | VARCHAR(255) | **NEW RECORD** - Create user record |
| Admin User Email | adminUserEmail | users | email | VARCHAR(255) | **NEW RECORD** - Create user record with ClientAdmin role |

**Note:** Admin user should be created as a separate user record linked to the client with ClientAdmin role assignment.

---

## Tab 3: License Information

### Form Field → Database Mapping

| Form Field | Form Name | Database Table | Database Column | Type | Notes |
|------------|-----------|----------------|-----------------|------|-------|
| Accounting System | accountingSystem | clients | accounting_system | VARCHAR(50) | **NEW** - Values: xero, sage |
| Xero App | xeroApp | clients | xero_app | VARCHAR(100) | **NEW** |
| Number of License Workfin Users | licenseWorkfinUsers | clients | license_workfin_users | INTEGER | **NEW** |
| Number of License Compass Connections | licenseCompassConnections | clients | license_compass_connections | INTEGER | **NEW** |
| Number of License Finance System Connections | licenseFinanceSystemConnections | clients | license_finance_system_connections | INTEGER | **NEW** |
| Number of Practice Management System Connections | licensePracticeManagementConnections | clients | license_pms_connections | INTEGER | **NEW** |
| Number of License Purchasing System Connections | licensePurchasingSystemConnections | clients | license_purchasing_system_connections | INTEGER | **NEW** |

---

## Tab 4: Accountant Details

### Form Field → Database Mapping

| Form Field | Form Name | Database Table | Database Column | Type | Notes |
|------------|-----------|----------------|-----------------|------|-------|
| Accountant Name | accountantName | clients | accountant_name | VARCHAR(255) | **NEW** |
| Accountant Address | accountantAddress | clients | accountant_address | VARCHAR(500) | **NEW** |
| Accountant Contact No. | accountantContactNo | clients | accountant_contact_no | VARCHAR(50) | **NEW** |
| Accountant Email | accountantEmail | clients | accountant_email | VARCHAR(255) | **NEW** |

**Alternative:** Could create a separate `client_accountants` table for multiple accountants per client (future-proofing).

---

## Tab 5: IT Provider Details

### Form Field → Database Mapping

| Form Field | Form Name | Database Table | Database Column | Type | Notes |
|------------|-----------|----------------|-----------------|------|-------|
| Name Of Provider | nameOfProvider | clients | it_provider_name | VARCHAR(255) | **NEW** |
| Address | address | clients | it_provider_address | VARCHAR(500) | **NEW** |
| Post Code | postCode | clients | it_provider_postcode | VARCHAR(20) | **NEW** |
| Contact Name | contactName | clients | it_provider_contact_name | VARCHAR(255) | **NEW** |
| Telephone No. | telephoneNo | clients | it_provider_phone_1 | VARCHAR(50) | **NEW** |
| Telephone No. 1 | telephoneNo1 | clients | it_provider_phone_2 | VARCHAR(50) | **NEW** |
| Email | email | clients | it_provider_email | VARCHAR(255) | **NEW** |
| Additional Notes | additionalNotes | clients | it_provider_notes | TEXT | **NEW** |

**Alternative:** Could create a separate `client_it_providers` table for multiple providers per client.

---

## Tab 6: Adjustment Types

### Form Field → Database Mapping

| Form Field | Form Name | Database Table | Database Column | Type | Notes |
|------------|-----------|----------------|-----------------|------|-------|
| Adjustment Types (Array) | adjustmentTypes | **NEW TABLE:** `client_adjustment_types` | Multiple records | - | **CREATE NEW TABLE** |

**New Table Structure: `client_adjustment_types`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| client_id | UUID | FK → clients(id), NOT NULL | Parent client |
| name | VARCHAR(255) | NOT NULL | Adjustment type name |
| created_at | TIMESTAMPTZ | NOT NULL | Record creation time |

**Default Values:** Mentoring Fee, Retainer Fee, Therapist - Invoice, Locum - Days, Reconciliation Adjustment, Payment on Account, Previous Period Payment, Training and Other

---

## Tab 7: PMS Integration Details

### Form Field → Database Mapping

Currently shows "No data found" with "+ Add More" buttons for:
- SOE
- DENTALLY
- SFD
- CARESTACK

**New Table Structure: `client_pms_integrations`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| client_id | UUID | FK → clients(id), NOT NULL | Parent client |
| pms_type | VARCHAR(50) | NOT NULL | Values: SOE, DENTALLY, SFD, CARESTACK |
| integration_config | JSONB | NULL | Integration configuration (flexible structure) |
| status | VARCHAR(50) | DEFAULT 'Active' | Active/Inactive |
| created_at | TIMESTAMPTZ | NOT NULL | Record creation time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last update time |

**Note:** This table structure allows for future dynamic addition of PMS integrations. The form doesn't currently have input fields for this tab.

---

## Tab 8: Denpay Period

### Form Field → Database Mapping

| Form Field | Form Name Pattern | Database Table | Database Column | Type | Notes |
|------------|-------------------|----------------|-----------------|------|-------|
| Month | denpay_month_{index} | **NEW TABLE:** `client_denpay_periods` | month | DATE | Month picker value |
| From | denpay_from_{index} | client_denpay_periods | from_date | DATE | Start date |
| To | denpay_to_{index} | client_denpay_periods | to_date | DATE | End date |

**New Table Structure: `client_denpay_periods`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| client_id | UUID | FK → clients(id), NOT NULL | Parent client |
| month | DATE | NOT NULL | Month reference (first day of month) |
| from_date | DATE | NOT NULL | Period start date |
| to_date | DATE | NOT NULL | Period end date |
| created_at | TIMESTAMPTZ | NOT NULL | Record creation time |

**Note:** Different from global `compass_dates` table - this is client-specific configuration.

---

## Tab 9: FY End

### Form Field → Database Mapping

| Form Field | Form Name Pattern | Database Table | Database Column | Type | Notes |
|------------|-------------------|----------------|-----------------|------|-------|
| Month | fyend_month_{index} | **NEW TABLE:** `client_fy_end_periods` | month | DATE | Month picker value |
| From | fyend_from_{index} | client_fy_end_periods | from_date | DATE | Start date |
| To | fyend_to_{index} | client_fy_end_periods | to_date | DATE | End date |

**New Table Structure: `client_fy_end_periods`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| client_id | UUID | FK → clients(id), NOT NULL | Parent client |
| month | DATE | NOT NULL | Month reference (first day of month) |
| from_date | DATE | NOT NULL | Period start date |
| to_date | DATE | NOT NULL | Period end date |
| created_at | TIMESTAMPTZ | NOT NULL | Record creation time |

---

## Tab 10: Feature Access

### Form Field → Database Mapping

| Form Field | Form Name | Database Table | Database Column | Type | Notes |
|------------|-----------|----------------|-----------------|------|-------|
| Clinician Pay System | clinicianPayEnabled | clients | feature_clinician_pay_enabled | BOOLEAN | **NEW** - Default: TRUE |
| Power BI Reports | powerBIEnabled | clients | feature_powerbi_enabled | BOOLEAN | **NEW** - Default: FALSE |

---

## Summary of Changes Required

### 1. Update `clients` Table (Add 20+ new columns)

**Branding & Identity:**
- `expanded_logo_url` VARCHAR(500)
- `logo_url` VARCHAR(500)
- `client_type` VARCHAR(50)
- `company_registration_no` VARCHAR(50)
- `xero_vat_tax_type` VARCHAR(100)

**License Information:**
- `accounting_system` VARCHAR(50)
- `xero_app` VARCHAR(100)
- `license_workfin_users` INTEGER
- `license_compass_connections` INTEGER
- `license_finance_system_connections` INTEGER
- `license_pms_connections` INTEGER
- `license_purchasing_system_connections` INTEGER

**Accountant Details:**
- `accountant_name` VARCHAR(255)
- `accountant_address` VARCHAR(500)
- `accountant_contact_no` VARCHAR(50)
- `accountant_email` VARCHAR(255)

**IT Provider Details:**
- `it_provider_name` VARCHAR(255)
- `it_provider_address` VARCHAR(500)
- `it_provider_postcode` VARCHAR(20)
- `it_provider_contact_name` VARCHAR(255)
- `it_provider_phone_1` VARCHAR(50)
- `it_provider_phone_2` VARCHAR(50)
- `it_provider_email` VARCHAR(255)
- `it_provider_notes` TEXT

**Feature Access:**
- `feature_clinician_pay_enabled` BOOLEAN DEFAULT TRUE
- `feature_powerbi_enabled` BOOLEAN DEFAULT FALSE

### 2. Create New Tables

1. **`client_adjustment_types`** - For managing adjustment types per client
2. **`client_pms_integrations`** - For PMS integration configurations
3. **`client_denpay_periods`** - For Denpay period configurations
4. **`client_fy_end_periods`** - For FY End period configurations

### 3. Handle Admin User Creation

When creating a client, also create:
1. A `users` record with the admin user details
2. A `user_roles` record assigning the ClientAdmin role
3. Link the user to the client via `client_id`

---

## API Request Structure

### Example POST /api/clients/ Request Body

```json
{
  // Tab 1: Client Information
  "expanded_logo_url": "https://storage.url/logo-expanded.png",
  "logo_url": "https://storage.url/logo.png",
  "client_type": "ltd-company",
  "legal_trading_name": "Dental Care Ltd",
  "workfin_reference": "DEN2237",
  "company_registration_no": "12345678",
  "xero_vat_tax_type": "Standard Rate",
  "address": {
    "line1": "123 High Street",
    "line2": "Suite 100",
    "city": "London",
    "county": "Greater London",
    "postcode": "SW1A 1AA",
    "country": "United Kingdom"
  },

  // Tab 2: Contact Information
  "contact_phone": "+44 20 1234 5678",
  "contact_email": "info@dentalcare.com",
  "admin_user": {
    "name": "John Smith",
    "email": "john.smith@dentalcare.com"
  },

  // Tab 3: License Information
  "accounting_system": "xero",
  "xero_app": "xero-uk",
  "license_workfin_users": 5,
  "license_compass_connections": 3,
  "license_finance_system_connections": 2,
  "license_pms_connections": 1,
  "license_purchasing_system_connections": 1,

  // Tab 4: Accountant Details
  "accountant_name": "ABC Accountants Ltd",
  "accountant_address": "456 Business Park",
  "accountant_contact_no": "+44 20 9876 5432",
  "accountant_email": "contact@abcaccountants.com",

  // Tab 5: IT Provider Details
  "it_provider_name": "Tech Solutions Ltd",
  "it_provider_address": "789 Tech Street",
  "it_provider_postcode": "EC1A 1BB",
  "it_provider_contact_name": "Jane Doe",
  "it_provider_phone_1": "+44 20 1111 2222",
  "it_provider_phone_2": "+44 20 3333 4444",
  "it_provider_email": "support@techsolutions.com",
  "it_provider_notes": "Preferred contact time: 9am-5pm",

  // Tab 6: Adjustment Types
  "adjustment_types": [
    { "name": "Mentoring Fee" },
    { "name": "Retainer Fee" },
    { "name": "Therapist - Invoice" },
    { "name": "Locum - Days" },
    { "name": "Reconciliation Adjustment" },
    { "name": "Payment on Account" },
    { "name": "Previous Period Payment" },
    { "name": "Training and Other" }
  ],

  // Tab 7: PMS Integration Details
  "pms_integrations": [],

  // Tab 8: Denpay Period
  "denpay_periods": [
    {
      "month": "2025-01-01",
      "from_date": "2025-01-01",
      "to_date": "2025-01-31"
    }
  ],

  // Tab 9: FY End
  "fy_end_periods": [
    {
      "month": "2025-04-01",
      "from_date": "2025-04-01",
      "to_date": "2026-03-31"
    }
  ],

  // Tab 10: Feature Access
  "feature_clinician_pay_enabled": true,
  "feature_powerbi_enabled": false
}
```

---

## Implementation Priority

### Phase 1: Core Fields (Immediate)
1. ✅ Clients table basic fields (already exists)
2. ✅ Client addresses (already exists)
3. ⬜ Add new columns to clients table
4. ⬜ Update Pydantic schemas
5. ⬜ Update API endpoint to accept nested data

### Phase 2: Related Tables (Next)
1. ⬜ Create admin user during client creation
2. ⬜ Create client_adjustment_types table
3. ⬜ Create client_denpay_periods table
4. ⬜ Create client_fy_end_periods table

### Phase 3: Advanced Features (Later)
1. ⬜ Create client_pms_integrations table
2. ⬜ File upload handling for logos
3. ⬜ Validation and business logic

---

## Notes

1. **Logo Files**: Currently the form accepts file uploads. We need to:
   - Set up file storage (Supabase Storage or S3)
   - Handle file upload separately
   - Store URLs in database

2. **Admin User**: Should be created as part of the client creation transaction to ensure atomicity.

3. **Adjustment Types**: The form has default values that should be pre-populated for new clients.

4. **PMS Integration**: Tab 7 currently has no input fields, just placeholders. This can be implemented later.

5. **Date Formats**: Ant Design DatePicker returns moment/dayjs objects - convert to ISO date strings before sending to API.
