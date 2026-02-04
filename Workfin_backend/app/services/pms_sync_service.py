"""
PMS Sync Service
Syncs SOE data from Azure Blob Storage (parquet) to PostgreSQL
"""
import math
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select, func
import pandas as pd

from sqlalchemy import text as sa_text
from app.db.pms_models import (
    PMSConnection, SyncHistory,
    SOEPatient, SOEAppointment, SOEProvider, SOETreatment
)
from app.services.azure_blob_service import azure_blob_service


BATCH_SIZE = 50

# Delta Lake metadata columns to detect metadata rows
DELTA_META_COLUMNS = {"txn", "add", "remove", "metaData", "protocol", "commitInfo"}


def clean_value(val):
    """Convert NaN/NaT/Inf to None for DB insertion"""
    if val is None:
        return None
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    if isinstance(val, pd.Timestamp):
        if pd.isna(val):
            return None
        return val.to_pydatetime()
    if pd.isna(val):
        return None
    return val


def safe_str(val) -> Optional[str]:
    """Convert value to string or None"""
    val = clean_value(val)
    if val is None:
        return None
    return str(val)


def safe_int(val) -> Optional[int]:
    """Convert value to int or None"""
    val = clean_value(val)
    if val is None:
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def safe_float(val) -> Optional[float]:
    """Convert value to float or None"""
    val = clean_value(val)
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def safe_bool(val) -> Optional[bool]:
    """Convert value to bool or None"""
    val = clean_value(val)
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    if isinstance(val, str):
        return val.lower() in ("true", "1", "yes", "active")
    return None


def is_delta_metadata_row(row: dict) -> bool:
    """Check if a row is a Delta Lake metadata row"""
    if any(key in row for key in DELTA_META_COLUMNS):
        non_meta_values = [v for k, v in row.items() if k not in DELTA_META_COLUMNS]
        if all(clean_value(v) is None for v in non_meta_values):
            return True
    return False


def row_to_json(row: dict) -> dict:
    """Convert a parquet row to JSON-safe dict for raw_data storage"""
    import numpy as np
    cleaned = {}
    for k, v in row.items():
        v = clean_value(v)
        if v is not None:
            if isinstance(v, datetime):
                cleaned[k] = v.isoformat()
            elif isinstance(v, (np.integer,)):
                cleaned[k] = int(v)
            elif isinstance(v, (np.floating,)):
                cleaned[k] = float(v)
            elif isinstance(v, np.bool_):
                cleaned[k] = bool(v)
            else:
                cleaned[k] = v
    return cleaned


def derive_appointment_status(row: dict) -> Optional[str]:
    """Derive appointment status from multiple parquet columns"""
    cancelled = clean_value(row.get("Cancelled"))
    fta = clean_value(row.get("FTA"))
    appt_cat = safe_str(row.get("apptCat"))

    if cancelled and str(cancelled).lower() in ("true", "1", "yes"):
        return "Cancelled"
    if fta and str(fta).lower() in ("true", "1", "yes"):
        return "FTA"
    return appt_cat


def derive_patient_status(row: dict) -> Optional[str]:
    """Derive patient status from debtor4 columns"""
    w_inactive = clean_value(row.get("wInactive"))
    inactive = clean_value(row.get("Inactive"))

    if w_inactive and str(w_inactive).lower() in ("true", "1", "yes"):
        return "Inactive"
    if inactive and str(inactive).lower() in ("true", "1", "yes"):
        return "Inactive"
    return "Active"


class PMSSyncService:

    async def _resolve_soe_integration_id(self, db: AsyncSession, connection: PMSConnection) -> Optional[str]:
        """Look up the SOE integration_id from soe.soe_integrations using the connection's integration_name.
        Falls back to connection.external_practice_id if set."""
        # If external_practice_id is explicitly set, use it
        if connection.external_practice_id:
            return connection.external_practice_id

        # Look up by integration_name in soe.soe_integrations
        if connection.integration_name:
            try:
                result = await db.execute(
                    sa_text("SELECT integration_id FROM soe.soe_integrations WHERE integration_name = :name LIMIT 1"),
                    {"name": connection.integration_name}
                )
                row = result.fetchone()
                if row:
                    return row[0]
            except Exception:
                pass

        return None

    async def sync_entity(
        self,
        db: AsyncSession,
        connection: PMSConnection,
        entity_type: str,
        triggered_by: str = "manual"
    ) -> dict:
        """Sync a single entity type from blob to postgres"""
        now = datetime.now(timezone.utc)

        # Create sync history record
        sync_record = SyncHistory(
            id=uuid.uuid4(),
            connection_id=connection.id,
            sync_type="MANUAL" if triggered_by == "manual" else "SCHEDULED",
            sync_scope=entity_type,
            status="RUNNING",
            started_at=now,
            triggered_by=triggered_by
        )
        db.add(sync_record)
        await db.commit()

        stats = {
            "records_processed": 0,
            "records_created": 0,
            "records_updated": 0,
            "records_skipped": 0,
            "records_failed": 0,
        }

        try:
            # Map entity type to blob table and sync function
            entity_map = {
                "patients": self._sync_patients,
                "appointments": self._sync_appointments,
                "providers": self._sync_providers,
            }

            sync_fn = entity_map.get(entity_type)
            if not sync_fn:
                raise ValueError(f"Unknown entity type: {entity_type}")

            stats = await sync_fn(db, connection)

            # Update sync history
            completed_at = datetime.now(timezone.utc)
            sync_record.status = "COMPLETED"
            sync_record.records_processed = stats["records_processed"]
            sync_record.records_created = stats["records_created"]
            sync_record.records_updated = stats["records_updated"]
            sync_record.records_skipped = stats["records_skipped"]
            sync_record.records_failed = stats["records_failed"]
            sync_record.completed_at = completed_at
            sync_record.duration_seconds = int((completed_at - now).total_seconds())

            # Update connection status
            connection.last_sync_at = completed_at
            connection.last_sync_status = "COMPLETED"
            connection.last_sync_error = None
            connection.last_sync_records_count = stats["records_processed"]

            await db.commit()

            return {
                "status": "success",
                **stats,
                "duration_seconds": sync_record.duration_seconds
            }

        except Exception as e:
            completed_at = datetime.now(timezone.utc)
            sync_record.status = "FAILED"
            sync_record.error_message = str(e)
            sync_record.completed_at = completed_at
            sync_record.duration_seconds = int((completed_at - now).total_seconds())
            sync_record.records_processed = stats["records_processed"]

            connection.last_sync_at = completed_at
            connection.last_sync_status = "FAILED"
            connection.last_sync_error = str(e)

            await db.commit()
            raise

    async def sync_all(
        self,
        db: AsyncSession,
        connection: PMSConnection,
        triggered_by: str = "manual"
    ) -> dict:
        """Sync all enabled entity types for a connection"""
        results = {}

        entity_flags = {
            "patients": connection.sync_patients,
            "appointments": connection.sync_appointments,
            "providers": connection.sync_providers,
        }

        for entity_type, enabled in entity_flags.items():
            if enabled:
                try:
                    result = await self.sync_entity(db, connection, entity_type, triggered_by)
                    results[entity_type] = result
                except Exception as e:
                    results[entity_type] = {"status": "failed", "error": str(e)}

        return results

    async def _sync_patients(self, db: AsyncSession, connection: PMSConnection) -> dict:
        """Sync patients from vw_DimPatients and debtor4"""
        stats = {"records_processed": 0, "records_created": 0, "records_updated": 0, "records_skipped": 0, "records_failed": 0}
        now = datetime.now(timezone.utc)
        integration_id = await self._resolve_soe_integration_id(db, connection)

        # Step 1: Read vw_DimPatients for base patient data (filtered at read time)
        try:
            dim_df = azure_blob_service.get_soe_data("vw_DimPatients", integration_id=integration_id)
        except Exception:
            dim_df = pd.DataFrame()

        # Step 2: Read debtor4 for enrichment (filtered at read time)
        try:
            debtor_df = azure_blob_service.get_soe_data("debtor4", integration_id=integration_id)
        except Exception:
            debtor_df = pd.DataFrame()

        # Index debtor data by RecordNum for quick lookup
        debtor_lookup = {}
        if not debtor_df.empty and "RecordNum" in debtor_df.columns:
            for _, row in debtor_df.iterrows():
                record_num = safe_str(row.get("RecordNum"))
                if record_num:
                    debtor_lookup[record_num] = row.to_dict()

        # Process vw_DimPatients rows
        batch = []
        for _, row in dim_df.iterrows():
            row_dict = row.to_dict()
            if is_delta_metadata_row(row_dict):
                stats["records_skipped"] += 1
                continue

            ext_id = safe_str(row_dict.get("PatientKey"))
            if not ext_id:
                stats["records_skipped"] += 1
                continue

            stats["records_processed"] += 1

            # Base record from vw_DimPatients
            record = {
                "connection_id": connection.id,
                "external_patient_id": ext_id,
                "last_name": safe_str(row_dict.get("Patient_Name")),
                "patient_type": safe_str(row_dict.get("Patient_Code")),
                "preferred_provider_id": safe_str(row_dict.get("dentistId")),
                "source_system": safe_str(row_dict.get("IntegrationName")),
                "raw_data": row_to_json(row_dict),
                "last_synced_at": now,
            }

            # Enrich from debtor4 if available
            rid_debtor = safe_str(row_dict.get("ridDebtor"))
            debtor_data = debtor_lookup.get(rid_debtor) or debtor_lookup.get(ext_id)
            if debtor_data:
                record["first_name"] = safe_str(debtor_data.get("firstName")) or record.get("first_name")
                record["last_name"] = safe_str(debtor_data.get("lastName")) or record["last_name"]
                record["title"] = safe_str(debtor_data.get("title"))
                record["gender"] = safe_str(debtor_data.get("cGender"))
                record["phone_home"] = safe_str(debtor_data.get("homePhone"))
                record["phone_mobile"] = safe_str(debtor_data.get("mobilePhone"))
                record["phone_work"] = safe_str(debtor_data.get("workPhone"))
                record["address_line1"] = safe_str(debtor_data.get("address1"))
                record["postcode"] = safe_str(debtor_data.get("postCode1"))
                record["nhs_number"] = safe_str(debtor_data.get("NHSNumber"))
                record["patient_status"] = derive_patient_status(debtor_data)
                # Merge debtor data into raw_data
                record["raw_data"] = {**record["raw_data"], "debtor4": row_to_json(debtor_data)}

            batch.append(record)

            if len(batch) >= BATCH_SIZE:
                created, updated = await self._upsert_patients(db, batch)
                stats["records_created"] += created
                stats["records_updated"] += updated
                batch = []

        # Flush remaining
        if batch:
            created, updated = await self._upsert_patients(db, batch)
            stats["records_created"] += created
            stats["records_updated"] += updated

        return stats

    async def _upsert_patients(self, db: AsyncSession, records: list) -> tuple:
        """Upsert patient records, returns (created, updated) counts"""
        created = 0
        updated = 0
        for record in records:
            stmt = insert(SOEPatient).values(
                id=uuid.uuid4(),
                first_synced_at=record["last_synced_at"],
                **record
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["connection_id", "external_patient_id"],
                set_={k: v for k, v in record.items() if k not in ("connection_id", "external_patient_id")},
            )
            result = await db.execute(stmt)
            # xmax=0 means insert, xmax>0 means update (postgres)
            updated += 1  # simplified - count all as processed
        await db.commit()
        return 0, updated  # simplified counting

    async def _sync_appointments(self, db: AsyncSession, connection: PMSConnection) -> dict:
        """Sync appointments from vw_Appointments"""
        stats = {"records_processed": 0, "records_created": 0, "records_updated": 0, "records_skipped": 0, "records_failed": 0}
        now = datetime.now(timezone.utc)
        integration_id = await self._resolve_soe_integration_id(db, connection)

        try:
            df = azure_blob_service.get_soe_data("vw_Appointments", integration_id=integration_id)
        except Exception:
            return stats

        if df.empty:
            return stats

        batch = []
        for _, row in df.iterrows():
            row_dict = row.to_dict()
            if is_delta_metadata_row(row_dict):
                stats["records_skipped"] += 1
                continue

            ext_id = safe_str(row_dict.get("RecordNum"))
            appt_date = clean_value(row_dict.get("AppointmentDate"))
            if not ext_id or not appt_date:
                stats["records_skipped"] += 1
                continue

            stats["records_processed"] += 1

            # Parse start_time from tmTime
            start_time = None
            tm_time = clean_value(row_dict.get("tmTime"))
            if tm_time:
                try:
                    if isinstance(tm_time, str) and ":" in tm_time:
                        parts = tm_time.split(":")
                        from datetime import time as dt_time
                        start_time = dt_time(int(parts[0]), int(parts[1]))
                except (ValueError, IndexError):
                    pass

            record = {
                "connection_id": connection.id,
                "external_appointment_id": ext_id,
                "patient_id": safe_str(row_dict.get("PatientId")),
                "provider_id": safe_str(row_dict.get("ClinicianCode")),
                "appointment_date": appt_date if isinstance(appt_date, datetime) else appt_date,
                "start_time": start_time,
                "duration_minutes": safe_int(row_dict.get("AppointmentLength_minutes")),
                "appointment_type": safe_str(row_dict.get("service")),
                "appointment_status": derive_appointment_status(row_dict),
                "cancellation_reason": safe_str(row_dict.get("cancelReason")),
                "fee_charged": safe_float(row_dict.get("cuDentEstimate")),
                "source_system": safe_str(row_dict.get("IntegrationName")) or connection.integration_name,
                "raw_data": row_to_json(row_dict),
                "last_synced_at": now,
            }

            batch.append(record)

            if len(batch) >= BATCH_SIZE:
                await self._upsert_appointments(db, batch)
                stats["records_updated"] += len(batch)
                batch = []

        if batch:
            await self._upsert_appointments(db, batch)
            stats["records_updated"] += len(batch)

        return stats

    async def _upsert_appointments(self, db: AsyncSession, records: list):
        """Upsert appointment records"""
        for record in records:
            stmt = insert(SOEAppointment).values(
                id=uuid.uuid4(),
                first_synced_at=record["last_synced_at"],
                **record
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["connection_id", "external_appointment_id"],
                set_={k: v for k, v in record.items() if k not in ("connection_id", "external_appointment_id")},
            )
            await db.execute(stmt)
        await db.commit()

    async def _sync_providers(self, db: AsyncSession, connection: PMSConnection) -> dict:
        """Sync providers from vw_providertimes_final"""
        stats = {"records_processed": 0, "records_created": 0, "records_updated": 0, "records_skipped": 0, "records_failed": 0}
        now = datetime.now(timezone.utc)
        integration_id = await self._resolve_soe_integration_id(db, connection)

        try:
            df = azure_blob_service.get_soe_data("vw_providertimes_final", integration_id=integration_id)
        except Exception:
            return stats

        if df.empty:
            return stats

        # Additional filter by SiteId if integration_id column wasn't present
        if "SiteId" in df.columns and integration_id and "integration_id" not in df.columns:
            df = df[df["SiteId"].astype(str) == str(integration_id)]

        batch = []
        for _, row in df.iterrows():
            row_dict = row.to_dict()
            if is_delta_metadata_row(row_dict):
                stats["records_skipped"] += 1
                continue

            ext_id = safe_str(row_dict.get("ProviderCode"))
            if not ext_id:
                stats["records_skipped"] += 1
                continue

            stats["records_processed"] += 1

            record = {
                "connection_id": connection.id,
                "external_provider_id": ext_id,
                "employment_status": "Active" if safe_bool(row_dict.get("Active")) else "Inactive",
                "source_system": safe_str(row_dict.get("Practice")) or connection.integration_name,
                "raw_data": row_to_json(row_dict),
                "last_synced_at": now,
            }

            batch.append(record)

            if len(batch) >= BATCH_SIZE:
                await self._upsert_providers(db, batch)
                stats["records_updated"] += len(batch)
                batch = []

        if batch:
            await self._upsert_providers(db, batch)
            stats["records_updated"] += len(batch)

        return stats

    async def _upsert_providers(self, db: AsyncSession, records: list):
        """Upsert provider records"""
        for record in records:
            stmt = insert(SOEProvider).values(
                id=uuid.uuid4(),
                first_synced_at=record["last_synced_at"],
                **record
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["connection_id", "external_provider_id"],
                set_={k: v for k, v in record.items() if k not in ("connection_id", "external_provider_id")},
            )
            await db.execute(stmt)
        await db.commit()


# Global instance
pms_sync_service = PMSSyncService()
