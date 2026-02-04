# Database Migration Summary - Multi-Tenant Integration Architecture

**Date**: 2026-02-04
**Migration**: Multi-tenant integration architecture restructure
**Impact**: All PMS integrations (SOE, SFD, Dentally, CareStack, Xero, Compass)

---

## Executive Summary

We have migrated from a UUID-based `client_id` system to a multi-tenant architecture using 8-character alphanumeric `tenant_id` as the master identifier. This change affects all integration tables across the system and **requires frontend updates** in the Client Portal.

---

## Breaking Changes

### 1. **Master Identifier Changed**

| Before | After |
|--------|-------|
| `client_id` (UUID) | `tenant_id` (VARCHAR(8)) |
| Example: `b40a897d-d991-4617-af68-f753ed20be51` | Example: `0T5SE46E` |

**Impact**: All API requests and responses now use `tenant_id` instead of `client_id`.

---

## Database Schema Changes

### **Table: `"denpay-dev".clients`** (Master Tenant Registry)

**Changes**:
- Added `UNIQUE` constraint on `tenant_id` column
- Made `tenant_id` NOT NULL
- `tenant_id` is now the **single source of truth** for tenant identity

**Structure**:
```sql
"denpay-dev".clients
├── id (UUID, PK) -- Legacy, kept for backward compatibility
├── tenant_id (VARCHAR(8), UNIQUE, NOT NULL) ⭐ Master identifier
├── legal_trading_name (VARCHAR)
└── ... (other client fields)
```

---

### **Table: `soe.soe_integrations`** (SOE Integration Metadata)

**Major Changes**:
- ✅ `integration_id` is now the **PRIMARY KEY** (was: `id` UUID)
- ✅ Added `tenant_id` (VARCHAR(8)) with FK to `"denpay-dev".clients.tenant_id`
- ✅ Added `tenant_name` (denormalized for performance)
- ❌ Removed `id` (UUID) column

**Structure**:
```sql
soe.soe_integrations
├── integration_id (VARCHAR(8), PK) ⭐ 8-char from parquet (e.g., "33F91ECD")
├── integration_name (VARCHAR, NOT NULL) -- e.g., "Charsfield"
├── source_table (VARCHAR)
├── tenant_id (VARCHAR(8), FK → "denpay-dev".clients.tenant_id) ⭐
├── tenant_name (VARCHAR)
└── last_synced_at (TIMESTAMP WITH TIME ZONE)
```

**Constraints**:
- Foreign Key: `tenant_id` → `"denpay-dev".clients.tenant_id` (ON DELETE CASCADE)

---

### **Table: `integrations.pms_connections`** (Unified PMS Connections)

**Major Changes**:
- ❌ Removed `client_id` (UUID) column
- ✅ Added `tenant_id` (VARCHAR(8), NOT NULL) with FK to `"denpay-dev".clients.tenant_id`
- ✅ Added `tenant_name` (VARCHAR)
- ✅ Made `integration_id` NOT NULL
- ✅ Added XERO and COMPASS to `pms_type` enum

**Structure**:
```sql
integrations.pms_connections
├── id (UUID, PK)
├── tenant_id (VARCHAR(8), NOT NULL, FK) ⭐ Replaces client_id
├── tenant_name (VARCHAR)
├── practice_id (UUID)
├── pms_type (VARCHAR, NOT NULL) -- SOE, SFD, DENTALLY, CARESTACK, XERO, COMPASS
├── integration_id (VARCHAR(8), NOT NULL) ⭐ References soe.soe_integrations for SOE
├── integration_name (VARCHAR, NOT NULL)
├── data_source (VARCHAR) -- GOLD_LAYER, DIRECT_API, FILE_UPLOAD
├── sync_frequency (VARCHAR) -- REALTIME, HOURLY, DAILY, WEEKLY, MANUAL
├── connection_status (VARCHAR) -- PENDING, TESTING, CONNECTED, ERROR, DISABLED
├── ... (sync flags, timestamps, etc.)
```

**Constraints**:
- Foreign Key: `tenant_id` → `"denpay-dev".clients.tenant_id` (ON DELETE CASCADE)
- CHECK: `pms_type` IN ('SOE', 'SFD', 'DENTALLY', 'CARESTACK', 'COMPASS', 'XERO')
- CHECK: `connection_status` IN ('PENDING', 'TESTING', 'CONNECTED', 'ERROR', 'DISABLED')
- CHECK: `data_source` IN ('GOLD_LAYER', 'DIRECT_API', 'FILE_UPLOAD')
- CHECK: `sync_frequency` IN ('REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MANUAL')

**Indexes**:
- `idx_pms_connections_tenant` ON `tenant_id`
- `idx_pms_connections_integration` ON `integration_id`
- `idx_pms_connections_pms_type` ON `pms_type`

---

### **Table: `integrations.sync_history`** (No Schema Changes)

Structure remains the same. All sync history records continue to reference `pms_connections.id`.

---

### **View: `integrations.v_connection_summary`**

**Changes**:
- ❌ Removed `client_id` column
- ✅ Added `tenant_id` column
- ✅ Added `tenant_name` column

**Structure**:
```sql
CREATE VIEW integrations.v_connection_summary AS
SELECT
    pms.id,
    pms.tenant_id, ⭐
    pms.tenant_name, ⭐
    pms.pms_type,
    pms.integration_id,
    pms.integration_name,
    pms.connection_status,
    pms.last_sync_at,
    pms.last_sync_status,
    pms.created_at,
    COUNT(DISTINCT sp.id) as patient_count,
    COUNT(DISTINCT sa.id) as appointment_count,
    COUNT(DISTINCT spr.id) as provider_count
FROM integrations.pms_connections pms
LEFT JOIN soe.patients sp ON sp.connection_id = pms.id
LEFT JOIN soe.appointments sa ON sa.connection_id = pms.id
LEFT JOIN soe.providers spr ON spr.connection_id = pms.id
GROUP BY pms.id, pms.tenant_id, pms.tenant_name, ...;
```

---

## API Changes (Backend)

### **Endpoint: `GET /api/pms/connections/`**

**Query Parameters Changed**:
```diff
- ?client_id=<uuid>
+ ?tenant_id=<8-char-string>
```

**Response Changed**:
```json
{
  "data": [
    {
      "id": "uuid-...",
-     "client_id": "b40a897d-...",
+     "tenant_id": "0T5SE46E",
+     "tenant_name": "Client Name",
      "pms_type": "SOE",
      "integration_id": "33F91ECD",
      "integration_name": "Charsfield",
      ...
    }
  ]
}
```

---

### **Endpoint: `POST /api/pms/connections/`**

**Request Body Changed**:
```json
{
- "client_id": "b40a897d-4991-4617-af68-f753ed20be51",
+ "tenant_id": "0T5SE46E",
+ "tenant_name": "Client Name",
  "pms_type": "SOE",
+ "integration_id": "33F91ECD",
  "integration_name": "Charsfield",
  "data_source": "GOLD_LAYER",
  "sync_frequency": "DAILY",
  ...
}
```

**Required Fields**:
- ✅ `tenant_id` (required) - 8-char alphanumeric
- ✅ `integration_id` (required) - 8-char alphanumeric
- ✅ `pms_type` (required) - SOE, SFD, DENTALLY, CARESTACK, XERO, COMPASS
- ✅ `integration_name` (required)

---

### **Endpoint: `POST /api/pms/connections/{id}/sync`**

**Changes**:
- ✅ Now runs in **background** (returns immediately)
- ✅ No longer returns sync results directly

**Response**:
```json
{
  "status": "accepted",
  "message": "Sync started in background. Check sync history for progress.",
  "connection_id": "uuid-..."
}
```

**To check sync status**, use:
```
GET /api/pms/connections/{id}
```
Or query `integrations.sync_history` table.

---

### **New PMS Types Added**

The following PMS types are now supported:
- ✅ **XERO** (new)
- ✅ **COMPASS** (new)
- SOE (existing)
- SFD (existing)
- DENTALLY (existing)
- CARESTACK (existing)

---

## Frontend Changes Required (Client Portal)

### **1. Client Selection Flow**

**Current Flow**:
```
User selects client → client_id (UUID) is set
```

**New Flow**:
```
User selects client → tenant_id (8-char) is set ⭐
```

**Action Required**:
- Update client selection to store and use `tenant_id` instead of `client_id`
- Example: When user selects "WorkFin Demo", store `tenant_id: "0T5SE46E"`

---

### **2. Integration List/Filter**

**API Call Change**:
```javascript
// OLD
GET /api/pms/connections/?client_id=b40a897d-4991-4617-af68-f753ed20be51

// NEW ⭐
GET /api/pms/connections/?tenant_id=0T5SE46E
```

---

### **3. Create Integration Form**

**Form Data Change**:
```javascript
// OLD
const formData = {
  client_id: clientId, // UUID
  pms_type: "SOE",
  integration_name: "Charsfield",
  ...
};

// NEW ⭐
const formData = {
  tenant_id: tenantId, // 8-char string (e.g., "0T5SE46E")
  tenant_name: tenantName, // Optional, for display
  pms_type: "SOE",
  integration_id: integrationId, // Required! Get from soe_integrations
  integration_name: "Charsfield",
  ...
};
```

**Important**:
- `integration_id` is **required** for all integrations
- For SOE integrations, get `integration_id` from `GET /api/soe/integrations` endpoint
- The `integration_id` comes from the Gold Layer parquet data (e.g., "33F91ECD" for Charsfield)

---

### **4. Integration Dropdown/Selector**

**For SOE Integrations**:

1. **First, load available integrations**:
   ```javascript
   GET /api/soe/integrations
   ```

   Response:
   ```json
   [
     {
       "integration_id": "33F91ECD",
       "integration_name": "Charsfield",
       "source_table": "all_tables"
     },
     {
       "integration_id": "7FFB5EC9",
       "integration_name": "Rhos Cottage",
       "source_table": "all_tables"
     }
   ]
   ```

2. **Display in dropdown**: Show `integration_name`, but store both `integration_id` and `integration_name`

3. **On submit**: Include both fields in the connection creation request

---

### **5. Sync Button Behavior**

**Old Behavior**:
- Click "Sync" → Wait for completion → Show results

**New Behavior** ⭐:
- Click "Sync" → Returns immediately with "Sync started"
- Show message: "Sync started in background. Check sync history for progress."
- Optionally poll `GET /api/pms/connections/{id}` to check `last_sync_status`

---

### **6. Display Integration Details**

**Response Data Structure Changed**:
```javascript
// Connection object
{
  id: "uuid-...",
  tenant_id: "0T5SE46E", // ⭐ Use this instead of client_id
  tenant_name: "Client Name", // ⭐ New field
  integration_id: "33F91ECD", // ⭐ Now always present
  integration_name: "Charsfield",
  pms_type: "SOE", // ⭐ Can now be XERO or COMPASS too
  connection_status: "CONNECTED",
  ...
}
```

---

## Data Migration Impact

### **Existing Connections**

All existing `pms_connections` records were migrated:
- `client_id` → `tenant_id` (looked up from `"denpay-dev".clients` table)
- For orphaned records (no matching client), `integration_id` was used as fallback for `tenant_id`

**Action Required**: Verify all connections have valid `tenant_id` values.

---

### **Existing SOE Integrations**

The `soe.soe_integrations` table was **dropped and recreated** with new structure.

**Action Required**:
1. Run `POST /api/soe/sync/integrations` to repopulate from Gold Layer
2. Expected result: ~3 integrations (Charsfield, Rhos Cottage, MARD)

---

### **Sync History**

All sync history was **preserved** and continues to work unchanged.

---

## Testing Checklist for Client Portal

### **Pre-Deployment**

- [ ] Update all references from `client_id` to `tenant_id`
- [ ] Update API calls to use new query parameters
- [ ] Update form validation for `integration_id` (required field)
- [ ] Update integration dropdown to load from `/api/soe/integrations`
- [ ] Update sync button to handle background execution
- [ ] Add XERO and COMPASS to PMS type options (if applicable)
- [ ] Test with mock data using 8-char `tenant_id`

### **Post-Deployment**

- [ ] Verify client selection stores `tenant_id` correctly
- [ ] Test listing integrations filtered by `tenant_id`
- [ ] Test creating new SOE integration with `integration_id`
- [ ] Test sync button shows "Sync started" message
- [ ] Verify integration details display correctly
- [ ] Test filtering connections by `pms_type` (including XERO/COMPASS)
- [ ] Verify tenant name displays correctly across all views

---

## SQL Queries for Client Portal Backend

### **Get all integrations for a tenant**:
```sql
SELECT
    id,
    tenant_id,
    tenant_name,
    pms_type,
    integration_id,
    integration_name,
    connection_status,
    last_sync_at,
    last_sync_status
FROM integrations.pms_connections
WHERE tenant_id = '0T5SE46E'
ORDER BY created_at DESC;
```

### **Get available SOE integrations**:
```sql
SELECT
    integration_id,
    integration_name,
    source_table,
    last_synced_at
FROM soe.soe_integrations
ORDER BY integration_name;
```

### **Get tenant summary**:
```sql
SELECT
    c.tenant_id,
    c.legal_trading_name,
    COUNT(DISTINCT pms.id) as total_integrations,
    COUNT(DISTINCT pms.id) FILTER (WHERE pms.pms_type = 'SOE') as soe_count,
    COUNT(DISTINCT pms.id) FILTER (WHERE pms.pms_type = 'XERO') as xero_count,
    COUNT(DISTINCT sp.id) as patient_count,
    COUNT(DISTINCT sa.id) as appointment_count
FROM "denpay-dev".clients c
LEFT JOIN integrations.pms_connections pms ON pms.tenant_id = c.tenant_id
LEFT JOIN soe.patients sp ON sp.connection_id = pms.id
LEFT JOIN soe.appointments sa ON sa.connection_id = pms.id
WHERE c.tenant_id = '0T5SE46E'
GROUP BY c.tenant_id, c.legal_trading_name;
```

### **Check sync history**:
```sql
SELECT
    sh.id,
    sh.sync_type,
    sh.sync_scope,
    sh.status,
    sh.records_processed,
    sh.error_message,
    sh.started_at,
    sh.completed_at,
    pms.integration_name,
    pms.tenant_id
FROM integrations.sync_history sh
JOIN integrations.pms_connections pms ON sh.connection_id = pms.id
WHERE pms.tenant_id = '0T5SE46E'
ORDER BY sh.started_at DESC
LIMIT 10;
```

---

## Rollback Plan

If issues arise, use the rollback script: `Workfin_backend/migrations/rollback_full_migration.sql`

**Warning**: Rollback will:
- Restore `client_id` (UUID) column
- Remove `tenant_id` columns
- Recreate old table structures
- Require re-syncing all data

---

## Support & Documentation

- **Architecture Documentation**: `Workfin_backend/migrations/ARCHITECTURE.md`
- **Migration Script**: `Workfin_backend/migrations/restructure_integrations_clean.sql`
- **Cleanup Script**: `Workfin_backend/migrations/cleanup_after_migration.sql`
- **Rollback Script**: `Workfin_backend/migrations/rollback_full_migration.sql`

---

## Contact

For questions about this migration, contact the backend team or refer to the architecture documentation.

---

**End of Summary**
