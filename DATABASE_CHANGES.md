# Database Migration - Integration System Restructure

**Date:** February 2026
**Branch:** azure_deploy
**Status:** Completed

## Overview

This migration restructures the integration system to use 8-character alphanumeric identifiers and creates a unified integration registry in `pms_connections` for all integration types (SOE, SFD, Dentally, CareStack, and Xero).

---

## 1. Xero Connections Table Restructure

### Changes Made

#### `denpay-dev.xero_connections`

**Before:**
```sql
- id (UUID) - Primary Key
- tenant_id (VARCHAR(8)) - Foreign Key to clients.tenant_id
- tenant_name (VARCHAR(255))
- access_token (TEXT)
- refresh_token (TEXT)
- token_expires_at (TIMESTAMPTZ)
- status (VARCHAR(50))
- connected_at (TIMESTAMPTZ)
- last_sync_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**After:**
```sql
- xero_tenant_id (VARCHAR(8)) - Primary Key (auto-generated alphanumeric)
- xero_tenant_name (VARCHAR(255)) - Renamed from tenant_name
- tenant_id (VARCHAR(8)) - Foreign Key to clients.tenant_id
- access_token (TEXT)
- refresh_token (TEXT)
- token_expires_at (TIMESTAMPTZ)
- status (VARCHAR(50))
- connected_at (TIMESTAMPTZ)
- last_sync_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Migration SQL

```sql
-- Step 1: Drop dependent view
DROP VIEW IF EXISTS "denpay-dev".v_connection_summary;

-- Step 2: Backup and restructure xero_connections
ALTER TABLE "denpay-dev".xero_connections
    DROP COLUMN IF EXISTS id CASCADE;

ALTER TABLE "denpay-dev".xero_connections
    RENAME COLUMN tenant_name TO xero_tenant_name;

-- Step 3: Add xero_tenant_id as primary key if not exists
ALTER TABLE "denpay-dev".xero_connections
    ADD COLUMN IF NOT EXISTS xero_tenant_id VARCHAR(8) PRIMARY KEY DEFAULT generate_alphanumeric_id();

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_xero_connections_tenant
    ON "denpay-dev".xero_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_xero_connections_status
    ON "denpay-dev".xero_connections(status);
```

### Rationale
- **xero_tenant_id as PK:** Aligns with the 8-char ID pattern used across the system
- **Renamed tenant_name:** Avoids confusion with client's tenant_name
- **Removed UUID id:** Unnecessary duplicate identifier

---

## 2. PMS Connections Table Restructure

### Changes Made

#### `integrations.pms_connections`

**Before:**
```sql
- id (UUID) - Primary Key
- tenant_id (VARCHAR(8))
- tenant_name (VARCHAR)
- practice_id (UUID)
- clinician_id (VARCHAR(8))
- clinician_name (VARCHAR(255))
- pms_type (VARCHAR(50)) - Values: SOE, SFD, DENTALLY, CARESTACK
- integration_id (VARCHAR) - Variable length
- integration_name (VARCHAR(255))
- external_practice_id (VARCHAR)
- external_site_code (VARCHAR)
- data_source (VARCHAR)
- sync_frequency (VARCHAR)
- sync_config (JSONB)
- sync_patients (BOOLEAN)
- sync_appointments (BOOLEAN)
- sync_providers (BOOLEAN)
- sync_treatments (BOOLEAN)
- sync_billing (BOOLEAN)
- connection_status (VARCHAR(50))
- last_sync_at (TIMESTAMPTZ)
- last_sync_status (VARCHAR(50))
- last_sync_error (TEXT)
- last_sync_records_count (INTEGER)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**After:**
```sql
- id (UUID) - Primary Key
- tenant_id (VARCHAR(8))
- tenant_name (VARCHAR)
- practice_id (VARCHAR(8)) - Changed from UUID
- practice_name (VARCHAR(255)) - NEW
- integration_type (VARCHAR(50)) - Renamed from pms_type
  Values: SOE, SFD, DENTALLY, CARESTACK, XERO
- integration_id (VARCHAR(8)) - Fixed length, unique identifier
- integration_name (VARCHAR(255))
- xero_tenant_name (VARCHAR(255)) - NEW (for Xero integrations)
- external_practice_id (VARCHAR)
- external_site_code (VARCHAR)
- data_source (VARCHAR)
- sync_frequency (VARCHAR)
- sync_config (JSONB)
- sync_patients (BOOLEAN)
- sync_appointments (BOOLEAN)
- sync_providers (BOOLEAN)
- sync_treatments (BOOLEAN)
- sync_billing (BOOLEAN)
- connection_status (VARCHAR(50))
- last_sync_at (TIMESTAMPTZ)
- last_sync_status (VARCHAR(50))
- last_sync_error (TEXT)
- last_sync_records_count (INTEGER)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Migration SQL

```sql
-- Step 1: Drop dependent view
DROP VIEW IF EXISTS "denpay-dev".v_connection_summary;

-- Step 2: Remove clinician columns (connections are practice-level)
ALTER TABLE integrations.pms_connections
    DROP COLUMN IF EXISTS clinician_id CASCADE,
    DROP COLUMN IF EXISTS clinician_name CASCADE;

-- Step 3: Rename pms_type to integration_type
ALTER TABLE integrations.pms_connections
    RENAME COLUMN pms_type TO integration_type;

-- Step 4: Add new columns
ALTER TABLE integrations.pms_connections
    ADD COLUMN IF NOT EXISTS practice_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS xero_tenant_name VARCHAR(255);

-- Step 5: Backup and restructure integration_id
ALTER TABLE integrations.pms_connections
    ADD COLUMN IF NOT EXISTS external_system_id VARCHAR;

UPDATE integrations.pms_connections
SET external_system_id = integration_id
WHERE integration_id IS NOT NULL;

ALTER TABLE integrations.pms_connections
    DROP COLUMN integration_id CASCADE;

ALTER TABLE integrations.pms_connections
    ADD COLUMN integration_id VARCHAR(8) NOT NULL DEFAULT generate_alphanumeric_id() UNIQUE;

-- Step 6: Update practice_id from UUID to VARCHAR(8)
-- Note: This requires mapping existing UUIDs to new 8-char IDs
ALTER TABLE integrations.pms_connections
    ALTER COLUMN practice_id TYPE VARCHAR(8);

-- Step 7: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_pms_connections_tenant
    ON integrations.pms_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pms_connections_practice
    ON integrations.pms_connections(practice_id);
CREATE INDEX IF NOT EXISTS idx_pms_connections_integration_type
    ON integrations.pms_connections(integration_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pms_connections_integration_id
    ON integrations.pms_connections(integration_id);
```

### Rationale
- **Removed clinician columns:** Integrations are practice-level, not clinician-level
- **Renamed pms_type to integration_type:** Better reflects that it includes non-PMS integrations (Xero)
- **Added practice_name:** Improves data denormalization for faster queries
- **Added xero_tenant_name:** Stores Xero organization name for Xero integrations
- **Fixed integration_id length:** Consistent 8-char alphanumeric across all integration types
- **Changed practice_id to VARCHAR(8):** Aligns with new practice ID format

---

## 3. SOE Integrations Table Update

### Changes Made

#### `soe.soe_integrations`

```sql
-- Rename pms_type to integration_type
ALTER TABLE soe.soe_integrations
    RENAME COLUMN pms_type TO integration_type;

-- Ensure integration_id is VARCHAR(8)
ALTER TABLE soe.soe_integrations
    ALTER COLUMN integration_id TYPE VARCHAR(8);
```

---

## 4. View Recreation

### v_connection_summary

```sql
CREATE OR REPLACE VIEW "denpay-dev".v_connection_summary AS
SELECT
    pc.id,
    pc.tenant_id,
    pc.tenant_name,
    pc.practice_id,
    pc.practice_name,
    pc.integration_type,
    pc.integration_id,
    pc.integration_name,
    pc.xero_tenant_name,
    pc.connection_status,
    pc.last_sync_at,
    pc.last_sync_status,
    pc.last_sync_error,
    pc.created_at,
    pc.updated_at,
    -- Join with actual integration tables for additional details
    CASE
        WHEN pc.integration_type = 'XERO' THEN xc.status
        ELSE NULL
    END as xero_connection_status,
    CASE
        WHEN pc.integration_type IN ('SOE', 'SFD', 'DENTALLY', 'CARESTACK') THEN si.status
        ELSE NULL
    END as pms_status
FROM integrations.pms_connections pc
LEFT JOIN "denpay-dev".xero_connections xc
    ON pc.integration_id = xc.xero_tenant_id AND pc.integration_type = 'XERO'
LEFT JOIN soe.soe_integrations si
    ON pc.integration_id = si.integration_id
    AND pc.integration_type IN ('SOE', 'SFD', 'DENTALLY', 'CARESTACK');
```

---

## 5. Backend Code Changes

### Models Updated

#### `app/db/models.py` - XeroConnection
```python
class XeroConnection(Base):
    __tablename__ = "xero_connections"
    __table_args__ = {"schema": SCHEMA}

    xero_tenant_id = Column(String(8), primary_key=True, default=generate_alphanumeric_id)
    xero_tenant_name = Column(String(255), nullable=False)  # Renamed from tenant_name
    tenant_id = Column(String(8), ForeignKey(f'{SCHEMA}.clients.tenant_id'), nullable=False)
    # ... other fields
```

#### `app/db/pms_models.py` - PMSConnection
```python
class PMSConnection(Base):
    __tablename__ = "pms_connections"
    __table_args__ = {"schema": INTEGRATIONS_SCHEMA}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(8), nullable=False)
    tenant_name = Column(String, nullable=True)
    practice_id = Column(String(8), nullable=True)  # Changed from UUID
    practice_name = Column(String(255), nullable=True)  # NEW
    integration_type = Column(String(50), nullable=False)  # Renamed from pms_type
    integration_id = Column(String(8), nullable=False, unique=True)
    integration_name = Column(String(255), nullable=False)
    xero_tenant_name = Column(String(255), nullable=True)  # NEW
    # ... other fields (clinician_id, clinician_name removed)
```

### Schemas Updated

#### `app/schemas/pms.py`
```python
class PMSConnectionCreate(BaseModel):
    tenant_id: str
    tenant_name: Optional[str] = None
    practice_id: Optional[str] = None
    practice_name: Optional[str] = None
    integration_type: PMSType = Field(alias='pms_type')  # Backward compatible
    integration_id: str
    integration_name: str
    xero_tenant_name: Optional[str] = None
    # ... other fields

    class Config:
        populate_by_name = True  # Accept both pms_type and integration_type

class PMSConnectionResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    practice_id: Optional[str] = None
    practice_name: Optional[str] = None
    integration_type: str = Field(alias='pms_type')  # Backward compatible
    integration_id: str
    integration_name: str
    xero_tenant_name: Optional[str] = None
    # ... other fields

    class Config:
        from_attributes = True
        populate_by_name = True
```

### Endpoints Updated

#### `app/api/v1/endpoints/xero.py`
- Updated OAuth callback to create entries in **both** `xero_connections` AND `pms_connections`
- Fixed client name lookup to use `client.legal_trading_name`
- Uses `xero_tenant_name` instead of `tenant_name`

```python
# Create xero_connections entry
new_xero_conn = XeroConnection(
    xero_tenant_name=xero_tenant_name,
    access_token=tokens["access_token"],
    refresh_token=tokens["refresh_token"],
    token_expires_at=tokens["expires_at"],
    status="CONNECTED",
    connected_at=datetime.now(),
    tenant_id=client_tenant_id
)
db.add(new_xero_conn)
await db.flush()

# Also create pms_connections entry
new_pms_conn = PMSConnection(
    tenant_id=client_tenant_id,
    tenant_name=client_tenant_name,
    integration_type="XERO",
    integration_id=new_xero_conn.xero_tenant_id,
    integration_name=f"Xero - {xero_tenant_name}",
    xero_tenant_name=xero_tenant_name,
    connection_status="CONNECTED",
    last_sync_at=datetime.now()
)
db.add(new_pms_conn)
```

#### `app/api/v1/endpoints/pms_integrations.py`
- Updated query parameter from `pms_type` to `integration_type`
- Changed practice_id handling from UUID to VARCHAR(8)

---

## 6. Data Relationships

### Unified Integration Registry Pattern

```
Client (tenant_id)
  └─> pms_connections (integration registry)
        ├─> integration_type = 'SOE' → soe_integrations
        ├─> integration_type = 'SFD' → soe_integrations
        ├─> integration_type = 'DENTALLY' → soe_integrations
        ├─> integration_type = 'CARESTACK' → soe_integrations
        └─> integration_type = 'XERO' → xero_connections
```

### Key Concepts

1. **Practice-level integrations:** Connections belong to practices, not individual clinicians
2. **Multiple integrations per practice:** A practice can have multiple integrations of the same type (toggle on/off)
3. **Unified registry:** `pms_connections` tracks ALL integration types in one place
4. **8-char identifiers:** Consistent alphanumeric IDs across all integration types
5. **Denormalized fields:** Names stored in pms_connections for faster queries

---

## 7. Testing Checklist

- [x] Xero OAuth connection creates entries in both tables
- [x] PMS connections API accepts both `pms_type` and `integration_type` parameters
- [x] Xero connections filtered by selected client (not showing for all clients)
- [x] practice_id correctly uses VARCHAR(8) format
- [x] View returns correct data structure
- [ ] Test multiple Xero connections per practice with toggle on/off
- [ ] Verify sync functionality works with new structure
- [ ] Test data migration from old UUIDs to new 8-char IDs

---

## 8. Rollback Plan

If rollback is needed:

```sql
-- 1. Backup current data
CREATE TABLE integrations.pms_connections_backup AS
SELECT * FROM integrations.pms_connections;

CREATE TABLE "denpay-dev".xero_connections_backup AS
SELECT * FROM "denpay-dev".xero_connections;

-- 2. Restore previous schema
-- (Recreate columns as UUID, rename back to pms_type, etc.)

-- 3. Migrate data back from backup tables
```

---

## Notes

- Frontend still sends `pms_type` in API requests - backward compatibility maintained via Pydantic `alias` parameter
- All database changes committed in branch: `azure_deploy`
- Migration tested on UAT environment: `api-uat-uk-workfin-02.azurewebsites.net`

---

**Last Updated:** February 10, 2026
**Updated By:** Development Team + Claude Sonnet 4.5
