# WorkFin Client Onboarding Module - Comprehensive Gap Analysis

**Date:** January 24, 2026
**Project:** WorkFin Dental Practice Management & Payroll System
**Database:** Azure PostgreSQL (workfin_uat_db)
**Backend:** FastAPI (Python) - D:\Workfin_backend
**Frontend:** React + TypeScript (Vite) - D:\WORKFIN_CLIENT_UI

---

## Executive Summary

The WorkFin client onboarding module is **approximately 60% complete** for MVP functionality. The core client creation workflow with 10 tabs is implemented and working. However, critical gaps exist in clinician management, practice-to-clinician linking, and several backend integrations need to be migrated from mock data to database persistence.

**Current State:**
- ✅ Client CRUD with complex 10-tab onboarding form
- ✅ Xero integration (OAuth + comprehensive sync)
- ✅ Azure Blob Storage integration for SOE data
- ✅ Basic user management
- ⚠️ Mock implementations for Users, Compass, CoA (not database-backed)
- ❌ Missing clinician management pages
- ❌ Missing PMS integration setup flow
- ❌ Incomplete practice-to-clinician relationships

---

## A. Backend Analysis

### Existing API Endpoints

| Module | Endpoint | Methods | Status | Backend |
|--------|----------|---------|--------|---------|
| **Auth** | `/auth/login/`, `/auth/logout/` | POST | 🟡 Mock | In-memory |
| **Clients** | `/clients/` | GET, POST, PUT, DELETE | ✅ Complete | PostgreSQL |
| **Client Users** | `/clients/{id}/users/` | GET, POST | ✅ Complete | PostgreSQL |
| **Users** | `/users/` | GET, POST, PUT, DELETE | 🟡 Mock | In-memory |
| **Compass** | `/compass/dates/` | GET, POST, PUT, DELETE | 🟡 Mock | In-memory |
| **CoA** | `/coa/categories/` | GET, POST, PUT, DELETE | 🟡 Mock | In-memory |
| **Xero Auth** | `/xero/authorize/`, `/xero/callback/` | GET | ✅ Complete | PostgreSQL |
| **Xero Sync** | `/xero/sync/all/`, `/xero/sync/quick/` | POST | ✅ Complete | PostgreSQL |
| **Xero Data** | `/xero/data/accounts/`, etc. (10+ endpoints) | GET | ✅ Complete | PostgreSQL |
| **SOE** | `/soe/tables/`, `/soe/data/{table}/` | GET | ✅ Complete | Azure Blob |

### Missing Backend Endpoints

#### Critical (Must Have for MVP)

1. **Practice Management**
   - `POST /clients/{id}/practices/` - Create practice
   - `GET /clients/{id}/practices/` - List practices
   - `PUT /practices/{id}/` - Update practice
   - `DELETE /practices/{id}/` - Delete practice

2. **Clinician Management**
   - `POST /practices/{id}/clinicians/` - Add clinician to practice
   - `GET /practices/{id}/clinicians/` - List practice clinicians
   - `GET /clinicians/{id}` - Get clinician details
   - `PUT /clinicians/{id}` - Update clinician
   - `DELETE /clinicians/{id}` - Remove clinician

3. **Clinician Contracts**
   - `POST /clinicians/{id}/contracts/` - Create contract
   - `GET /clinicians/{id}/contracts/` - List contracts
   - `PUT /contracts/{id}` - Update contract

4. **Clinician Rates**
   - `POST /clinicians/{id}/rates/` - Add rate structure
   - `GET /clinicians/{id}/rates/` - List rates
   - `PUT /rates/{id}` - Update rate

#### Important (Should Have)

5. **PMS Integration Setup**
   - `POST /clients/{id}/pms/setup/` - Configure PMS connection
   - `POST /pms/{type}/test-connection/` - Test PMS connectivity
   - `POST /pms/{id}/sync/` - Trigger PMS data sync

6. **Database Migration Endpoints** (Convert mock to DB)
   - Migrate `/users/` to database
   - Migrate `/compass/dates/` to database
   - Migrate `/coa/categories/` to database

---

## B. Frontend Analysis

### Existing Pages (24 total)

#### Client Onboarding (3 pages)
- `ClientOnboardingList` - List all clients
- `ClientOnboardingCreate` - 10-tab onboarding form
- `ClientOnboardingUsers` - List client users

#### Xero Integration (11 pages)
- `XeroList` - Tenant connections
- `XeroAccounts`, `XeroContacts`, `XeroInvoices`, `XeroCreditNotes`
- `XeroPayments`, `XeroBankTransactions`, `XeroBankTransfers`
- `XeroJournals`, `XeroJournalLines`, `XeroContactGroups`

#### System (5 pages)
- `LoginPage` - Authentication
- `Practice360` - Dashboard
- `WorkFinUserList`, `WorkFinUserCreate` - Management users
- `CompassDatesList`, `CompassDatesCreate` - Payroll dates

### Missing Pages

#### Critical (Must Have for MVP)

1. **Practice Management Pages**
   ```
   /practices/list                  → PracticesList
   /practices/create                → PracticeCreate
   /practices/edit/:practiceId      → PracticeEdit
   /practices/:practiceId/details   → PracticeDetails
   ```

2. **Clinician Management Pages**
   ```
   /clinicians/list                 → CliniciansList
   /clinicians/create               → ClinicianCreate
   /clinicians/edit/:clinicianId    → ClinicianEdit
   /clinicians/:clinicianId/details → ClinicianDetails
   ```

3. **Clinician Contract Pages**
   ```
   /clinicians/:clinicianId/contracts/list   → ContractsList
   /clinicians/:clinicianId/contracts/create → ContractCreate
   /contracts/:contractId/edit               → ContractEdit
   ```

4. **Clinician Rate Configuration Pages**
   ```
   /clinicians/:clinicianId/rates/list   → RatesList
   /clinicians/:clinicianId/rates/create → RateCreate
   /rates/:rateId/edit                   → RateEdit
   ```

#### Important (Should Have)

5. **PMS Integration Setup Wizard**
   ```
   /pms/setup                       → PMSSetupWizard
   /pms/:type/configure             → PMSConfigure
   /pms/:id/sync-status             → PMSSyncStatus
   ```

6. **Chart of Accounts Management**
   ```
   /coa/list                        → CoAList
   /coa/create                      → CoACreate
   /coa/:id/edit                    → CoAEdit
   ```

7. **Client Onboarding Status/Progress Page**
   ```
   /onboarding/:clientId/status     → OnboardingStatus
   ```

---

## C. Database Analysis

### Existing Tables (denpay-dev schema)

| Table | Status | Relationships | Purpose |
|-------|--------|---------------|---------|
| `clients` | ✅ Complete | → address, users, practices | Main client entity |
| `client_addresses` | ✅ Complete | ← client | Client address |
| `users` | ✅ Complete | ← client, → roles | User accounts |
| `user_roles` | ✅ Complete | ← user | User permissions |
| `practices` | ✅ Complete | ← client, → address | Practice/location |
| `practice_addresses` | ✅ Complete | ← practice | Practice address |
| `clinicians` | ✅ Complete | → address | Clinician entity |
| `clinician_addresses` | ✅ Complete | ← clinician | Clinician address |
| `compass_dates` | ✅ Complete | - | Payroll schedule |
| `client_adjustment_types` | ✅ Complete | ← client | Payroll adjustments |
| `client_pms_integrations` | ✅ Complete | ← client | PMS configs |
| `client_denpay_periods` | ✅ Complete | ← client | Payment periods |
| `client_fy_end_periods` | ✅ Complete | ← client | Financial year ends |

### Existing Tables (xero schema)

| Table | Purpose |
|-------|---------|
| `tokens` | Xero OAuth tokens |
| `accounts` | Chart of accounts |
| `contacts` | Customers/suppliers |
| `invoices`, `creditnotes`, `payments` | Financial transactions |
| `bankTransactions`, `BankTransfer` | Banking data |
| `journals`, `journalsLines` | Journal entries |
| `contactgroups` | Contact groups |

### Missing Tables

#### Critical (Must Have)

1. **clinician_practice_assignments**
   ```sql
   CREATE TABLE "denpay-dev".clinician_practice_assignments (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       clinician_id UUID NOT NULL REFERENCES "denpay-dev".clinicians(id),
       practice_id UUID NOT NULL REFERENCES "denpay-dev".practices(id),
       start_date DATE NOT NULL,
       end_date DATE,
       is_primary BOOLEAN DEFAULT FALSE,
       status VARCHAR(50) DEFAULT 'Active',
       created_at TIMESTAMPTZ DEFAULT NOW(),
       UNIQUE(clinician_id, practice_id, start_date)
   );
   ```

2. **clinician_contracts**
   ```sql
   CREATE TABLE "denpay-dev".clinician_contracts (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       clinician_id UUID NOT NULL REFERENCES "denpay-dev".clinicians(id),
       contract_type VARCHAR(50) NOT NULL, -- 'FULL_TIME', 'PART_TIME', 'ASSOCIATE', 'LOCUM'
       start_date DATE NOT NULL,
       end_date DATE,
       status VARCHAR(50) DEFAULT 'Active',
       terms TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **clinician_rates**
   ```sql
   CREATE TABLE "denpay-dev".clinician_rates (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       clinician_id UUID NOT NULL REFERENCES "denpay-dev".clinicians(id),
       rate_type VARCHAR(50) NOT NULL, -- 'HOURLY', 'DAILY', 'PROCEDURE', 'PERCENTAGE'
       rate_value NUMERIC(10,2) NOT NULL,
       effective_from DATE NOT NULL,
       effective_to DATE,
       procedure_code VARCHAR(50), -- For PROCEDURE type
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

#### Important (Should Have)

4. **coa_categories** (migrate from mock)
   ```sql
   CREATE TABLE "denpay-dev".coa_categories (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       client_id UUID REFERENCES "denpay-dev".clients(id),
       coa_name VARCHAR(255) NOT NULL,
       category_number VARCHAR(50),
       values JSONB,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

5. **pms_sync_logs** (Track sync history)
   ```sql
   CREATE TABLE "denpay-dev".pms_sync_logs (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       client_id UUID NOT NULL REFERENCES "denpay-dev".clinicians(id),
       pms_type VARCHAR(50) NOT NULL,
       sync_status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED', 'PARTIAL'
       records_synced INTEGER DEFAULT 0,
       error_message TEXT,
       started_at TIMESTAMPTZ DEFAULT NOW(),
       completed_at TIMESTAMPTZ
   );
   ```

### Database Issues

1. **Clinician-Client Relationship Missing**
   - Clinicians table has NO foreign key to clients
   - Cannot query "all clinicians for a client"
   - Must link via: Client → Practice → ClinicianPracticeAssignment → Clinician

2. **Enum Type Mismatch (FIXED)**
   - ✅ RESOLVED: `entity_status` enum now has 4 values (Active, Inactive, Pending, Deleted)
   - ✅ RESOLVED: `clients.status` column uses enum type

3. **Missing Indexes**
   - Need index on `clinician_practice_assignments(practice_id)`
   - Need index on `clinician_contracts(clinician_id)`
   - Need index on `clinician_rates(clinician_id, effective_from)`

---

## D. Integration Analysis

### Xero Integration

**Status:** ✅ Complete and Working

**What Works:**
- OAuth 2.0 authentication flow
- Token storage and refresh
- Comprehensive data sync (11 entity types)
- Quick sync (top 20 records) and full sync
- Paginated data retrieval across 11 endpoints
- Date format conversion (`/Date(timestamp)/` → Python datetime)

**What's Missing:**
- ❌ Xero tenant selection UI (must manually specify tenant_id in API calls)
- ❌ GL code mapping configuration page
- ❌ Automated sync scheduling
- ❌ Sync error handling and retry logic UI

### SOE Integration (Azure Blob)

**Status:** ⚠️ Partial - Read-only from Blob Storage

**What Works:**
- Reading Parquet files from Azure Blob Storage
- Listing available SOE tables
- Paginated data retrieval with NaN value cleaning
- Support for vw_DimPatients and vw_Appointments views

**What's Missing:**
- ❌ No database persistence (reads directly from blob every time)
- ❌ No sync workflow to copy SOE data into PostgreSQL
- ❌ No UI for configuring SOE connection
- ❌ No practice ID mapping (SOE practice → WorkFin client)
- ❌ Missing endpoints for other SOE tables (providers, billing, schedules)

**Recommended Architecture:**
```
Azure Blob (Gold Layer)
    ↓ (Scheduled sync job)
PostgreSQL (soe schema)
    ↓ (API queries)
Frontend UI
```

### PMS Integration (General)

**Status:** ⚠️ Configuration Only - No Active Integration

**What Works:**
- `client_pms_integrations` table stores PMS config
- UI collects PMS type (SOE, DENTALLY, SFD, CARESTACK)
- Integration config stored as JSONB

**What's Missing:**
- ❌ No actual integration with DENTALLY, SFD, CARESTACK
- ❌ No test connection capability
- ❌ No sync workflow for each PMS type
- ❌ No mapping of external IDs to WorkFin IDs

---

## E. Gap Analysis Summary

### Critical Missing Features (Must Have for MVP)

| Priority | Feature | Frontend | Backend | Database | Complexity |
|----------|---------|----------|---------|----------|------------|
| **P0** | Practice Management Pages | ❌ Missing | ✅ Model exists | ✅ Table exists | Medium |
| **P0** | Clinician Management Pages | ❌ Missing | ❌ Endpoints missing | ✅ Table exists | High |
| **P0** | Clinician Contracts | ❌ Missing | ❌ Endpoints missing | ❌ Table missing | High |
| **P0** | Clinician Rates | ❌ Missing | ❌ Endpoints missing | ❌ Table missing | High |
| **P0** | Practice-Clinician Linking | ❌ Missing | ❌ Endpoints missing | ❌ Table missing | Medium |
| **P1** | Migrate Users to DB | ✅ UI exists | 🟡 Mock only | ✅ Table exists | Low |
| **P1** | Migrate Compass to DB | ✅ UI exists | 🟡 Mock only | ✅ Table exists | Low |
| **P1** | Migrate CoA to DB | ❌ UI missing | 🟡 Mock only | ❌ Table missing | Medium |

### Important Missing Features (Should Have)

| Priority | Feature | Frontend | Backend | Database | Complexity |
|----------|---------|----------|---------|----------|------------|
| **P2** | PMS Setup Wizard | ❌ Missing | ⚠️ Partial | ✅ Config table exists | High |
| **P2** | SOE Sync to Database | ❌ Missing | ⚠️ Blob only | ❌ Schema missing | Medium |
| **P2** | Xero Tenant Selection UI | ❌ Missing | ✅ Backend complete | ✅ DB complete | Low |
| **P2** | GL Code Mapping | ❌ Missing | ❌ Endpoints missing | ❌ Table missing | Medium |
| **P2** | Onboarding Progress Tracker | ❌ Missing | ❌ Logic missing | ✅ Data exists | Low |
| **P2** | Integration Health Dashboard | ❌ Missing | ❌ Endpoints missing | ❌ Table missing | Medium |

### Nice to Have (Can Be Added Later)

| Priority | Feature | Complexity |
|----------|---------|------------|
| **P3** | Clinician Schedule Management | High |
| **P3** | Clinician Qualifications Tracking | Medium |
| **P3** | Automated Sync Scheduling | Medium |
| **P3** | Multi-tenant Xero Support | High |
| **P3** | Advanced Reporting Dashboard | High |
| **P3** | Audit Log/History Tracking | Medium |

---

## F. Recommended Implementation Order

### Phase 1: Critical Database Foundations (Week 1-2)

**Priority: P0 - Must complete first**

1. **Create Missing Database Tables**
   - `clinician_practice_assignments` table
   - `clinician_contracts` table
   - `clinician_rates` table
   - Add foreign key `client_id` to `clinicians` table (if needed)
   - Create indexes for performance
   - **Complexity:** Medium | **Est. Time:** 2 days

2. **Create Clinician Management Endpoints**
   ```
   POST   /clinicians/
   GET    /clinicians/{id}
   PUT    /clinicians/{id}
   DELETE /clinicians/{id}
   GET    /clients/{id}/clinicians/
   POST   /practices/{id}/clinicians/
   GET    /practices/{id}/clinicians/
   ```
   - **Complexity:** High | **Est. Time:** 3-4 days

3. **Create Clinician Contract Endpoints**
   ```
   POST   /clinicians/{id}/contracts/
   GET    /clinicians/{id}/contracts/
   GET    /contracts/{id}
   PUT    /contracts/{id}
   DELETE /contracts/{id}
   ```
   - **Complexity:** Medium | **Est. Time:** 2 days

4. **Create Clinician Rate Endpoints**
   ```
   POST   /clinicians/{id}/rates/
   GET    /clinicians/{id}/rates/
   GET    /rates/{id}
   PUT    /rates/{id}
   DELETE /rates/{id}
   ```
   - **Complexity:** Medium | **Est. Time:** 2 days

**Total Phase 1 Time:** ~2 weeks

---

### Phase 2: Frontend Clinician Management (Week 3-4)

**Priority: P0 - Core user-facing features**

1. **Create Clinician List Page**
   - Display all clinicians with search/filter
   - Link to client and practices
   - Status indicators
   - **Complexity:** Low | **Est. Time:** 2 days

2. **Create Clinician Create/Edit Form**
   - Personal details (name, email, phone, address)
   - Contract type selection
   - Practice assignment
   - Status management
   - **Complexity:** Medium | **Est. Time:** 3 days

3. **Create Clinician Detail Page**
   - View clinician information
   - List contracts (active/historical)
   - List rate structures
   - Practice assignments
   - **Complexity:** Medium | **Est. Time:** 2 days

4. **Create Contract Management UI**
   - Create/edit contracts
   - View contract history
   - Status management (Active/Expired)
   - **Complexity:** Medium | **Est. Time:** 2 days

5. **Create Rate Management UI**
   - Add/edit rate structures
   - Effective date ranges
   - Rate types (hourly, daily, procedure, percentage)
   - **Complexity:** Medium | **Est. Time:** 2 days

6. **Create Practice Assignment UI**
   - Assign clinicians to practices
   - Set primary practice
   - Manage start/end dates
   - **Complexity:** Low | **Est. Time:** 1 day

**Total Phase 2 Time:** ~2 weeks

---

### Phase 3: Database Migrations (Week 5)

**Priority: P1 - Stabilize existing features**

1. **Migrate Users to Database**
   - Update `userService.ts` to use API instead of localStorage
   - Remove mock data from backend
   - Test full CRUD workflow
   - **Complexity:** Low | **Est. Time:** 1 day

2. **Migrate Compass Dates to Database**
   - Update `compassService.ts`
   - Remove mock data from backend
   - Test full CRUD workflow
   - **Complexity:** Low | **Est. Time:** 1 day

3. **Migrate CoA to Database**
   - Create `coa_categories` table
   - Create backend endpoints
   - Create `coaService.ts` frontend service
   - Create UI pages for CoA management
   - **Complexity:** Medium | **Est. Time:** 3 days

**Total Phase 3 Time:** ~1 week

---

### Phase 4: Practice Management (Week 6)

**Priority: P0/P1 - Complete client onboarding workflow**

1. **Create Practice Management Endpoints** (if not complete)
   ```
   POST   /clients/{id}/practices/
   GET    /clients/{id}/practices/
   GET    /practices/{id}
   PUT    /practices/{id}
   DELETE /practices/{id}
   ```
   - **Complexity:** Medium | **Est. Time:** 2 days

2. **Create Practice List Page**
   - Display practices for a client
   - Filter by status, location
   - Link to clinicians
   - **Complexity:** Low | **Est. Time:** 1 day

3. **Create Practice Create/Edit Form**
   - Practice details (name, location, external IDs)
   - Address information
   - Integration mapping (PMS practice ID → WorkFin practice ID)
   - **Complexity:** Medium | **Est. Time:** 2 days

**Total Phase 4 Time:** ~1 week

---

### Phase 5: PMS Integration Setup (Week 7-8)

**Priority: P2 - Important for operational efficiency**

1. **Create PMS Configuration Endpoints**
   ```
   POST   /clients/{id}/pms/setup/
   POST   /pms/{type}/test-connection/
   POST   /pms/{id}/sync/
   GET    /pms/{id}/sync-status/
   ```
   - **Complexity:** High | **Est. Time:** 4 days

2. **Create PMS Setup Wizard UI**
   - Multi-step form (select type → configure → test → map)
   - Support for SOE, DENTALLY, SFD, CARESTACK
   - Test connection capability
   - Practice ID mapping
   - **Complexity:** High | **Est. Time:** 5 days

3. **Create PMS Sync Status Dashboard**
   - View last sync date/time
   - Display sync errors
   - Manual sync trigger
   - Sync history log
   - **Complexity:** Medium | **Est. Time:** 3 days

**Total Phase 5 Time:** ~2 weeks

---

### Phase 6: SOE Database Persistence (Week 9)

**Priority: P2 - Performance and offline capability**

1. **Create SOE Schema in PostgreSQL**
   - `soe.patients`, `soe.appointments`, `soe.providers`, etc.
   - Indexes for performance
   - **Complexity:** Medium | **Est. Time:** 2 days

2. **Create SOE Sync Service**
   - Read from Azure Blob
   - Transform and insert into PostgreSQL
   - Handle incremental updates
   - **Complexity:** High | **Est. Time:** 3 days

3. **Update SOE Endpoints to Query Database**
   - Change from blob reads to DB queries
   - Keep blob fallback for initial sync
   - **Complexity:** Low | **Est. Time:** 1 day

4. **Create SOE Sync Scheduler**
   - Background job for periodic sync
   - Configurable sync frequency
   - Error handling and logging
   - **Complexity:** Medium | **Est. Time:** 2 days

**Total Phase 6 Time:** ~1.5 weeks

---

### Phase 7: Xero Enhancements (Week 10)

**Priority: P2 - Improve user experience**

1. **Create Xero Tenant Selection UI**
   - Dropdown to select active tenant
   - Store selection in localStorage or user preferences
   - Auto-populate tenant_id in API calls
   - **Complexity:** Low | **Est. Time:** 1 day

2. **Create GL Code Mapping Page**
   - Map Xero accounts to WorkFin categories
   - Bulk mapping capability
   - Save mappings to database
   - **Complexity:** Medium | **Est. Time:** 3 days

3. **Create Automated Sync Scheduler**
   - Configure sync frequency (daily, weekly, monthly)
   - Background job execution
   - Email notifications on errors
   - **Complexity:** Medium | **Est. Time:** 2 days

**Total Phase 7 Time:** ~1 week

---

### Phase 8: Polish & Quality (Week 11-12)

**Priority: P2/P3 - User experience improvements**

1. **Create Onboarding Progress Tracker**
   - Visual indicator of completion (tabs 1-10)
   - Highlight incomplete sections
   - Validation status per tab
   - **Complexity:** Low | **Est. Time:** 2 days

2. **Create Integration Health Dashboard**
   - Status cards (Xero, SOE, PMS)
   - Last sync times
   - Error counts
   - Quick actions (reconnect, test, sync)
   - **Complexity:** Medium | **Est. Time:** 3 days

3. **Error Handling & Validation Improvements**
   - Consistent error messages across all forms
   - Field-level validation
   - Better error recovery
   - **Complexity:** Medium | **Est. Time:** 3 days

4. **Testing & Bug Fixes**
   - End-to-end testing of full onboarding workflow
   - Integration testing (Xero, SOE, PMS)
   - Performance optimization
   - **Complexity:** High | **Est. Time:** 4 days

**Total Phase 8 Time:** ~2 weeks

---

## Total Estimated Timeline: ~12 Weeks (3 Months)

**Breakdown:**
- Phase 1 (Database + Backend): 2 weeks
- Phase 2 (Frontend Clinicians): 2 weeks
- Phase 3 (DB Migrations): 1 week
- Phase 4 (Practice Management): 1 week
- Phase 5 (PMS Integration): 2 weeks
- Phase 6 (SOE Persistence): 1.5 weeks
- Phase 7 (Xero Enhancements): 1 week
- Phase 8 (Polish & Quality): 2 weeks

**Critical Path to MVP:** Phases 1-4 (6 weeks)

---

## Quick Wins (Can Be Done in Parallel)

These are low-complexity tasks that provide immediate value:

1. **Migrate Users to Database** - 1 day
2. **Migrate Compass Dates to Database** - 1 day
3. **Xero Tenant Selection UI** - 1 day
4. **Onboarding Progress Tracker** - 2 days

**Total Quick Wins:** ~5 days

---

## Risk Assessment

### High Risk Items

1. **Clinician Management Complexity**
   - Multiple related entities (clinician, contract, rates, assignments)
   - Complex business logic for rate calculations
   - Mitigation: Start with simple CRUD, add business logic incrementally

2. **PMS Integration Variability**
   - Different APIs for SOE, DENTALLY, SFD, CARESTACK
   - Each requires different authentication and data formats
   - Mitigation: Build abstraction layer, implement one at a time

3. **SOE Data Volume**
   - Large Parquet files in Azure Blob
   - Performance concerns with full database sync
   - Mitigation: Implement incremental sync, use pagination

### Medium Risk Items

4. **Database Schema Changes**
   - Adding new tables requires Alembic migrations
   - Risk of breaking existing data
   - Mitigation: Thorough testing in UAT environment first

5. **Frontend State Management**
   - Complex forms with validation across multiple tabs
   - Risk of state synchronization issues
   - Mitigation: Use React Context or Zustand for global state

---

## Success Criteria

### Phase 1-4 (MVP - 6 weeks)
- ✅ Create client with 10-tab onboarding form
- ✅ Add practices to client
- ✅ Add clinicians to practices
- ✅ Create clinician contracts
- ✅ Configure clinician rates
- ✅ Assign clinicians to practices

### Phase 5-6 (Integration - 3.5 weeks)
- ✅ Configure PMS integration (at least SOE)
- ✅ Sync SOE data to database
- ✅ View SOE patients and appointments

### Phase 7-8 (Polish - 3 weeks)
- ✅ Select Xero tenant from UI
- ✅ Map GL codes to categories
- ✅ View onboarding completion status
- ✅ Monitor integration health
- ✅ All mock endpoints migrated to database

---

## Next Steps

### Immediate Actions (This Week)

1. **Review and approve this gap analysis**
2. **Prioritize phases based on business needs**
3. **Set up development environment for new features**
4. **Create Alembic migration for new tables**
5. **Start Phase 1: Database foundations**

### Week 1 Tasks

1. Create `clinician_practice_assignments` table
2. Create `clinician_contracts` table
3. Create `clinician_rates` table
4. Write Alembic migration script
5. Apply migration to UAT database
6. Begin clinician endpoint development

---

## Appendix: File Locations

### Backend Files
- **Models:** `/Workfin_backend/app/db/models.py`
- **Endpoints:** `/Workfin_backend/app/api/v1/endpoints/`
- **Services:** `/Workfin_backend/app/services/`
- **Config:** `/Workfin_backend/app/core/config.py`

### Frontend Files
- **Pages:** `/src/pages/`
- **Services:** `/src/services/`
- **Components:** `/src/components/`
- **Routes:** `/src/App.tsx`
- **Constants:** `/src/config/constants.ts`

### Database
- **Host:** `pgsql-uat-uk-workfin-02.postgres.database.azure.com`
- **Database:** `workfin_uat_db`
- **Main Schema:** `"denpay-dev"`
- **Xero Schema:** `"xero"`
- **User:** `dp_admin`

---

**End of Report**