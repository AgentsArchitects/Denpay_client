from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.compass import CompassDateCreate, CompassDateUpdate, CompassDateResponse
from datetime import datetime, date
import uuid

router = APIRouter()

# Mock database
MOCK_COMPASS_DATES = {
    "1": {
        "id": "1",
        "month": "January 2024",
        "schedule_period": "01/01/2024 - 31/01/2024",
        "adjustment_last_day": date(2024, 1, 25),
        "processing_cut_off_date": date(2024, 1, 28),
        "pay_statement_available": date(2024, 1, 30),
        "pay_date": date(2024, 2, 5),
        "status": "Completed",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
}


@router.get("/dates", response_model=List[CompassDateResponse])
async def get_compass_dates():
    """Get all compass dates"""
    return list(MOCK_COMPASS_DATES.values())


@router.get("/dates/{compass_id}", response_model=CompassDateResponse)
async def get_compass_date(compass_id: str):
    """Get a specific compass date by ID"""
    if compass_id not in MOCK_COMPASS_DATES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compass date not found"
        )
    return MOCK_COMPASS_DATES[compass_id]


@router.post("/dates", response_model=CompassDateResponse, status_code=status.HTTP_201_CREATED)
async def create_compass_date(compass_date: CompassDateCreate):
    """Create a new compass date"""
    new_id = str(uuid.uuid4())
    new_compass_date = {
        "id": new_id,
        **compass_date.model_dump(),
        "status": "Active",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    MOCK_COMPASS_DATES[new_id] = new_compass_date
    return new_compass_date


@router.put("/dates/{compass_id}", response_model=CompassDateResponse)
async def update_compass_date(compass_id: str, compass_date: CompassDateUpdate):
    """Update an existing compass date"""
    if compass_id not in MOCK_COMPASS_DATES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compass date not found"
        )

    updated_compass_date = {
        **MOCK_COMPASS_DATES[compass_id],
        **compass_date.model_dump(exclude_unset=True),
        "updated_at": datetime.now()
    }
    MOCK_COMPASS_DATES[compass_id] = updated_compass_date
    return updated_compass_date


@router.delete("/dates/{compass_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_compass_date(compass_id: str):
    """Delete a compass date"""
    if compass_id not in MOCK_COMPASS_DATES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compass date not found"
        )
    del MOCK_COMPASS_DATES[compass_id]
    return None
