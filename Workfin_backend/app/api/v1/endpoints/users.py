from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.schemas.user import UserCreate, UserUpdate, UserResponse, WorkfinAdminInviteRequest, InvitationResponse
from app.db.database import get_db
from datetime import datetime
import uuid
import sys
import os
import logging

# Add auth modules to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from auth_utils import create_invitation, get_current_user_from_token
from auth_models import AuthUser, UserRole
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

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


@router.get("/")
async def get_users(
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Get all Workfin Admin users including:
    - Active users (from auth.users)
    - Pending invitations (from auth.invitations where is_used = false)
    """
    try:
        # Extract current user ID from authorization token
        current_user_id = get_current_user_from_token(authorization)

        # Fetch all Workfin Admin users
        result = await db.execute(
            select(AuthUser, UserRole).join(
                UserRole, AuthUser.user_id == UserRole.user_id
            ).where(
                and_(
                    UserRole.role_type == "WORKFIN_ADMIN",
                    UserRole.is_active == True
                )
            )
        )
        users_data = result.all()

        # Fetch pending invitations for Workfin Admins
        from auth_models import Invitation
        result = await db.execute(
            select(Invitation).where(
                and_(
                    Invitation.role_type == "WORKFIN_ADMIN",
                    Invitation.is_used == False
                )
            )
        )
        pending_invitations = result.scalars().all()

        # Format response
        users_list = []

        # Add active users
        active_user_emails = set()
        for user, role in users_data:
            active_user_emails.add(user.email.lower())  # Track active user emails
            users_list.append({
                "id": user.user_id,
                "full_name": f"{user.first_name} {user.last_name}".strip() or "N/A",
                "email": user.email,
                "role": "Admin",
                "status": "Active" if user.is_active else "Inactive",
                "created_at": user.created_at,
                "updated_at": user.updated_at
            })

        # Add pending invitations (but only if user hasn't been created yet)
        for invitation in pending_invitations:
            # Skip if user with this email already exists
            if invitation.email.lower() in active_user_emails:
                continue

            users_list.append({
                "id": invitation.invitation_id,
                "full_name": f"{invitation.first_name} {invitation.last_name}".strip() or "N/A",
                "email": invitation.email,
                "role": "Admin",
                "status": "Invited",
                "created_at": invitation.invited_at,
                "updated_at": invitation.invited_at
            })

        return users_list

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )


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


@router.post("/workfin-admin/invite", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_workfin_admin(
    invitation_data: WorkfinAdminInviteRequest,
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Send invitation to a new Workfin Admin.
    Only existing Workfin Admins can invite other Workfin Admins.
    """
    try:
        # Extract current user ID from authorization token
        current_user_id = get_current_user_from_token(authorization)

        # Check if current user is Workfin Admin
        result = await db.execute(
            select(UserRole).where(
                and_(
                    UserRole.user_id == current_user_id,
                    UserRole.role_type == "WORKFIN_ADMIN",
                    UserRole.is_active == True
                )
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Workfin Admins can invite other Workfin Admins"
            )

        # Check if email already exists
        result = await db.execute(
            select(AuthUser).where(AuthUser.email == invitation_data.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        # Create invitation
        invitation_token = await create_invitation(
            session=db,
            email=invitation_data.email,
            role_type="WORKFIN_ADMIN",
            invited_by_user_id=current_user_id,
            first_name=invitation_data.first_name,
            last_name=invitation_data.last_name,
            tenant_id=None,  # Workfin Admins don't have a specific tenant
            practice_id=None,
            approval_level=None
        )

        # Get current user's name for the invitation email
        result = await db.execute(
            select(AuthUser).where(AuthUser.user_id == current_user_id)
        )
        current_user = result.scalar_one_or_none()
        invited_by_name = f"{current_user.first_name} {current_user.last_name}" if current_user else "WorkFin Team"

        # Send email
        to_name = f"{invitation_data.first_name} {invitation_data.last_name}"
        email_sent = await email_service.send_workfin_admin_invitation(
            to_email=invitation_data.email,
            to_name=to_name,
            invited_by_name=invited_by_name,
            invitation_token=invitation_token
        )

        return InvitationResponse(
            success=True,
            message=f"Invitation sent to {invitation_data.email}",
            invitation_id=invitation_token,
            email_sent=email_sent
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending Workfin Admin invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitation: {str(e)}"
        )
