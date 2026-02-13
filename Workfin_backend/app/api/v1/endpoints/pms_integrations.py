"""
PMS Integration API Endpoints
Connection CRUD, sync triggers, and sync history
"""
import uuid as uuid_mod
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db, AsyncSessionLocal
from app.db.pms_models import PMSConnection, SyncHistory
from app.schemas.pms import (
    PMSConnectionCreate, PMSConnectionUpdate, PMSConnectionResponse,
    PMSSyncResponse, SyncHistoryResponse, SyncStatus, PaginatedResponse
)
from app.services.pms_sync_service import pms_sync_service
from app.services.azure_blob_service import azure_blob_service

router = APIRouter()


def to_uuid(value: str) -> uuid_mod.UUID:
    """Convert string to UUID, raising 400 if invalid"""
    try:
        return uuid_mod.UUID(value)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail=f"Invalid UUID format: {value}")


# ==================
# Connection CRUD
# ==================

@router.get("/connections/", response_model=PaginatedResponse)
async def list_connections(
    tenant_id: Optional[str] = Query(None),
    practice_id: Optional[str] = Query(None),
    integration_type: Optional[str] = Query(None),
    integration_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List integration connections with optional filters"""
    query = select(PMSConnection)
    count_query = select(func.count(PMSConnection.id))

    if tenant_id:
        query = query.where(PMSConnection.tenant_id == tenant_id)
        count_query = count_query.where(PMSConnection.tenant_id == tenant_id)
    if practice_id:
        query = query.where(PMSConnection.practice_id == practice_id)
        count_query = count_query.where(PMSConnection.practice_id == practice_id)
    if integration_type:
        query = query.where(PMSConnection.integration_type == integration_type)
        count_query = count_query.where(PMSConnection.integration_type == integration_type)
    if integration_id:
        query = query.where(PMSConnection.integration_id == integration_id)
        count_query = count_query.where(PMSConnection.integration_id == integration_id)
    if status:
        query = query.where(PMSConnection.connection_status == status)
        count_query = count_query.where(PMSConnection.connection_status == status)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(PMSConnection.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    connections = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        data=[PMSConnectionResponse.model_validate(c).model_dump() for c in connections],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/connections/{connection_id}", response_model=PMSConnectionResponse)
async def get_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a single PMS connection"""
    conn_uuid = to_uuid(connection_id)
    result = await db.execute(
        select(PMSConnection).where(PMSConnection.id == conn_uuid)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    return connection


@router.post("/connections/", response_model=PMSConnectionResponse)
async def create_connection(
    data: PMSConnectionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new integration connection"""
    connection = PMSConnection(
        id=uuid_mod.uuid4(),
        tenant_id=data.tenant_id,
        tenant_name=data.tenant_name,
        practice_id=data.practice_id,
        practice_name=data.practice_name,
        integration_type=data.integration_type.value,
        integration_id=data.integration_id,
        integration_name=data.integration_name,
        xero_tenant_name=data.xero_tenant_name,
        external_practice_id=data.external_practice_id,
        external_site_code=data.external_site_code,
        data_source=data.data_source,
        sync_frequency=data.sync_frequency,
        sync_config=data.sync_config,
        sync_patients=data.sync_patients,
        sync_appointments=data.sync_appointments,
        sync_providers=data.sync_providers,
        sync_treatments=data.sync_treatments,
        sync_billing=data.sync_billing,
        connection_status="CONNECTED",
    )
    db.add(connection)
    await db.commit()
    await db.refresh(connection)
    return connection


@router.put("/connections/{connection_id}", response_model=PMSConnectionResponse)
async def update_connection(
    connection_id: str,
    data: PMSConnectionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a PMS connection"""
    conn_uuid = to_uuid(connection_id)
    result = await db.execute(
        select(PMSConnection).where(PMSConnection.id == conn_uuid)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(connection, field, value)

    connection.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(connection)
    return connection


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a PMS connection (hard delete - allows re-adding with same name)"""
    conn_uuid = to_uuid(connection_id)
    result = await db.execute(
        select(PMSConnection).where(PMSConnection.id == conn_uuid)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Hard delete - remove from database entirely
    await db.delete(connection)
    await db.commit()
    return {"message": "Connection deleted successfully", "id": str(connection.id)}


# ==================
# Test & Sync
# ==================

@router.post("/connections/{connection_id}/test")
async def test_connection(
    connection_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Test blob storage access for a connection"""
    conn_uuid = to_uuid(connection_id)
    result = await db.execute(
        select(PMSConnection).where(PMSConnection.id == conn_uuid)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    try:
        tables = azure_blob_service.get_available_soe_tables()
        return {
            "status": "success",
            "message": f"Connected to Azure Blob Storage. Found {len(tables)} SOE tables.",
            "tables": tables
        }
    except Exception as e:
        return {
            "status": "failed",
            "message": f"Connection test failed: {str(e)}"
        }


async def _run_sync_in_background(connection_id: uuid_mod.UUID, triggered_by: str):
    """Run sync in background with its own DB session"""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(PMSConnection).where(PMSConnection.id == connection_id)
            )
            connection = result.scalar_one_or_none()
            if not connection:
                return
            await pms_sync_service.sync_all(db, connection, triggered_by)
        except Exception as e:
            print(f"Background sync failed for {connection_id}: {e}")


@router.post("/connections/{connection_id}/sync", response_model=dict)
async def sync_connection(
    connection_id: str,
    background_tasks: BackgroundTasks,
    triggered_by: str = Query("manual"),
    db: AsyncSession = Depends(get_db)
):
    """Trigger a full sync for all enabled entities (runs in background)"""
    conn_uuid = to_uuid(connection_id)
    result = await db.execute(
        select(PMSConnection).where(PMSConnection.id == conn_uuid)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    if connection.connection_status == "DISABLED":
        raise HTTPException(status_code=400, detail="Connection is disabled")

    # Run sync in background to avoid Azure gateway timeout
    background_tasks.add_task(_run_sync_in_background, conn_uuid, triggered_by)

    return {
        "status": "accepted",
        "message": "Sync started in background. Check sync history for progress.",
        "connection_id": connection_id
    }


async def _run_entity_sync_in_background(connection_id: uuid_mod.UUID, entity_type: str, triggered_by: str):
    """Run single entity sync in background with its own DB session"""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(PMSConnection).where(PMSConnection.id == connection_id)
            )
            connection = result.scalar_one_or_none()
            if not connection:
                return
            await pms_sync_service.sync_entity(db, connection, entity_type, triggered_by)
        except Exception as e:
            print(f"Background entity sync failed for {connection_id}/{entity_type}: {e}")


@router.post("/connections/{connection_id}/sync/{entity_type}", response_model=dict)
async def sync_entity(
    connection_id: str,
    entity_type: str,
    background_tasks: BackgroundTasks,
    triggered_by: str = Query("manual"),
    db: AsyncSession = Depends(get_db)
):
    """Trigger sync for a specific entity type (runs in background)"""
    valid_entities = ["patients", "appointments", "providers"]
    if entity_type not in valid_entities:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid entity type. Must be one of: {', '.join(valid_entities)}"
        )

    conn_uuid = to_uuid(connection_id)
    result = await db.execute(
        select(PMSConnection).where(PMSConnection.id == conn_uuid)
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    if connection.connection_status == "DISABLED":
        raise HTTPException(status_code=400, detail="Connection is disabled")

    # Run sync in background to avoid Azure gateway timeout
    background_tasks.add_task(_run_entity_sync_in_background, conn_uuid, entity_type, triggered_by)

    return {
        "status": "accepted",
        "message": f"Sync for {entity_type} started in background. Check sync history for progress.",
        "connection_id": connection_id,
        "entity_type": entity_type
    }


# ==================
# Sync History
# ==================

@router.get("/connections/{connection_id}/history", response_model=PaginatedResponse)
async def get_sync_history(
    connection_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get sync history for a connection"""
    conn_uuid = to_uuid(connection_id)

    # Verify connection exists
    conn_result = await db.execute(
        select(PMSConnection).where(PMSConnection.id == conn_uuid)
    )
    if not conn_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Connection not found")

    count_query = select(func.count(SyncHistory.id)).where(
        SyncHistory.connection_id == conn_uuid
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * page_size
    query = (
        select(SyncHistory)
        .where(SyncHistory.connection_id == conn_uuid)
        .order_by(SyncHistory.started_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    records = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        data=[SyncHistoryResponse.model_validate(r).model_dump() for r in records],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
