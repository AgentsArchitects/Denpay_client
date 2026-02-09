# DenPay Database Migration Guide

**Migration Date:** February 2026
**Migration Type:** Primary Key Restructuring - UUID to Alphanumeric Identifiers

---

## 📋 Overview

This document outlines the complete database schema migration from UUID-based primary keys to shorter, user-friendly 8-character alphanumeric identifiers for the main entity tables (Clients, Practices, Clinicians).

### Why This Migration?

- **User-Friendly IDs:** Easier to read, type, and communicate (e.g., `ABC12345` vs `123e4567-e89b-12d3-a456-426614174000`)
- **Shorter URLs:** More concise API endpoints
- **Better UX:** IDs can be displayed in UI without truncation
- **Consistent Naming:** Standardized primary key naming across entities

---

## 🗃️ Database Schema Changes

### 1. **CLIENTS Table**

| Aspect | Old Structure | New Structure |
|--------|---------------|---------------|
| Primary Key | `id` (UUID) | `tenant_id` (VARCHAR(8)) |
| Columns Removed | `id` | - |
| Format | UUID (36 chars) | Alphanumeric (8 chars) |
| Example | `123e4567-e89b...` | `ABC12345` |

**SQL Changes:**
```sql
-- Dropped: id column
-- Primary Key: tenant_id VARCHAR(8)
ALTER TABLE "denpay-dev".clients DROP CONSTRAINT clients_pkey;
ALTER TABLE "denpay-dev".clients ADD PRIMARY KEY (tenant_id);
ALTER TABLE "denpay-dev".clients DROP COLUMN id;
```

---

### 2. **CLIENT_ADDRESSES Table**

| Aspect | Old Structure | New Structure |
|--------|---------------|---------------|
| Primary Key | `id` (UUID) | `tenant_id` (VARCHAR(8)) |
| Foreign Key | `client_id` (UUID) | `tenant_id` (VARCHAR(8)) |
| Columns Removed | `id`, `client_id`, `county` | - |
| Relationship | Many-to-one | One-to-one |

**SQL Changes:**
```sql
-- Changed to one-to-one relationship
-- tenant_id is now both PK and FK
ALTER TABLE "denpay-dev".client_addresses DROP CONSTRAINT client_addresses_pkey;
ALTER TABLE "denpay-dev".client_addresses ADD PRIMARY KEY (tenant_id);
ALTER TABLE "denpay-dev".client_addresses DROP COLUMN id;
ALTER TABLE "denpay-dev".client_addresses DROP COLUMN client_id;
ALTER TABLE "denpay-dev".client_addresses DROP COLUMN county;
```

---

### 3. **PRACTICES Table**

| Aspect | Old Structure | New Structure |
|--------|---------------|---------------|
| Primary Key | `id` (UUID) | `practice_id` (VARCHAR(8)) |
| Foreign Key (Client) | `client_id` (UUID) | `tenant_id` (VARCHAR(8)) |
| Columns Removed | `id`, `client_id` | - |
| Format | UUID (36 chars) | Alphanumeric (8 chars) |
| Example | `456e7890-f12g...` | `DEF67890` |

**SQL Changes:**
```sql
-- Dropped: id, client_id columns
-- Primary Key: practice_id VARCHAR(8)
-- Foreign Key: tenant_id references clients
ALTER TABLE "denpay-dev".practices DROP CONSTRAINT practices_pkey;
ALTER TABLE "denpay-dev".practices ADD PRIMARY KEY (practice_id);
ALTER TABLE "denpay-dev".practices DROP COLUMN id;
ALTER TABLE "denpay-dev".practices RENAME COLUMN client_id TO tenant_id;
ALTER TABLE "denpay-dev".practices ALTER COLUMN tenant_id TYPE VARCHAR(8);
ALTER TABLE "denpay-dev".practices ADD CONSTRAINT fk_practices_client
  FOREIGN KEY (tenant_id) REFERENCES "denpay-dev".clients(tenant_id);
```

---

### 4. **PRACTICE_ADDRESSES Table**

| Aspect | Old Structure | New Structure |
|--------|---------------|---------------|
| Primary Key | `id` (UUID) | `practice_id` (VARCHAR(8)) |
| Foreign Key | `practice_id` (UUID) | `practice_id` (VARCHAR(8)) |
| Columns Removed | `id`, `county` | - |
| Relationship | Many-to-one | One-to-one |

**SQL Changes:**
```sql
-- Changed to one-to-one relationship
ALTER TABLE "denpay-dev".practice_addresses DROP CONSTRAINT practice_addresses_pkey;
ALTER TABLE "denpay-dev".practice_addresses ADD PRIMARY KEY (practice_id);
ALTER TABLE "denpay-dev".practice_addresses DROP COLUMN id;
ALTER TABLE "denpay-dev".practice_addresses DROP COLUMN county;
```

---

### 5. **CLINICIANS Table**

| Aspect | Old Structure | New Structure |
|--------|---------------|---------------|
| Primary Key | `id` (UUID) | `clinician_id` (VARCHAR(8)) |
| Columns Removed | `id` | - |
| Format | UUID (36 chars) | Alphanumeric (8 chars) |
| Example | `789a0123-b45c...` | `GHI78901` |

**SQL Changes:**
```sql
-- Dropped: id column
-- Primary Key: clinician_id VARCHAR(8)
ALTER TABLE "denpay-dev".clinicians DROP CONSTRAINT clinicians_pkey;
ALTER TABLE "denpay-dev".clinicians ADD PRIMARY KEY (clinician_id);
ALTER TABLE "denpay-dev".clinicians DROP COLUMN id;
```

---

### 6. **Related Tables Updated**

All tables with foreign key references were updated:

**Client-Related Tables:**
- `client_addresses` - Uses `tenant_id` as PK
- `client_adjustment_types` - FK updated to `tenant_id` VARCHAR(8)
- `xero_connections` - FK updated to `tenant_id` VARCHAR(8)

**Practice-Related Tables (17 tables):**
- `practice_addresses` - Uses `practice_id` as PK
- `nhs_contracts` - FK updated to `practice_id` VARCHAR(8)
- `clinician_practices` - Composite PK (clinician_id, practice_id) both VARCHAR(8)
- `income_rates` - FK updated to `practice_id` VARCHAR(8)
- `deduction_rates` - FK updated to `practice_id` VARCHAR(8)
- `bad_debts`, `cross_charges`, `income_adjustments`, `lab_adjustments`, etc.
- `pms_connections` (integrations schema) - FK updated

**Clinician-Related Tables (6 tables):**
- `clinician_addresses` - FK updated to `clinician_id` VARCHAR(8)
- `clinician_practices` - Composite PK (clinician_id, practice_id)
- `clinician_other_details` - Uses `clinician_id` as PK
- `clinician_contracts` - FK updated to `clinician_id` VARCHAR(8)
- `income_rates` - FK updated to `clinician_id` VARCHAR(8)
- `income_adjustments` - FK updated to `clinician_id` VARCHAR(8)

---

## 🔄 API Endpoint Changes

### **CLIENTS Endpoints**

#### GET /api/clients
- **Status:** ✅ No breaking changes
- **Changes:** Response `id` field now returns `tenant_id` value

#### GET /api/clients/{id}
- **Old:** `GET /api/clients/{client_id}` (UUID)
- **New:** `GET /api/clients/{tenant_id}` (8-char string)
- **Breaking Change:** ⚠️ Path parameter name and type changed

#### POST /api/clients
- **Status:** ✅ Working
- **Changes:**
  - Auto-generates 8-char `tenant_id`
  - Request body no longer accepts `county` in address

#### PUT /api/clients/{id}
- **Old:** `PUT /api/clients/{client_id}` (UUID)
- **New:** `PUT /api/clients/{tenant_id}` (8-char string)
- **Breaking Change:** ⚠️ Path parameter changed

#### DELETE /api/clients/{id}
- **Old:** `DELETE /api/clients/{client_id}` (UUID)
- **New:** `DELETE /api/clients/{tenant_id}` (8-char string)
- **Breaking Change:** ⚠️ Path parameter changed

**Example Request/Response:**
```json
// GET /api/clients/ABC12345
{
  "id": "ABC12345",
  "tenantId": "ABC12345",
  "legalTradingName": "Bright Orthodontics Ltd",
  "workfinReference": "BRI7081",
  "contactEmail": "contact@bright.com",
  "address": {
    "line1": "123 Main St",
    "line2": "Suite 100",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "United Kingdom"
    // Note: "county" field removed
  }
}
```

---

### **PRACTICES Endpoints**

#### GET /api/practices
- **Old Query Param:** `?clientId={uuid}`
- **New Query Param:** `?tenantId={8-char}`
- **Breaking Change:** ⚠️ Query parameter name changed

#### GET /api/practices/{practice_id}
- **Status:** ✅ Parameter name unchanged, but type changed
- **Old Type:** UUID
- **New Type:** 8-character string

#### POST /api/practices
- **Status:** ✅ Working
- **Changes:**
  - Auto-generates 8-char `practice_id`
  - Request body `clientId` now expects `tenant_id` (8-char)
  - No longer accepts `county` in address

#### PUT /api/practices/{practice_id}
- **Status:** ✅ Working
- **Changes:** Soft delete implemented

#### DELETE /api/practices/{practice_id}
- **Status:** ✅ Working
- **Changes:** Performs soft delete (sets status to "Inactive")

**Example Request/Response:**
```json
// POST /api/practices
Request:
{
  "clientId": "ABC12345",  // tenant_id
  "name": "Bright Orthodontics - Main",
  "locationId": "LOC001",
  "acquisitionDate": "2024-01-01",
  "address": {
    "line1": "456 High Street",
    "city": "Manchester",
    "postcode": "M1 1AA"
    // No county field
  }
}

Response:
{
  "id": "DEF67890",
  "practiceId": "DEF67890",
  "tenantId": "ABC12345",
  "clientId": "ABC12345",  // For backward compatibility
  "name": "Bright Orthodontics - Main",
  "status": "Active"
}
```

---

### **CLINICIANS Endpoints**

#### GET /api/clinicians
- **Status:** ✅ Working
- **Changes:** Response `id` returns `clinician_id` value

#### GET /api/clinicians/{clinician_id}
- **Status:** ✅ Parameter name unchanged
- **Old Type:** UUID
- **New Type:** 8-character string

#### POST /api/clinicians
- **Status:** ✅ Working
- **Changes:**
  - Auto-generates 8-char `clinician_id`
  - No longer accepts `county` in address

#### PUT /api/clinicians/{clinician_id}
- **Status:** ✅ Working

#### DELETE /api/clinicians/{clinician_id}
- **Status:** ✅ Working

**Example Request/Response:**
```json
// POST /api/clinicians
Request:
{
  "title": "Dr",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "07700900123",
  "gender": "Male",
  "nationality": "British",
  "contractualStatus": "Permanent",
  "designation": "Dentist",
  "address": {
    "line1": "789 Oak Avenue",
    "city": "Birmingham",
    "postcode": "B1 1AA"
    // No county field
  }
}

Response:
{
  "id": "GHI78901",
  "clinicianId": "GHI78901",
  "title": "Dr",
  "firstName": "John",
  "lastName": "Smith",
  "status": "Active"
}
```

---

## 💥 Breaking Changes Summary

### 1. **ID Format Changes**
```javascript
// Before
id: "123e4567-e89b-12d3-a456-426614174000"  // 36 characters

// After
id: "ABC12345"  // 8 characters
```

### 2. **Path Parameter Changes**
```javascript
// Clients
/api/clients/{client_id} → /api/clients/{tenant_id}

// Note: Practices and Clinicians keep same param names
// but types change from UUID to 8-char string
```

### 3. **Query Parameter Changes**
```javascript
// Practices filter by client
/api/practices?clientId=UUID → /api/practices?tenantId=ABC12345
```

### 4. **Request Body Changes**
```javascript
// POST/PUT Practices
{
  "clientId": "uuid-here"  // Before
  "clientId": "ABC12345"   // After (expects tenant_id)
}
```

### 5. **Removed Fields**
```javascript
// All address objects - county field removed
{
  "address": {
    "county": "..."  // ❌ No longer exists
  }
}
```

### 6. **New Response Fields**
```javascript
// Explicit ID fields added for clarity
{
  "id": "ABC12345",
  "tenantId": "ABC12345",      // Clients
  "practiceId": "DEF67890",    // Practices
  "clinicianId": "GHI78901"    // Clinicians
}
```

---

## 🔧 Frontend Migration Guide

### Step 1: Update TypeScript Interfaces

```typescript
// Before
interface Client {
  id: string;  // UUID
  tenantId: string;
  address?: {
    county?: string;
  }
}

// After
interface Client {
  id: string;  // 8-char alphanumeric
  tenantId: string;  // 8-char alphanumeric
  address?: {
    // county removed
  }
}

interface Practice {
  id: string;  // 8-char alphanumeric
  practiceId: string;
  tenantId: string;  // FK to client
  clientId: string;  // Backward compat
}

interface Clinician {
  id: string;  // 8-char alphanumeric
  clinicianId: string;
}
```

### Step 2: Update API Calls

```typescript
// ❌ Before
const getClient = async (clientId: string) => {
  return fetch(`/api/clients/${clientId}`);
}

const getPractices = async (clientId: string) => {
  return fetch(`/api/practices?clientId=${clientId}`);
}

// ✅ After
const getClient = async (tenantId: string) => {
  return fetch(`/api/clients/${tenantId}`);
}

const getPractices = async (tenantId: string) => {
  return fetch(`/api/practices?tenantId=${tenantId}`);
}
```

### Step 3: Update Form Components

```typescript
// Remove county field from all address forms
interface AddressFormData {
  line1: string;
  line2?: string;
  city: string;
  // county: string;  // ❌ Remove this
  postcode: string;
  country: string;
}
```

### Step 4: Update ID Validation

```typescript
// ❌ Before - UUID validation
const isValidId = (id: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ✅ After - 8-char alphanumeric validation
const isValidId = (id: string) => {
  return /^[A-Z0-9]{8}$/i.test(id);
}
```

### Step 5: Update Display Logic

```typescript
// IDs can now be displayed without truncation
// ✅ Before (had to truncate)
const displayId = (id: string) => id.substring(0, 8) + '...';

// ✅ After (show full ID)
const displayId = (id: string) => id;
```

---

## ✅ Testing Checklist

### Database Testing
- [ ] All tables have correct primary keys
- [ ] All foreign key constraints are working
- [ ] No orphaned records after migration
- [ ] All indexes are properly created

### Backend API Testing

**Clients:**
- [ ] GET /api/clients - Returns list with tenant_id
- [ ] GET /api/clients/{tenant_id} - Works with 8-char ID
- [ ] POST /api/clients - Creates client with auto-generated tenant_id
- [ ] PUT /api/clients/{tenant_id} - Updates client
- [ ] DELETE /api/clients/{tenant_id} - Deletes client
- [ ] Response has no county in address

**Practices:**
- [ ] GET /api/practices?tenantId=X - Filters by tenant_id
- [ ] GET /api/practices/{practice_id} - Works with 8-char ID
- [ ] POST /api/practices - Creates with tenant_id and practice_id
- [ ] PUT /api/practices/{practice_id} - Updates practice
- [ ] DELETE /api/practices/{practice_id} - Soft deletes (sets inactive)
- [ ] Response has no county in address

**Clinicians:**
- [ ] GET /api/clinicians - Returns list with clinician_id
- [ ] GET /api/clinicians/{clinician_id} - Works with 8-char ID
- [ ] POST /api/clinicians - Creates with auto-generated clinician_id
- [ ] PUT /api/clinicians/{clinician_id} - Updates clinician
- [ ] DELETE /api/clinicians/{clinician_id} - Deletes clinician
- [ ] Response has no county in address

### Frontend Testing
- [ ] All API calls use new parameter names
- [ ] IDs displayed correctly (8 chars, no truncation needed)
- [ ] Forms don't have county fields
- [ ] TypeScript types updated
- [ ] No UUID validation errors
- [ ] Links/routes work with new ID format

---

## 🚨 Common Issues & Solutions

### Issue 1: "Object has no attribute 'id'"
**Cause:** Code trying to access old `id` attribute
**Solution:** Replace with `tenant_id`, `practice_id`, or `clinician_id`

```python
# ❌ Before
client.id

# ✅ After
client.tenant_id
```

### Issue 2: "Column 'county' does not exist"
**Cause:** Code trying to access removed county field
**Solution:** Remove all county references

```python
# ❌ Before
address.county

# ✅ After
# Remove this line completely
```

### Issue 3: Foreign Key Constraint Violations
**Cause:** Old UUID references in related tables
**Solution:** Ensure all FK columns are VARCHAR(8) and reference new PKs

### Issue 4: "Cannot find client with UUID"
**Cause:** Frontend passing UUID to endpoint expecting tenant_id
**Solution:** Update frontend to pass 8-char tenant_id instead

---

## 📊 Migration Statistics

| Entity | Old PK Type | New PK Type | Tables Updated | Endpoints Updated |
|--------|-------------|-------------|----------------|-------------------|
| Clients | UUID | VARCHAR(8) tenant_id | 3 | 5 |
| Practices | UUID | VARCHAR(8) practice_id | 17 | 6 |
| Clinicians | UUID | VARCHAR(8) clinician_id | 6 | 5 |
| **Total** | - | - | **26** | **16** |

---

## 📝 Rollback Plan

In case of issues, here's the rollback strategy:

1. **Database:** Restore from backup taken before migration
2. **Backend:** Revert to previous commit
3. **Frontend:** Revert to previous version

**Note:** Once data is created with new IDs, rollback becomes complex. Test thoroughly before production deployment.

---

## 👥 Team Communication

**Backend Changes Owner:** [Your Name]
**Frontend Changes Required:** Client_onboarding team
**Database Migration:** Completed on [Date]
**API Documentation:** Updated in Swagger/OpenAPI

---

## 📚 Additional Resources

- [Database Schema Diagram](./docs/schema.png)
- [API Documentation](./docs/api.md)
- [Postman Collection](./docs/postman_collection.json)
- [Migration SQL Scripts](./sql/migration/)

---

## ✅ Sign-off

- [ ] Database migration tested
- [ ] Backend API endpoints verified
- [ ] Frontend team notified
- [ ] Documentation updated
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

---

**Last Updated:** February 6, 2026
**Version:** 1.0
**Status:** ✅ Complete
