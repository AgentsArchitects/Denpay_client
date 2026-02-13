"""
SOE Data API Endpoints
"""
from typing import Optional
import math
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.services.azure_blob_service import azure_blob_service
from app.db.database import get_db

router = APIRouter()


def clean_nan_values(data: list) -> list:
    """Replace NaN and Inf values with None for JSON serialization"""
    cleaned = []
    for record in data:
        cleaned_record = {}
        for key, value in record.items():
            if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                cleaned_record[key] = None
            else:
                cleaned_record[key] = value
        cleaned.append(cleaned_record)
    return cleaned


@router.get("/tables")
async def get_soe_tables():
    """Get list of available SOE tables"""
    try:
        tables = azure_blob_service.get_available_soe_tables()
        return {"tables": tables, "count": len(tables)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list SOE tables: {str(e)}")


@router.get("/data/{table_name}")
async def get_soe_table_data(
    table_name: str,
    limit: Optional[int] = Query(100, description="Limit number of records"),
    offset: Optional[int] = Query(0, description="Offset for pagination"),
    integration_id: Optional[str] = Query(None, description="Filter by integration_id (e.g., '33F91ECD' for Charsfield)")
):
    """Get data from a specific SOE table with optional integration_id filtering"""
    try:
        # Read data from blob storage (with integration_id filter if provided)
        df = azure_blob_service.get_soe_data(table_name, limit=None, integration_id=integration_id)

        if df.empty:
            return {"data": [], "total": 0, "table": table_name}

        # Apply pagination
        total = len(df)
        df = df.iloc[offset:offset + limit]

        # Convert to dict and clean NaN values
        data = df.to_dict(orient="records")
        data = clean_nan_values(data)

        return {
            "data": data,
            "total": total,
            "table": table_name,
            "limit": limit,
            "offset": offset,
            "integration_id": integration_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get SOE data: {str(e)}")


@router.get("/integrations")
async def get_soe_integrations(db: AsyncSession = Depends(get_db)):
    """Get distinct integration_id and IntegrationName pairs.
    First tries PostgreSQL (fast), falls back to Azure Blob if PostgreSQL is empty."""
    try:
        # Try PostgreSQL first (fast)
        result = await db.execute(
            text('SELECT integration_id, integration_name FROM soe.soe_integrations ORDER BY integration_name')
        )
        rows = result.fetchall()

        if rows:
            integrations = [
                {"integration_id": row[0], "integration_name": row[1]}
                for row in rows
            ]
            return {"integrations": integrations, "source": "postgresql"}

        # Fallback to Azure Blob (slower but works before first sync)
        integrations = azure_blob_service.get_soe_distinct_integrations()
        return {"integrations": integrations, "source": "azure_blob"}
    except Exception as e:
        # If PostgreSQL table doesn't exist yet, fall back to blob
        try:
            integrations = azure_blob_service.get_soe_distinct_integrations()
            return {"integrations": integrations, "source": "azure_blob"}
        except Exception as e2:
            raise HTTPException(status_code=500, detail=f"Failed to get SOE integrations: {str(e2)}")


@router.post("/sync/integrations")
async def sync_integrations_to_postgres(db: AsyncSession = Depends(get_db)):
    """Sync distinct integration_id + IntegrationName from Gold Layer parquet to PostgreSQL.
    This populates the soe.soe_integrations table for fast dropdown lookups.

    IMPORTANT: Ensures unique integration_name - if multiple integration_ids exist for the same name,
    only the first one is kept."""
    try:
        # Read from Azure Blob Gold Layer
        integrations = azure_blob_service.get_soe_distinct_integrations()

        if not integrations:
            return {"status": "warning", "message": "No integrations found in Gold Layer", "synced": 0}

        # Deduplicate by integration_name - keep only first integration_id per name
        unique_integrations = {}
        duplicates_found = []

        for item in integrations:
            name = item["integration_name"]
            if name not in unique_integrations:
                unique_integrations[name] = item
            else:
                # Track duplicates for logging
                duplicates_found.append({
                    "name": name,
                    "kept_id": unique_integrations[name]["integration_id"],
                    "skipped_id": item["integration_id"]
                })

        # Use deduplicated list
        deduplicated = list(unique_integrations.values())

        # Upsert into PostgreSQL using integration_id as PK
        created = 0
        updated = 0
        for item in deduplicated:
            # Check if exists by integration_id
            result = await db.execute(
                text('SELECT integration_id FROM soe.soe_integrations WHERE integration_id = :iid'),
                {"iid": item["integration_id"]}
            )
            existing = result.fetchone()

            if existing:
                await db.execute(
                    text('''UPDATE soe.soe_integrations
                            SET integration_name = :iname, source_table = :src, last_synced_at = NOW()
                            WHERE integration_id = :iid'''),
                    {"iid": item["integration_id"], "iname": item["integration_name"], "src": "all_tables"}
                )
                updated += 1
            else:
                await db.execute(
                    text('''INSERT INTO soe.soe_integrations (integration_id, integration_name, source_table, last_synced_at)
                            VALUES (:iid, :iname, :src, NOW())
                            ON CONFLICT (integration_id) DO UPDATE
                            SET integration_name = EXCLUDED.integration_name,
                                source_table = EXCLUDED.source_table,
                                last_synced_at = NOW()'''),
                    {
                        "iid": item["integration_id"],
                        "iname": item["integration_name"],
                        "src": "all_tables"
                    }
                )
                created += 1

        await db.commit()

        return {
            "status": "success",
            "message": f"Synced {len(deduplicated)} unique integrations to PostgreSQL",
            "created": created,
            "updated": updated,
            "total": len(deduplicated),
            "duplicates_skipped": len(duplicates_found),
            "duplicates": duplicates_found if duplicates_found else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync integrations: {str(e)}")


@router.get("/patients")
async def get_patients(
    limit: Optional[int] = Query(100, description="Limit"),
    offset: Optional[int] = Query(0, description="Offset"),
    integration_id: Optional[str] = Query(None, description="Filter by integration_id")
):
    """Get patients data from vw_DimPatients"""
    return await get_soe_table_data("vw_DimPatients", limit, offset, integration_id)


@router.get("/appointments")
async def get_appointments(
    limit: Optional[int] = Query(100, description="Limit"),
    offset: Optional[int] = Query(0, description="Offset"),
    integration_id: Optional[str] = Query(None, description="Filter by integration_id")
):
    """Get appointments data from vw_Appointments"""
    return await get_soe_table_data("vw_Appointments", limit, offset, integration_id)
