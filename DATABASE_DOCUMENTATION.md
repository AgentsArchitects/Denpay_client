# WorkFin/DenPay Database Documentation

## Complete Database Reference for Client Onboarding & Other UIs

This document provides a comprehensive overview of the PostgreSQL database hosted on Supabase for the WorkFin/DenPay healthcare payroll management platform.

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Connection Details](#connection-details)
3. [Schema Information](#schema-information)
4. [Database Architecture](#database-architecture)
5. [Complete Table Reference](#complete-table-reference)
6. [Enum Types Reference](#enum-types-reference)
7. [Relationships & Foreign Keys](#relationships--foreign-keys)
8. [Row Level Security (RLS)](#row-level-security-rls)
9. [Helper Functions](#helper-functions)
10. [Database Views](#database-views)
11. [Integration Guide](#integration-guide)
12. [Common Queries](#common-queries)

---

## Database Overview

### System Purpose
WorkFin is a **multi-tenant healthcare payroll management platform** for dental practices. It handles:

- **Client/Tenant Management** - Organizations using the platform
- **Practice Management** - Dental practices within each client
- **Clinician Management** - Dentists, hygienists, therapists
- **Rate Management** - Income and deduction rates
- **Financial Adjustments** - Cross charges, lab costs, income adjustments
- **Paysheet Generation** - Monthly payroll with approval workflows
- **Reporting & Analytics** - Dashboard metrics and financial reports

### Multi-Tenant Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS (Tenants)                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Client A (e.g., "ABC Dental Group")                    │ │
│  │  ├── Users (Admin, HR, Finance, etc.)                   │ │
│  │  ├── Practices (Multiple dental locations)              │ │
│  │  │   ├── Clinicians (Dentists, Hygienists)              │ │
│  │  │   ├── NHS Contracts                                  │ │
│  │  │   ├── Rates & Adjustments                            │ │
│  │  │   └── Paysheets                                      │ │
│  │  └── Synapse Config (Azure data integration)            │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Client B (e.g., "XYZ Healthcare")                      │ │
│  │  └── ... (Same structure, isolated data)                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Connection Details

### Supabase Configuration

```javascript
// Environment Variables Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Schema Name
```
Schema: "denpay-dev"
```

**Important:** All tables, types, and functions exist in the `"denpay-dev"` schema (not `public`).

### JavaScript/TypeScript Connection

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'denpay-dev'  // IMPORTANT: Specify the schema
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
})
```

### Direct SQL Connection
When running SQL queries, always set the search path first:
```sql
SET search_path TO "denpay-dev", public;
```

---

## Schema Information

### Schema: `denpay-dev`

All database objects (tables, types, functions, views) are created in the `denpay-dev` schema.

### Why Custom Schema?
- **Isolation**: Separates application data from Supabase system tables
- **Security**: Custom RLS policies with schema-specific functions
- **Organization**: Clear boundary for application-specific objects

---

## Database Architecture

### Entity Relationship Diagram (Simplified)

```
                            ┌──────────────┐
                            │   CLIENTS    │
                            │  (Tenants)   │
                            └──────┬───────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │    USERS     │       │  PRACTICES   │       │   SYNAPSE    │
    │              │       │              │       │   CONFIG     │
    └──────┬───────┘       └──────┬───────┘       └──────────────┘
           │                       │
           │               ┌───────┴───────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  USER_ROLES  │ │  CLINICIANS  │ │ NHS_CONTRACTS│
    │              │ │              │ │              │
    └──────────────┘ └──────┬───────┘ └──────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │  RATES   │  │ADJUSTMENTS│ │ PAYSHEETS │
       │          │  │          │  │          │
       └──────────┘  └──────────┘  └──────────┘
```

---

## Complete Table Reference

### 1. CLIENTS & TENANCY

#### `clients`
The root entity for multi-tenant isolation. Every organization is a client.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `legal_trading_name` | VARCHAR(255) | NOT NULL | Official company name |
| `workfin_reference` | VARCHAR(100) | NOT NULL, UNIQUE | Internal reference code (e.g., "WF-ABC-001") |
| `contact_email` | VARCHAR(255) | NOT NULL | Primary contact email |
| `contact_phone` | VARCHAR(50) | NOT NULL | Primary contact phone |
| `status` | entity_status | NOT NULL, DEFAULT 'Active' | Active/Inactive |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update time (auto-updated) |

**Example:**
```sql
INSERT INTO clients (legal_trading_name, workfin_reference, contact_email, contact_phone)
VALUES ('ABC Dental Group Ltd', 'WF-ABC-001', 'admin@abcdental.com', '+44 20 1234 5678');
```

---

#### `client_addresses`
Physical address for each client (one-to-one with clients).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `client_id` | UUID | FK → clients(id), UNIQUE | Parent client |
| `line1` | VARCHAR(255) | NOT NULL | Address line 1 |
| `line2` | VARCHAR(255) | NULL | Address line 2 |
| `city` | VARCHAR(100) | NOT NULL | City |
| `county` | VARCHAR(100) | NULL | County/State |
| `postcode` | VARCHAR(20) | NOT NULL | Postal code |
| `country` | VARCHAR(100) | NOT NULL, DEFAULT 'United Kingdom' | Country |

---

#### `synapse_configs`
Azure Synapse integration configuration per client.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `client_id` | UUID | FK → clients(id), UNIQUE | Parent client |
| `tenant_id` | VARCHAR(255) | NOT NULL | Azure tenant ID |
| `workspace_name` | VARCHAR(255) | NOT NULL | Synapse workspace name |
| `sql_endpoint` | VARCHAR(500) | NOT NULL | SQL connection endpoint |
| `connection_status` | connection_status | NOT NULL, DEFAULT 'Disconnected' | Connected/Disconnected/Error |
| `last_sync_at` | TIMESTAMPTZ | NULL | Last successful sync timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

---

### 2. USERS & AUTHENTICATION

#### `users`
System users (linked to Supabase Auth).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Matches auth.users.id from Supabase Auth |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | User email |
| `name` | VARCHAR(255) | NOT NULL | Display name |
| `avatar` | VARCHAR(500) | NULL | Avatar URL |
| `client_id` | UUID | FK → clients(id), NOT NULL | User's organization |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

---

#### `user_roles`
Roles assigned to users (many-to-many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → users(id), NOT NULL | User reference |
| `role` | user_role | NOT NULL | Role enum value |
| `created_at` | TIMESTAMPTZ | NOT NULL | Assignment time |

**Unique Constraint:** (user_id, role) - A user can have each role only once

---

#### `user_practices`
Practices a user has access to (many-to-many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | FK → users(id), PK part | User reference |
| `practice_id` | UUID | FK → practices(id), PK part | Practice reference |
| `created_at` | TIMESTAMPTZ | NOT NULL | Assignment time |

---

### 3. PRACTICES

#### `practices`
Dental practice locations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `client_id` | UUID | FK → clients(id), NOT NULL | Parent client |
| `name` | VARCHAR(255) | NOT NULL | Practice name |
| `location_id` | VARCHAR(100) | NOT NULL | Internal location code |
| `acquisition_date` | DATE | NOT NULL | Date practice was acquired |
| `status` | entity_status | NOT NULL, DEFAULT 'Active' | Active/Inactive |
| `integration_id` | VARCHAR(100) | NOT NULL | External system integration ID |
| `external_system_id` | VARCHAR(100) | NULL | ID in external system |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

---

#### `practice_addresses`
Physical address for each practice.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `practice_id` | UUID | FK → practices(id), UNIQUE | Parent practice |
| `line1` | VARCHAR(255) | NOT NULL | Address line 1 |
| `line2` | VARCHAR(255) | NULL | Address line 2 |
| `city` | VARCHAR(100) | NOT NULL | City |
| `county` | VARCHAR(100) | NULL | County |
| `postcode` | VARCHAR(20) | NOT NULL | Postal code |
| `country` | VARCHAR(100) | NOT NULL, DEFAULT 'United Kingdom' | Country |

---

#### `nhs_contracts`
NHS contracts associated with practices.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `practice_id` | UUID | FK → practices(id), NOT NULL | Parent practice |
| `contract_number` | VARCHAR(100) | NOT NULL | NHS contract number |
| `start_date` | DATE | NOT NULL | Contract start date |
| `end_date` | DATE | NULL | Contract end date (NULL = ongoing) |
| `status` | entity_status | NOT NULL, DEFAULT 'Active' | Active/Inactive |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

---

### 4. CLINICIANS

#### `clinicians`
Healthcare professionals (dentists, hygienists, therapists).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `title` | clinician_title | NOT NULL | Mr/Ms/Mrs/Dr |
| `first_name` | VARCHAR(100) | NOT NULL | First name |
| `last_name` | VARCHAR(100) | NOT NULL | Last name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email address |
| `phone` | VARCHAR(50) | NULL | Phone number |
| `gender` | gender | NOT NULL | Male/Female/Other/Prefer not to say |
| `nationality` | VARCHAR(100) | NOT NULL | Nationality |
| `contractual_status` | contractual_status | NOT NULL | Self Employed/Employed |
| `designation` | designation | NOT NULL | Dentist/Hygienist/Therapist |
| `status` | entity_status | NOT NULL, DEFAULT 'Active' | Active/Inactive |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

---

#### `clinician_addresses`
Physical address for each clinician.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `clinician_id` | UUID | FK → clinicians(id), UNIQUE | Parent clinician |
| `line1` | VARCHAR(255) | NOT NULL | Address line 1 |
| `line2` | VARCHAR(255) | NULL | Address line 2 |
| `city` | VARCHAR(100) | NOT NULL | City |
| `county` | VARCHAR(100) | NULL | County |
| `postcode` | VARCHAR(20) | NOT NULL | Postal code |
| `country` | VARCHAR(100) | NOT NULL | Country |

---

#### `clinician_practices`
Practices where a clinician works (many-to-many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `clinician_id` | UUID | FK → clinicians(id), PK part | Clinician reference |
| `practice_id` | UUID | FK → practices(id), PK part | Practice reference |
| `created_at` | TIMESTAMPTZ | NOT NULL | Assignment time |

---

#### `clinician_other_details`
Sensitive clinician information (banking, tax, emergency contact).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `clinician_id` | UUID | FK → clinicians(id), UNIQUE | Parent clinician |
| `national_insurance_number` | VARCHAR(20) | NULL | NI number |
| `bank_sort_code` | VARCHAR(10) | NULL | Bank sort code |
| `bank_account_number` | VARCHAR(20) | NULL | Bank account number |
| `bank_account_name` | VARCHAR(255) | NULL | Name on bank account |
| `tax_reference` | VARCHAR(50) | NULL | Tax reference number |
| `emergency_contact_name` | VARCHAR(255) | NULL | Emergency contact name |
| `emergency_contact_phone` | VARCHAR(50) | NULL | Emergency contact phone |
| `emergency_contact_relationship` | VARCHAR(100) | NULL | Relationship |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

**⚠️ Security Note:** This table contains PII. Access is restricted via RLS policies.

---

#### `clinician_contracts`
Employment contract details for clinicians.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `clinician_id` | UUID | FK → clinicians(id), NOT NULL | Parent clinician |
| `start_date` | DATE | NOT NULL | Contract start date |
| `end_date` | DATE | NULL | Contract end date |
| `primary_practice_id` | UUID | FK → practices(id), NOT NULL | Primary work location |
| `hours_per_week` | DECIMAL(5,2) | NOT NULL, CHECK > 0 | Weekly hours |
| `notice_period` | VARCHAR(100) | NULL | Notice period |
| `holiday_entitlement` | INTEGER | NULL | Holiday days per year |
| `pension_scheme` | BOOLEAN | NOT NULL, DEFAULT FALSE | Enrolled in pension |
| `additional_terms` | TEXT | NULL | Additional contract terms |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

---

#### `contract_working_days`
Working days for each contract.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `contract_id` | UUID | FK → clinician_contracts(id), PK part | Contract reference |
| `day` | day_of_week | PK part | Mon/Tue/Wed/Thu/Fri/Sat/Sun |

---

#### `contract_secondary_practices`
Secondary practice locations in a contract.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `contract_id` | UUID | FK → clinician_contracts(id), PK part | Contract reference |
| `practice_id` | UUID | FK → practices(id), PK part | Practice reference |

---

### 5. RATES

#### `income_rates`
Income rate definitions for clinicians.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `clinician_id` | UUID | FK → clinicians(id), NOT NULL | Clinician reference |
| `practice_id` | UUID | FK → practices(id), NOT NULL | Practice reference |
| `income_type` | income_type | NOT NULL | NHS/Private/Plan |
| `effective_from` | DATE | NOT NULL | Rate effective from |
| `effective_to` | DATE | NULL | Rate effective until (NULL = ongoing) |
| `nhs_contract_id` | UUID | FK → nhs_contracts(id), NULL | NHS contract reference |
| `payment_type` | payment_type | NOT NULL | Banded/Fixed/Percentage |
| `from_unit_type` | unit_type | NOT NULL | UDA/Split/Session/Hour |
| `from_number_of_units` | DECIMAL(10,2) | NULL | Number of units |
| `to_unit_type` | VARCHAR(50) | NULL | Target unit type |
| `rate` | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Rate amount |
| `status` | entity_status | NOT NULL, DEFAULT 'Active' | Active/Inactive |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

---

#### `deduction_rates`
Deduction rate definitions (labs, materials, commissions).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `clinician_id` | UUID | FK → clinicians(id), NOT NULL | Clinician reference |
| `practice_id` | UUID | FK → practices(id), NOT NULL | Practice reference |
| `deduction_type` | deduction_type | NOT NULL | Lab/Material/Commission/Other |
| `income_type` | income_type | NOT NULL | NHS/Private/Plan |
| `effective_from` | DATE | NOT NULL | Rate effective from |
| `effective_to` | DATE | NULL | Rate effective until |
| `payment_type` | payment_type | NOT NULL | Banded/Fixed/Percentage |
| `from_unit_type` | unit_type | NOT NULL | UDA/Split/Session/Hour |
| `from_number_of_units` | DECIMAL(10,2) | NULL | Number of units |
| `rate` | DECIMAL(10,2) | NOT NULL, CHECK >= 0 | Rate amount |
| `status` | entity_status | NOT NULL, DEFAULT 'Active' | Active/Inactive |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

---

#### `gl_codes`
General Ledger codes for financial categorization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `category` | gl_category | NOT NULL | NHS/Private/Plan/NHS Labs/Private Labs/Deductions/Other |
| `code` | VARCHAR(50) | NOT NULL, UNIQUE | GL code (e.g., "4000") |
| `description` | TEXT | NULL | Code description |
| `status` | approval_status | NOT NULL, DEFAULT 'Pending' | Draft/Pending/Approved/Rejected |
| `effective_date` | DATE | NOT NULL | When code becomes effective |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

---

### 6. ADJUSTMENTS

All adjustment tables follow a similar pattern with these common columns:
- `id` (UUID, PK)
- `practice_id` (UUID, FK → practices)
- `pay_period` (VARCHAR(20)) - Format: "YYYY-MM" (e.g., "2025-01")
- `amount` (DECIMAL(10,2))
- `status` (approval_status) - Draft/Pending/Approved/Rejected
- `notes` (TEXT, NULL)
- `created_by` (UUID, FK → users)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `cross_charges`
Cross charges between clinicians for transferred work.

| Additional Column | Type | Description |
|-------------------|------|-------------|
| `type` | cross_charge_type | Private/NHS |
| `contract_id` | UUID, NULL | NHS contract reference |
| `plan_provider` | VARCHAR(255), NULL | Plan provider name |
| `from_clinician_id` | UUID | Source clinician |
| `from_unit_type` | unit_type | UDA/Split |
| `from_number_of_units` | DECIMAL(10,2) | Number of units |
| `to_clinician_id` | UUID | Target clinician |
| `to_unit_type` | VARCHAR(50) | Target unit type |
| `treatment_end_period` | VARCHAR(20), NULL | Treatment end period |

---

#### `lab_adjustments`
Laboratory cost adjustments.

| Additional Column | Type | Description |
|-------------------|------|-------------|
| `clinician_id` | UUID | Clinician reference |
| `lab_name` | VARCHAR(255) | Laboratory name |
| `lab_invoice_number` | VARCHAR(100) | Invoice number |
| `lab_cost` | DECIMAL(10,2) | Lab cost amount |
| `treatment_end_period` | VARCHAR(20), NULL | Treatment end period |

---

#### `income_adjustments`
Income adjustments (bonuses, corrections, refunds).

| Additional Column | Type | Description |
|-------------------|------|-------------|
| `clinician_id` | UUID | Clinician reference |
| `adjustment_type` | income_adjustment_type | Bonus/Correction/Refund/Other |
| `reason` | TEXT | Reason for adjustment |

---

#### `miscellaneous_adjustments`
Miscellaneous financial adjustments.

| Additional Column | Type | Description |
|-------------------|------|-------------|
| `clinician_id` | UUID | Clinician reference |
| `category` | VARCHAR(100) | Adjustment category |
| `description` | TEXT | Description |

---

#### `session_adjustments`
Session-based adjustments.

| Additional Column | Type | Description |
|-------------------|------|-------------|
| `clinician_id` | UUID | Clinician reference |
| `session_date` | DATE | Date of session |
| `adjustment_type` | session_adjustment_type | Cancelled/Extra/Modified |

---

#### `bad_debts`
Bad debt write-offs.

| Additional Column | Type | Description |
|-------------------|------|-------------|
| `clinician_id` | UUID | Clinician reference |
| `original_invoice_id` | VARCHAR(100) | Original invoice ID |
| `debt_amount` | DECIMAL(10,2) | Debt amount |
| `write_off_date` | DATE, NULL | Write-off date |

---

### 7. PAYSHEETS

#### `paysheets`
Main paysheet records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `practice_id` | UUID | FK → practices(id), NOT NULL | Practice reference |
| `practice_name` | VARCHAR(255) | NOT NULL | Denormalized practice name |
| `clinician_id` | UUID | FK → clinicians(id), NOT NULL | Clinician reference |
| `clinician_name` | VARCHAR(255) | NOT NULL | Denormalized clinician name |
| `pay_period` | VARCHAR(20) | NOT NULL | Pay period (YYYY-MM) |
| `net_pay` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Net payable amount |
| `status` | paysheet_status | NOT NULL, DEFAULT 'Draft' | Workflow status |
| `last_modified_by` | UUID | FK → users(id), NOT NULL | Last modifier |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

**Unique Constraint:** (practice_id, clinician_id, pay_period)

**Paysheet Status Flow:**
```
Draft → Pending → ApprovedByPractice → ApprovedByClinician → Confirmed → PushedToXero
                         ↓                    ↓
                      Rejected             Rejected
```

---

#### `paysheet_sections`
Sections within a paysheet.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `paysheet_id` | UUID | FK → paysheets(id), NOT NULL | Parent paysheet |
| `type` | paysheet_section_type | NOT NULL | NHS/Private/Plan/Deductions/Adjustments |
| `subtotal` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Section subtotal |
| `section_order` | INTEGER | NOT NULL | Display order |

---

#### `paysheet_line_items`
Individual line items within sections.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `paysheet_section_id` | UUID | FK → paysheet_sections(id), NOT NULL | Parent section |
| `description` | VARCHAR(500) | NOT NULL | Line item description |
| `reference` | VARCHAR(100) | NULL | Reference code |
| `details` | TEXT | NULL | Additional details |
| `type` | VARCHAR(100) | NOT NULL | Item type |
| `unit` | VARCHAR(50) | NOT NULL | Unit of measurement |
| `rate` | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | Rate |
| `amount` | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | Calculated amount |
| `is_subtotal` | BOOLEAN | NOT NULL, DEFAULT FALSE | Is subtotal row |
| `line_order` | INTEGER | NOT NULL | Display order |

---

#### `paysheet_approval_history`
Audit trail for paysheet approvals.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `paysheet_id` | UUID | FK → paysheets(id), NOT NULL | Paysheet reference |
| `action` | approval_action | NOT NULL | Created/Submitted/Approved/Rejected/Confirmed/PushedToXero |
| `performed_by` | UUID | FK → users(id), NOT NULL | User who performed action |
| `performed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Action timestamp |
| `comment` | TEXT | NULL | Optional comment |

---

### 8. SYSTEM TABLES

#### `compass_dates`
Pay period schedule and deadlines.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `month` | VARCHAR(7) | NOT NULL, UNIQUE | Pay period (YYYY-MM) |
| `schedule_period` | VARCHAR(50) | NOT NULL | Display name (e.g., "January 2025") |
| `adjustment_deadline` | DATE | NOT NULL | Deadline for adjustments |
| `processing_cutoff` | DATE | NOT NULL | Processing cutoff date |
| `pay_statements_available` | DATE | NOT NULL | When statements are available |
| `pay_date` | DATE | NOT NULL | Payment date |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update time |

**Check Constraint:** adjustment_deadline < processing_cutoff < pay_statements_available <= pay_date

---

#### `sync_jobs`
Azure Synapse synchronization job history.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `client_id` | UUID | FK → clients(id), NOT NULL | Client reference |
| `endpoint` | VARCHAR(255) | NOT NULL | Sync endpoint |
| `status` | sync_job_status | NOT NULL, DEFAULT 'Pending' | Pending/Running/Success/Failed |
| `started_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Job start time |
| `completed_at` | TIMESTAMPTZ | NULL | Job completion time |
| `records_processed` | INTEGER | NOT NULL, DEFAULT 0 | Records processed count |
| `duration` | INTEGER | NULL | Duration in seconds |
| `error_message` | TEXT | NULL | Error message if failed |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |

---

#### `notifications`
User notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → users(id), NOT NULL | Target user |
| `type` | notification_type | NOT NULL | Info/Warning/Error/Success |
| `title` | VARCHAR(255) | NOT NULL | Notification title |
| `message` | TEXT | NOT NULL | Notification message |
| `read` | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status |
| `link` | VARCHAR(500) | NULL | Optional link URL |
| `created_at` | TIMESTAMPTZ | NOT NULL | Notification time |

---

#### `recent_activities`
System-wide activity log for dashboard.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `type` | recent_activity_type | NOT NULL | PaysheetSubmitted/PaysheetApproved/SyncCompleted/ClinicianAdded |
| `description` | TEXT | NOT NULL | Activity description |
| `timestamp` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Activity time |
| `actor_name` | VARCHAR(255) | NOT NULL | Who performed the action |
| `practice_id` | UUID | FK → practices(id), NULL | Related practice |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation time |

---

#### `roles` & `permissions` & `role_permissions`
Optional RBAC tables for future use.

---

## Enum Types Reference

All enums are defined in the `"denpay-dev"` schema.

### User & Status Enums

```sql
-- User roles in the system
CREATE TYPE user_role AS ENUM (
  'SuperAdmin',      -- Full system access across all clients
  'ClientAdmin',     -- Administrative access within a client
  'PracticeManager', -- Manage practices and staff
  'ManagerReadonly', -- Read-only manager access
  'HR',              -- Human resources access
  'Operation',       -- Operational data entry
  'Finance',         -- Financial data and payroll
  'DenpayAdmin',     -- DenPay module administration
  'Clinician'        -- Clinician self-service access
);

-- Generic entity status
CREATE TYPE entity_status AS ENUM ('Active', 'Inactive');

-- Azure Synapse connection status
CREATE TYPE connection_status AS ENUM ('Connected', 'Disconnected', 'Error');

-- Approval workflow status
CREATE TYPE approval_status AS ENUM ('Draft', 'Pending', 'Approved', 'Rejected');
```

### Clinician Enums

```sql
CREATE TYPE clinician_title AS ENUM ('Mr', 'Ms', 'Mrs', 'Dr');

CREATE TYPE gender AS ENUM ('Male', 'Female', 'Other', 'Prefer not to say');

CREATE TYPE contractual_status AS ENUM ('Self Employed', 'Employed');

CREATE TYPE designation AS ENUM ('Dentist', 'Hygienist', 'Therapist');

CREATE TYPE day_of_week AS ENUM ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');
```

### Rate & Financial Enums

```sql
CREATE TYPE income_type AS ENUM ('NHS', 'Private', 'Plan');

CREATE TYPE payment_type AS ENUM ('Banded', 'Fixed', 'Percentage');

CREATE TYPE unit_type AS ENUM ('UDA', 'Split', 'Session', 'Hour');

CREATE TYPE deduction_type AS ENUM ('Lab', 'Material', 'Commission', 'Other');

CREATE TYPE gl_category AS ENUM (
  'NHS', 'Private', 'Plan', 'NHS Labs', 'Private Labs', 'Deductions', 'Other'
);

CREATE TYPE cross_charge_type AS ENUM ('Private', 'NHS');

CREATE TYPE income_adjustment_type AS ENUM ('Bonus', 'Correction', 'Refund', 'Other');

CREATE TYPE session_adjustment_type AS ENUM ('Cancelled', 'Extra', 'Modified');
```

### Paysheet Enums

```sql
CREATE TYPE paysheet_status AS ENUM (
  'Draft',
  'Pending',
  'ApprovedByPractice',
  'ApprovedByClinician',
  'Rejected',
  'Confirmed',
  'PushedToXero'
);

CREATE TYPE paysheet_section_type AS ENUM (
  'NHS', 'Private', 'Plan', 'Deductions', 'Adjustments'
);

CREATE TYPE approval_action AS ENUM (
  'Created', 'Submitted', 'Approved', 'Rejected', 'Confirmed', 'PushedToXero'
);
```

### System Enums

```sql
CREATE TYPE sync_job_status AS ENUM ('Pending', 'Running', 'Success', 'Failed');

CREATE TYPE notification_type AS ENUM ('Info', 'Warning', 'Error', 'Success');

CREATE TYPE recent_activity_type AS ENUM (
  'PaysheetSubmitted', 'PaysheetApproved', 'SyncCompleted', 'ClinicianAdded'
);
```

---

## Relationships & Foreign Keys

### Key Relationships

```
clients ─┬─< users (client_id)
         ├─< practices (client_id)
         ├── client_addresses (1:1)
         ├── synapse_configs (1:1)
         └─< sync_jobs (client_id)

practices ─┬── practice_addresses (1:1)
           ├─< nhs_contracts (practice_id)
           ├─< clinician_practices (many-to-many with clinicians)
           ├─< income_rates (practice_id)
           ├─< deduction_rates (practice_id)
           ├─< [all adjustment tables] (practice_id)
           └─< paysheets (practice_id)

clinicians ─┬── clinician_addresses (1:1)
            ├── clinician_other_details (1:1)
            ├─< clinician_contracts
            ├─< clinician_practices (many-to-many with practices)
            ├─< income_rates (clinician_id)
            ├─< deduction_rates (clinician_id)
            ├─< [all adjustment tables] (clinician_id)
            └─< paysheets (clinician_id)

users ─┬─< user_roles (user_id)
       ├─< user_practices (many-to-many with practices)
       ├─< notifications (user_id)
       └─< [all tables with created_by/last_modified_by]

paysheets ─┬─< paysheet_sections
           └─< paysheet_approval_history

paysheet_sections ─< paysheet_line_items
```

---

## Row Level Security (RLS)

RLS is enabled on all tables to enforce multi-tenant data isolation.

### Key Security Principles

1. **Client Isolation**: Users can only see data belonging to their client
2. **Practice Scoping**: Users may be limited to specific practices
3. **Role-Based Access**: Different permissions based on user roles
4. **Self-Service**: Clinicians can view their own data

### RLS Helper Functions (in `denpay-dev` schema)

```sql
-- Get current user's client_id
"denpay-dev".user_client_id() RETURNS UUID

-- Check if user has a specific role
"denpay-dev".has_role(role_name user_role) RETURNS BOOLEAN

-- Check if user is SuperAdmin
"denpay-dev".is_super_admin() RETURNS BOOLEAN

-- Get user's practice IDs
"denpay-dev".user_practice_ids() RETURNS SETOF UUID

-- Check if user has access to a specific practice
"denpay-dev".has_practice_access(practice_id_param UUID) RETURNS BOOLEAN
```

### Example Policy

```sql
-- Users can only view practices in their client
CREATE POLICY "Users can view practices in their client"
  ON practices FOR SELECT
  USING (
    "denpay-dev".is_super_admin() OR
    client_id = "denpay-dev".user_client_id()
  );
```

---

## Helper Functions

### Triggers (Auto-fire)

| Function | Trigger | Description |
|----------|---------|-------------|
| `trigger_set_updated_at()` | `set_updated_at` | Auto-updates `updated_at` on all table modifications |
| `trigger_update_paysheet_net_pay()` | On paysheet_sections | Recalculates paysheet net_pay when sections change |
| `trigger_update_section_subtotal()` | On paysheet_line_items | Recalculates section subtotal when line items change |
| `trigger_log_paysheet_approval()` | On paysheets | Logs status changes to approval_history |
| `trigger_log_paysheet_activity()` | On paysheets | Logs important activities |
| `trigger_log_clinician_activity()` | On clinicians | Logs new clinician additions |
| `trigger_calculate_sync_duration()` | On sync_jobs | Calculates job duration |

### Utility Functions

```sql
-- Calculate paysheet net pay from sections
"denpay-dev".calculate_paysheet_net_pay(paysheet_id UUID) RETURNS DECIMAL

-- Calculate section subtotal from line items
"denpay-dev".calculate_section_subtotal(section_id UUID) RETURNS DECIMAL

-- Get active rate for a clinician
"denpay-dev".get_active_income_rate(
  clinician_id UUID,
  practice_id UUID,
  income_type income_type,
  effective_date DATE DEFAULT CURRENT_DATE
) RETURNS income_rates

-- Get clinician's full name
"denpay-dev".get_clinician_full_name(clinician_id UUID) RETURNS TEXT

-- Get practice name
"denpay-dev".get_practice_name(practice_id UUID) RETURNS TEXT

-- Log recent activity
"denpay-dev".log_recent_activity(
  activity_type recent_activity_type,
  activity_description TEXT,
  actor_name VARCHAR(255),
  practice_id UUID DEFAULT NULL
)

-- Create notification
"denpay-dev".create_notification(
  user_id UUID,
  type notification_type,
  title VARCHAR(255),
  message TEXT,
  link VARCHAR(500) DEFAULT NULL
) RETURNS UUID

-- Mark all notifications as read
"denpay-dev".mark_all_notifications_read(user_id UUID)
```

---

## Database Views

Pre-built views for common queries:

| View | Description |
|------|-------------|
| `v_clinicians_full` | Clinicians with addresses and practice count |
| `v_practices_full` | Practices with addresses, client info, and counts |
| `v_paysheet_summary` | Paysheets with section breakdowns |
| `v_paysheet_status_distribution` | Paysheet counts by status with percentages |
| `v_net_payable_by_practice` | Net payable amounts grouped by practice |
| `v_net_payable_by_clinician` | Net payable amounts grouped by clinician |
| `v_adjustments_summary` | All adjustment types in one view |
| `v_adjustments_by_type_status` | Adjustment counts by type and status |
| `v_active_income_rates` | Currently active income rates |
| `v_users_with_roles` | Users with their roles aggregated |
| `v_recent_sync_jobs` | Latest 50 sync jobs |
| `v_monthly_income_breakdown` | Monthly income by practice and type |
| `v_practice_revenue_ranking` | Practice revenue with rankings |

---

## Integration Guide

### For Client Onboarding UI

#### 1. Create a New Client

```typescript
// Using Supabase JS Client
const { data: client, error } = await supabase
  .from('clients')
  .insert({
    legal_trading_name: 'New Dental Group Ltd',
    workfin_reference: 'WF-NEW-001',
    contact_email: 'admin@newdental.com',
    contact_phone: '+44 20 9999 8888',
    status: 'Active'
  })
  .select()
  .single();

// Add client address
if (client) {
  await supabase
    .from('client_addresses')
    .insert({
      client_id: client.id,
      line1: '100 High Street',
      city: 'London',
      postcode: 'EC1A 1AA',
      country: 'United Kingdom'
    });
}
```

#### 2. Create First Admin User for Client

```typescript
// First, create user in Supabase Auth
const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  email: 'admin@newdental.com',
  password: 'temp-password',
  email_confirm: true
});

// Then create user record linked to client
if (authUser) {
  await supabase
    .from('users')
    .insert({
      id: authUser.user.id,  // IMPORTANT: Use the auth user's ID
      email: 'admin@newdental.com',
      name: 'Admin User',
      client_id: client.id
    });

  // Assign ClientAdmin role
  await supabase
    .from('user_roles')
    .insert({
      user_id: authUser.user.id,
      role: 'ClientAdmin'
    });
}
```

#### 3. Create a Practice

```typescript
const { data: practice, error } = await supabase
  .from('practices')
  .insert({
    client_id: client.id,
    name: 'Main Street Dental',
    location_id: 'LOC-001',
    acquisition_date: '2025-01-01',
    status: 'Active',
    integration_id: 'INT-001'
  })
  .select()
  .single();

// Add practice address
if (practice) {
  await supabase
    .from('practice_addresses')
    .insert({
      practice_id: practice.id,
      line1: '50 Main Street',
      city: 'Manchester',
      postcode: 'M1 1AA',
      country: 'United Kingdom'
    });
}
```

#### 4. Onboard a Clinician

```typescript
// Create clinician
const { data: clinician, error } = await supabase
  .from('clinicians')
  .insert({
    title: 'Dr',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@email.com',
    gender: 'Male',
    nationality: 'British',
    contractual_status: 'Self Employed',
    designation: 'Dentist',
    status: 'Active'
  })
  .select()
  .single();

// Link to practice
if (clinician) {
  await supabase
    .from('clinician_practices')
    .insert({
      clinician_id: clinician.id,
      practice_id: practice.id
    });
}
```

---

## Common Queries

### Get All Clients with Address

```sql
SELECT
  c.*,
  ca.line1, ca.city, ca.postcode
FROM clients c
LEFT JOIN client_addresses ca ON ca.client_id = c.id
WHERE c.status = 'Active';
```

### Get Practices for a Client

```sql
SELECT
  p.*,
  pa.line1, pa.city, pa.postcode,
  (SELECT COUNT(*) FROM clinician_practices WHERE practice_id = p.id) as clinician_count
FROM practices p
LEFT JOIN practice_addresses pa ON pa.practice_id = p.id
WHERE p.client_id = 'your-client-uuid'
  AND p.status = 'Active';
```

### Get Clinicians with Practice Info

```sql
SELECT
  c.*,
  array_agg(p.name) as practice_names
FROM clinicians c
JOIN clinician_practices cp ON cp.clinician_id = c.id
JOIN practices p ON p.id = cp.practice_id
WHERE p.client_id = 'your-client-uuid'
GROUP BY c.id;
```

### Get User with Roles and Practices

```sql
SELECT
  u.*,
  array_agg(DISTINCT ur.role) as roles,
  array_agg(DISTINCT p.name) as practice_names
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN user_practices up ON up.user_id = u.id
LEFT JOIN practices p ON p.id = up.practice_id
WHERE u.id = 'your-user-uuid'
GROUP BY u.id;
```

---

## Important Notes for Integration

1. **Always specify schema** when creating Supabase client:
   ```typescript
   const supabase = createClient(url, key, { db: { schema: 'denpay-dev' } })
   ```

2. **User IDs must match** Supabase Auth user IDs for RLS to work correctly

3. **Enum values are case-sensitive** - use exact values as defined

4. **Foreign key constraints** will prevent orphaned records - always create parent records first

5. **Triggers handle auto-updates** - no need to manually update `updated_at` or calculate totals

6. **Views are read-only** - use base tables for inserts/updates

---

## Support

For questions about this database schema, refer to:
- [supabase/migrations/](./supabase/migrations/) - All migration files
- [supabase/README.md](./supabase/README.md) - Setup instructions
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Integration guide

---

**Version:** 1.0
**Last Updated:** January 2025
**Schema:** denpay-dev
