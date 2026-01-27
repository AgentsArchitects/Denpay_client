What is PMS Integration & Why is it Needed?
PMS = Practice Management System - The software dental practices use to manage their day-to-day operations.

┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHY PMS INTEGRATION IS CRITICAL                         │
└─────────────────────────────────────────────────────────────────────────────┘

Dental Practice uses PMS (SOE/Dentally/SFD/CareStack) for:
├── Patient records
├── Appointments & scheduling
├── Treatment plans & clinical notes
├── Billing & invoices
├── Clinician schedules & performance
└── NHS contracts & UDA tracking

WorkFin needs this data to:
├── Calculate clinician pay (based on treatments performed)
├── Generate paysheets (who worked when, what they earned)
├── Track practice performance (KPIs, utilization)
├── Reconcile with Xero (invoices, payments)
└── Generate financial reports & dashboards



What Should Be on the PMS Integration UI?
Current State (Your Screenshot)

Shows 4 PMS types: SOE, DENTALLY, SFD, CARESTACK
Each has "No data found" and "+ Add More" button
This is just a placeholder - needs real functionality

Recommended UI Design
When user clicks "+ Add More" under SOE, show a modal/form:
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Add SOE Practice Connection                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Practice Name *          [Dropdown: Select from client's practices]        │
│                                                                             │
│  SOE Practice ID *        [________________] (From SOE system)              │
│                                                                             │
│  SOE Site Code            [________________] (Optional)                     │
│                                                                             │
│  Data Source *            [● Gold Layer (Azure Blob)]                       │
│                           [○ Direct API (Coming Soon)]                      │
│                                                                             │
│  Sync Frequency *         [Dropdown: Daily / Weekly / Manual]               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Data to Sync:                                                       │   │
│  │  ☑ Patients          ☑ Appointments       ☑ Providers               │   │
│  │  ☑ Treatments        ☑ Billing            ☑ Schedules               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Test Connection]                      [Cancel]  [Save & Connect]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
After Connection is Saved, Show:
┌─────────────────────────────────────────────────────────────────────────────┐
│  SOE                                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🏥 Main Street Dental                                              │   │
│  │  SOE Practice ID: ESK-12345                                         │   │
│  │  Status: ✅ Connected                                               │   │
│  │  Last Sync: 24 Jan 2026, 10:30 AM                                   │   │
│  │  Records: 1,234 patients | 5,678 appointments                       │   │
│  │                                                                     │   │
│  │  [Sync Now]  [View Data]  [Edit]  [Disconnect]                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🏥 City Center Dental                                              │   │
│  │  SOE Practice ID: ESK-67890                                         │   │
│  │  Status: ⚠️ Sync Error                                              │   │
│  │  Last Sync: 23 Jan 2026, 2:15 PM (Failed)                          │   │
│  │  Error: Connection timeout                                          │   │
│  │                                                                     │   │
│  │  [Retry Sync]  [View Logs]  [Edit]  [Disconnect]                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [+ Add Another SOE Practice]                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Backend Architecture
Database Tables Needed
-- 1. PMS Connections (already exists as client_pms_integrations, but needs enhancement)
CREATE TABLE "denpay-dev".pms_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES "denpay-dev".clients(id),
    practice_id UUID NOT NULL REFERENCES "denpay-dev".practices(id),
    pms_type VARCHAR(50) NOT NULL, -- 'SOE', 'DENTALLY', 'SFD', 'CARESTACK'
    external_practice_id VARCHAR(100) NOT NULL, -- ID in the PMS system
    external_site_code VARCHAR(100),
    connection_status VARCHAR(50) DEFAULT 'Pending', -- 'Connected', 'Error', 'Disconnected'
    sync_frequency VARCHAR(50) DEFAULT 'Daily',
    data_source VARCHAR(50) DEFAULT 'GOLD_LAYER', -- 'GOLD_LAYER', 'DIRECT_API'
    sync_config JSONB, -- What data to sync
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(50),
    last_sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PMS Sync History
CREATE TABLE "denpay-dev".pms_sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES "denpay-dev".pms_connections(id),
    sync_type VARCHAR(50) NOT NULL, -- 'FULL', 'INCREMENTAL', 'MANUAL'
    status VARCHAR(50) NOT NULL, -- 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 3. SOE Schema for Synced Data
CREATE SCHEMA IF NOT EXISTS soe;

-- SOE Patients (synced from Gold Layer)
CREATE TABLE soe.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES "denpay-dev".pms_connections(id),
    external_patient_id VARCHAR(100) NOT NULL,
    title VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB,
    registration_date DATE,
    status VARCHAR(50),
    raw_data JSONB, -- Store original data for reference
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, external_patient_id)
);

-- SOE Appointments (synced from Gold Layer)
CREATE TABLE soe.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES "denpay-dev".pms_connections(id),
    external_appointment_id VARCHAR(100) NOT NULL,
    patient_id UUID REFERENCES soe.patients(id),
    external_patient_id VARCHAR(100),
    provider_id VARCHAR(100),
    provider_name VARCHAR(255),
    appointment_date DATE,
    appointment_time TIME,
    duration_minutes INTEGER,
    status VARCHAR(50), -- 'Booked', 'Completed', 'Cancelled', 'FTA'
    treatment_type VARCHAR(255),
    is_nhs BOOLEAN,
    fee_charged NUMERIC(10,2),
    raw_data JSONB,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, external_appointment_id)
);

-- SOE Providers/Clinicians (synced from Gold Layer)
CREATE TABLE soe.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES "denpay-dev".pms_connections(id),
    external_provider_id VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(100), -- 'Dentist', 'Hygienist', 'Therapist'
    gdc_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    raw_data JSONB,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, external_provider_id)
);

API Endpoints Needed

# PMS Connection Management
POST   /api/pms/connections/                    # Create new connection
GET    /api/pms/connections/                    # List all connections
GET    /api/pms/connections/{id}                # Get connection details
PUT    /api/pms/connections/{id}                # Update connection
DELETE /api/pms/connections/{id}                # Delete connection

# Client-specific PMS
GET    /api/clients/{id}/pms/connections/       # Get client's PMS connections
POST   /api/clients/{id}/pms/connections/       # Add PMS to client

# Sync Operations
POST   /api/pms/connections/{id}/sync/          # Trigger sync
GET    /api/pms/connections/{id}/sync/status/   # Get sync status
GET    /api/pms/connections/{id}/sync/history/  # Get sync history

# Test Connection
POST   /api/pms/connections/test/               # Test connection before saving

# SOE Specific Data (after sync)
GET    /api/pms/{connection_id}/patients/       # Get synced patients
GET    /api/pms/{connection_id}/appointments/   # Get synced appointments
GET    /api/pms/{connection_id}/providers/      # Get synced providers
```

---

## Data Flow: How Sync Works
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PMS DATA SYNC FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: Client Onboarding
─────────────────────────
User creates client → Adds practices → Configures PMS connection
                                              │
                                              ▼
Step 2: PMS Connection Setup
─────────────────────────────
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Select Practice │ ──▶ │ Enter SOE ID    │ ──▶ │ Test Connection │
│ "Main St Dental"│     │ "ESK-12345"     │     │ ✅ Success      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
Step 3: Initial Sync (Triggered on Save)
─────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────┐
│  Azure Blob Storage (Gold Layer)                                        │
│  a4de6dd-esk/gold/soe/                                                  │
│  ├── vw_DimPatients/*.parquet      ──┐                                  │
│  ├── vw_Appointments/*.parquet       │                                  │
│  ├── vw_providertimes_final/*.parquet│                                  │
│  └── ...                             │                                  │
└──────────────────────────────────────│──────────────────────────────────┘
                                       │
                                       ▼ Filter by Practice ID (ESK-12345)
┌─────────────────────────────────────────────────────────────────────────┐
│  WorkFin Backend (Sync Service)                                         │
│  ├── Read Parquet files                                                 │
│  ├── Filter by external_practice_id                                     │
│  ├── Transform data to WorkFin schema                                   │
│  ├── Upsert into PostgreSQL                                             │
│  └── Log sync results                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL (workfin_uat_db)                                            │
│  soe schema:                                                            │
│  ├── soe.patients (filtered for this practice)                          │
│  ├── soe.appointments (filtered for this practice)                      │
│  └── soe.providers (filtered for this practice)                         │
└─────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
Step 4: Data Usage in WorkFin
──────────────────────────────
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ DenPay Module   │  │ Paysheet Gen    │  │ Dashboard/KPIs  │
│ ─────────────── │  │ ─────────────── │  │ ─────────────── │
│ • Link SOE      │  │ • Appointments  │  │ • Patient count │
│   provider to   │  │   worked by     │  │ • Appointment   │
│   WF clinician  │  │   clinician     │  │   metrics       │
│ • Map treatments│  │ • Calculate pay │  │ • Revenue       │
│   to pay rates  │  │   based on work │  │ • FTA rates     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Complete Client Onboarding Flow

Here's how all 10 tabs connect:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLIENT ONBOARDING - 10 TABS                             │
└─────────────────────────────────────────────────────────────────────────────┘

Tab 1: Client Information
─────────────────────────
- Legal name, trading name
- Registration number, VAT
- Logo upload
- Status (Active/Inactive)
        │
        ▼
Tab 2: Contact Information
──────────────────────────
- Primary contact person
- Email, phone
- Addresses (registered, trading, correspondence)
        │
        ▼
Tab 3: License Information
──────────────────────────
- WorkFin user licenses (how many users can log in)
- Compass connections (payroll module access)
- Finance system connections (Xero slots)
- PMS connections (how many practices can connect)
        │
        ▼
Tab 4: Accountant Details
─────────────────────────
- External accountant info
- Name, address, contact
        │
        ▼
Tab 5: IT Provider Details
──────────────────────────
- IT support company info
- Contact for technical issues
        │
        ▼
Tab 6: Adjustment Types
───────────────────────
- Payroll adjustment categories
- Mentoring fee, retainer fee, locum days
- These are used in paysheet calculations
        │
        ▼
Tab 7: PMS Integration Details ◀── YOU ARE HERE
──────────────────────────────
- Connect SOE/Dentally/SFD/CareStack
- Map PMS practice to WorkFin practice
- Configure sync settings
- This pulls: patients, appointments, providers, billing
        │
        ▼
Tab 8: DenPay Period
────────────────────
- Payroll period configuration
- Start/end dates for pay cycles
- Pay frequency (weekly, fortnightly, monthly)
        │
        ▼
Tab 9: FY End
─────────────
- Financial year end date
- Used for reporting and tax calculations
        │
        ▼
Tab 10: Feature Access
──────────────────────
- Enable/disable features per client
- Clinician Pay module
- PowerBI reports
- Other feature flags