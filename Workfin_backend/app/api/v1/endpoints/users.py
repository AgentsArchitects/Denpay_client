from fastapi import APIRouter, HTTPException, status
from typing import List
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from datetime import datetime
import uuid

router = APIRouter()

# Mock database
MOCK_USERS = {
    "1": {
        "id": "1",
        "full_name": "Ajay Lad",
        "email": "ajay.lad@workfin.com",
        "role": "Admin",
        "status": "Active",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    },
    "2": {
        "id": "2",
        "full_name": "John Doe",
        "email": "john.doe@workfin.com",
        "role": "User",
        "status": "Active",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
}


@router.get("/", response_model=List[UserResponse])
async def get_users():
    """Get all WorkFin users"""
    return list(MOCK_USERS.values())


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get a specific user by ID"""
    if user_id not in MOCK_USERS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return MOCK_USERS[user_id]


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate):
    """Create a new WorkFin user"""
    new_id = str(uuid.uuid4())
    new_user = {
        "id": new_id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "status": "Active",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    MOCK_USERS[new_id] = new_user
    return new_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user: UserUpdate):
    """Update an existing user"""
    if user_id not in MOCK_USERS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    updated_user = {
        **MOCK_USERS[user_id],
        **user.model_dump(exclude_unset=True),
        "updated_at": datetime.now()
    }
    MOCK_USERS[user_id] = updated_user
    return updated_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str):
    """Delete a user"""
    if user_id not in MOCK_USERS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    del MOCK_USERS[user_id]
    return None
