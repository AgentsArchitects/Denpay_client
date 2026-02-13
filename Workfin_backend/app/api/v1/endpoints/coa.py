from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.coa import CoACategoryCreate, CoACategoryUpdate, CoACategoryResponse
from datetime import datetime
import uuid

router = APIRouter()

# Mock database
MOCK_COA_CATEGORIES = {
    "1": {
        "id": "1",
        "coa_name": "Revenue",
        "category_number": "4000",
        "values": "Income from services",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    },
    "2": {
        "id": "2",
        "coa_name": "Expenses",
        "category_number": "5000",
        "values": "Operating expenses",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
}


@router.get("/categories", response_model=List[CoACategoryResponse])
async def get_coa_categories():
    """Get all Chart of Accounts categories"""
    return list(MOCK_COA_CATEGORIES.values())


@router.get("/categories/{category_id}", response_model=CoACategoryResponse)
async def get_coa_category(category_id: str):
    """Get a specific CoA category by ID"""
    if category_id not in MOCK_COA_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CoA category not found"
        )
    return MOCK_COA_CATEGORIES[category_id]


@router.post("/categories", response_model=CoACategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_coa_category(category: CoACategoryCreate):
    """Create a new CoA category"""
    new_id = str(uuid.uuid4())
    new_category = {
        "id": new_id,
        **category.model_dump(),
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    MOCK_COA_CATEGORIES[new_id] = new_category
    return new_category


@router.put("/categories/{category_id}", response_model=CoACategoryResponse)
async def update_coa_category(category_id: str, category: CoACategoryUpdate):
    """Update an existing CoA category"""
    if category_id not in MOCK_COA_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CoA category not found"
        )

    updated_category = {
        **MOCK_COA_CATEGORIES[category_id],
        **category.model_dump(exclude_unset=True),
        "updated_at": datetime.now()
    }
    MOCK_COA_CATEGORIES[category_id] = updated_category
    return updated_category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coa_category(category_id: str):
    """Delete a CoA category"""
    if category_id not in MOCK_COA_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CoA category not found"
        )
    del MOCK_COA_CATEGORIES[category_id]
    return None
