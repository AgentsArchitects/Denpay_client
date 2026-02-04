# Multi-Tenant Integration Architecture

## Overview
All integrations across the system (SOE, SFD, Dentally, CareStack, Xero, Compass) reference a master `tenant_id` from the `denpay-dev.clients` table.

## Master Tenant Registry

### `denpay-dev.clients` (Master)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Internal UUID (legacy) |
| **`tenant_id`** | VARCHAR(8) | **Master 8-char alphanumeric tenant identifier** (e.g., "0T5SE46E") |
| `legal_trading_name` | VARCHAR | Client name |
| ... | | Other client metadata |

**This is the single source of truth for tenant identity.**

---

## Integration Tables

### 1. `soe.soe_integrations` - SOE Practice Integrations

Stores metadata about individual SOE practice integrations (e.g., different dental practices using SOE).

| Column | Type | Description |
|--------|------|-------------|
| **`integration_id`** (PK) | VARCHAR(8) | 8-char alphanumeric from parquet files (e.g., "33F91ECD" for Charsfield) |
| `integration_name` | VARCHAR | Practice name (e.g., "Charsfield", "Rhos Cottage") |
| `source_table` | VARCHAR | Which table the integration was synced from |
| **`tenant_id`** (FK) | VARCHAR(8) | **References `denpay-dev.clients.tenant_id`** |
| `tenant_name` | VARCHAR | Denormalized client name for performance |
| `last_synced_at` | TIMESTAMP | When this integration was last synced |

**Foreign Key**: `tenant_id` → `denpay-dev.clients.tenant_id`

**Example Data**:
```
integration_id | integration_name | tenant_id  | tenant_name
"33F91ECD"     | "Charsfield"     | "0T5SE46E" | "WorkFin Demo"
"7FFB5EC9"     | "Rhos Cottage"   | "0T5SE46E" | "WorkFin Demo"
"EB3AE06"      | "MARD"           | "0T5SE46E" | "WorkFin Demo"
```

Multiple SOE practices can belong to the same tenant.

---

### 2. `integrations.pms_connections` - Unified PMS Connections

**THE central table for ALL PMS integrations** (SOE, SFD, Dentally, CareStack, Xero, Compass).

| Column | Type | Description |
|--------|------|-------------|
| `id` (PK) | UUID | Connection record UUID |
| **`tenant_id`** (FK) | VARCHAR(8) | **References `denpay-dev.clients.tenant_id`** |
| `tenant_name` | VARCHAR | Denormalized client name |
| **`integration_id`** | VARCHAR(8) | **8-char integration ID** (references `soe.soe_integrations` for SOE) |
| `integration_name` | VARCHAR | Integration name |
| **`pms_type`** | VARCHAR | **SOE, SFD, DENTALLY, CARESTACK, XERO, COMPASS** |
| `data_source` | VARCHAR | GOLD_LAYER, DIRECT_API, FILE_UPLOAD |
| `sync_frequency` | VARCHAR | REALTIME, HOURLY, DAILY, WEEKLY, MANUAL |
| `sync_patients` | BOOLEAN | Sync patients enabled |
| `sync_appointments` | BOOLEAN | Sync appointments enabled |
| `connection_status` | VARCHAR | PENDING, TESTING, CONNECTED, ERROR, DISABLED |
| ... | | Other sync configuration |

**Foreign Key**: `tenant_id` → `denpay-dev.clients.tenant_id`

**Example Data**:
```
id (UUID)      | tenant_id  | integration_id | integration_name | pms_type
uuid-abc-...   | "0T5SE46E" | "33F91ECD"     | "Charsfield"     | "SOE"
uuid-def-...   | "0T5SE46E" | "7FFB5EC9"     | "Rhos Cottage"   | "SOE"
uuid-ghi-...   | "0T5SE46E" | "X1Y2Z3A4"     | "Main Practice"  | "XERO"
uuid-jkl-...   | "AB12CD34" | "P9Q8R7S6"     | "Another Dental" | "DENTALLY"
```

A single tenant can have multiple integrations across different PMS types.

---

### 3. `soe.patients`, `soe.appointments`, `soe.providers` - SOE Data Tables

All SOE data tables reference `connection_id` from `pms_connections`:

| Column | Type | Description |
|--------|------|-------------|
| `id` (PK) | UUID | Record UUID |
| **`connection_id`** (FK) | UUID | **References `integrations.pms_connections.id`** |
| `external_patient_id` | VARCHAR | Patient ID from source system |
| ... | | Entity-specific fields |

**Tenant trace**:
```
soe.patients.connection_id
  → pms_connections.id
  → pms_connections.tenant_id
  → clients.tenant_id
```

---

### 4. `denpay-dev.xero_connections` - Xero Integrations

Should also reference `tenant_id`:

| Column | Type | Description |
|--------|------|-------------|
| `id` (PK) | UUID | Connection UUID |
| **`tenant_id`** (FK) | VARCHAR(8) | **References `denpay-dev.clients.tenant_id`** |
| `tenant_short_code` | VARCHAR | Xero tenant identifier |
| `access_token` | TEXT | OAuth token |
| ... | | Other Xero config |

---

## Data Flow

### 1. Client Onboarding
```
1. Create client in denpay-dev.clients
   → Auto-generate tenant_id (8-char alphanumeric, e.g., "0T5SE46E")

2. Client can have multiple integrations:
   - SOE integrations (stored in soe.soe_integrations + pms_connections)
   - Xero integration (stored in xero_connections + pms_connections)
   - Dentally integration (stored in pms_connections)
   - etc.
```

### 2. SOE Integration Sync
```
1. Scan Gold Layer parquet files
   → Extract distinct integration_id + integration_name pairs

2. Insert/Update soe.soe_integrations
   → Set tenant_id from UI selection or API parameter

3. Create pms_connections record
   → tenant_id from client
   → integration_id from soe_integrations
   → pms_type = 'SOE'

4. Sync patient/appointment/provider data
   → Filter by integration_id from parquet
   → Store with connection_id referencing pms_connections
```

### 3. Querying Data
```sql
-- Get all integrations for a tenant
SELECT
    pms.pms_type,
    pms.integration_name,
    pms.connection_status
FROM integrations.pms_connections pms
WHERE pms.tenant_id = '0T5SE46E';

-- Get all SOE patients for a tenant
SELECT p.*
FROM soe.patients p
JOIN integrations.pms_connections pms ON p.connection_id = pms.id
WHERE pms.tenant_id = '0T5SE46E'
  AND pms.pms_type = 'SOE';

-- Get tenant summary
SELECT
    c.tenant_id,
    c.legal_trading_name,
    COUNT(DISTINCT pms.id) FILTER (WHERE pms.pms_type = 'SOE') as soe_connections,
    COUNT(DISTINCT pms.id) FILTER (WHERE pms.pms_type = 'XERO') as xero_connections,
    COUNT(DISTINCT p.id) as total_patients
FROM "denpay-dev".clients c
LEFT JOIN integrations.pms_connections pms ON pms.tenant_id = c.tenant_id
LEFT JOIN soe.patients p ON p.connection_id = pms.id
WHERE c.tenant_id = '0T5SE46E'
GROUP BY c.tenant_id, c.legal_trading_name;
```

---

## Benefits

1. **True Multi-Tenancy**: All data is traceable back to a single `tenant_id`
2. **Unified View**: One table (`pms_connections`) for all PMS types
3. **Data Isolation**: Foreign key constraints ensure referential integrity
4. **Flexible**: Easy to add new PMS types (just add to enum)
5. **Performance**: Indexed on `tenant_id` for fast tenant-specific queries
6. **Auditing**: Clear ownership of all integration data

---

## Migration Path

1. Run `restructure_integrations.sql` to:
   - Restructure `soe.soe_integrations` with `integration_id` as PK
   - Replace `pms_connections.client_id` (UUID) with `tenant_id` (8-char)
   - Add foreign keys to `denpay-dev.clients.tenant_id`

2. Resync SOE integrations:
   ```
   POST /api/soe/sync/integrations
   ```

3. Update application code to use `tenant_id` instead of `client_id`

4. Test integration creation from UI with new schema
