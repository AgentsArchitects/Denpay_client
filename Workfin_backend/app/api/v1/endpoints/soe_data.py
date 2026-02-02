"""
SOE Data API Endpoints
Reads synced SOE data from PostgreSQL (not blob storage)
"""
import uuid as uuid_mod
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.db.pms_models import SOEPatient, SOEAppointment, SOEProvider, SOETreatment
from app.schemas.pms import (
    SOEPatientResponse, SOEAppointmentResponse,
    SOEProviderResponse, SOETreatmentResponse, PaginatedResponse
)

router = APIRouter()


@router.get("/patients/", response_model=PaginatedResponse)
async def get_patients(
    connection_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Search by name"),
    patient_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get patients from PostgreSQL"""
    query = select(SOEPatient)
    count_query = select(func.count(SOEPatient.id))

    if connection_id:
        conn_uuid = uuid_mod.UUID(connection_id)
        query = query.where(SOEPatient.connection_id == conn_uuid)
        count_query = count_query.where(SOEPatient.connection_id == conn_uuid)
    if patient_status:
        query = query.where(SOEPatient.patient_status == patient_status)
        count_query = count_query.where(SOEPatient.patient_status == patient_status)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (SOEPatient.first_name.ilike(search_filter)) |
            (SOEPatient.last_name.ilike(search_filter)) |
            (SOEPatient.external_patient_id.ilike(search_filter))
        )
        count_query = count_query.where(
            (SOEPatient.first_name.ilike(search_filter)) |
            (SOEPatient.last_name.ilike(search_filter)) |
            (SOEPatient.external_patient_id.ilike(search_filter))
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * page_size
    query = query.order_by(SOEPatient.last_name).offset(offset).limit(page_size)
    result = await db.execute(query)
    patients = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        data=[SOEPatientResponse.model_validate(p).model_dump() for p in patients],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/appointments/", response_model=PaginatedResponse)
async def get_appointments(
    connection_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    appointment_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get appointments from PostgreSQL"""
    query = select(SOEAppointment)
    count_query = select(func.count(SOEAppointment.id))

    if connection_id:
        conn_uuid = uuid_mod.UUID(connection_id)
        query = query.where(SOEAppointment.connection_id == conn_uuid)
        count_query = count_query.where(SOEAppointment.connection_id == conn_uuid)
    if date_from:
        query = query.where(SOEAppointment.appointment_date >= date_from)
        count_query = count_query.where(SOEAppointment.appointment_date >= date_from)
    if date_to:
        query = query.where(SOEAppointment.appointment_date <= date_to)
        count_query = count_query.where(SOEAppointment.appointment_date <= date_to)
    if appointment_status:
        query = query.where(SOEAppointment.appointment_status == appointment_status)
        count_query = count_query.where(SOEAppointment.appointment_status == appointment_status)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * page_size
    query = query.order_by(SOEAppointment.appointment_date.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    appointments = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        data=[SOEAppointmentResponse.model_validate(a).model_dump() for a in appointments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/providers/", response_model=PaginatedResponse)
async def get_providers(
    connection_id: Optional[str] = Query(None),
    employment_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get providers from PostgreSQL"""
    query = select(SOEProvider)
    count_query = select(func.count(SOEProvider.id))

    if connection_id:
        conn_uuid = uuid_mod.UUID(connection_id)
        query = query.where(SOEProvider.connection_id == conn_uuid)
        count_query = count_query.where(SOEProvider.connection_id == conn_uuid)
    if employment_status:
        query = query.where(SOEProvider.employment_status == employment_status)
        count_query = count_query.where(SOEProvider.employment_status == employment_status)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * page_size
    query = query.order_by(SOEProvider.last_name).offset(offset).limit(page_size)
    result = await db.execute(query)
    providers = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        data=[SOEProviderResponse.model_validate(p).model_dump() for p in providers],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/treatments/", response_model=PaginatedResponse)
async def get_treatments(
    connection_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get treatments from PostgreSQL"""
    query = select(SOETreatment)
    count_query = select(func.count(SOETreatment.id))

    if connection_id:
        conn_uuid = uuid_mod.UUID(connection_id)
        query = query.where(SOETreatment.connection_id == conn_uuid)
        count_query = count_query.where(SOETreatment.connection_id == conn_uuid)
    if patient_id:
        query = query.where(SOETreatment.patient_id == patient_id)
        count_query = count_query.where(SOETreatment.patient_id == patient_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * page_size
    query = query.order_by(SOETreatment.treatment_date.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    treatments = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return PaginatedResponse(
        data=[SOETreatmentResponse.model_validate(t).model_dump() for t in treatments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
