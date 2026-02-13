from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
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


def _format_role_name(role_type: str) -> str:
    """Convert role_type like WORKFIN_ADMIN to 'WorkFin Admin'"""
    role_map = {
        "WORKFIN_ADMIN": "WorkFin Admin",
        "CLIENT_ADMIN": "Client Admin",
        "PRACTICE_MANAGER": "Practice Manager",
        "PRACTICE_MANAGER_DENPAY": "Practice Manager Denpay",
        "FINANCE_OPERATIONS": "Finance Operations",
        "CLINICIAN": "Clinician",
    }
    return role_map.get(role_type, role_type.replace("_", " ").title())


@router.get("/")
async def get_users(
    db: AsyncSession = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Get all users including:
    - Active users of all roles (from auth.users + auth.user_roles)
    - Pending invitations (from auth.invitations where is_used = false)
    - Deduplicates invitations: same email shows only the latest pending invite
    """
    try:
        # Extract current user ID from authorization token
        current_user_id = get_current_user_from_token(authorization)

        from auth_models import Invitation
        from app.db.models import Client, Practice, Clinician

        # Fetch ALL active users (no role filter)
        result = await db.execute(
            select(AuthUser, UserRole).join(
                UserRole, AuthUser.user_id == UserRole.user_id
            ).where(
                UserRole.is_active == True
            )
        )
        users_data = result.all()

        # Fetch ALL pending invitations (no role filter), ordered by newest first
        result = await db.execute(
            select(Invitation).where(
                Invitation.is_used == False
            ).order_by(desc(Invitation.invited_at))
        )
        pending_invitations = result.scalars().all()

        # Collect all unique IDs for batch lookup
        tenant_ids = set()
        practice_ids = set()
        clinician_ids = set()

        for user, role in users_data:
            if role.tenant_id:
                tenant_ids.add(role.tenant_id)
            if role.practice_id:
                practice_ids.add(role.practice_id)
            if role.clinician_id:
                clinician_ids.add(role.clinician_id)

        for invitation in pending_invitations:
            if invitation.tenant_id:
                tenant_ids.add(invitation.tenant_id)
            if invitation.practice_id:
                practice_ids.add(invitation.practice_id)

        # Batch fetch names from lookup tables
        tenant_names = {}
        if tenant_ids:
            result = await db.execute(
                select(Client.tenant_id, Client.legal_trading_name).where(
                    Client.tenant_id.in_(list(tenant_ids))
                )
            )
            tenant_names = {row.tenant_id: row.legal_trading_name for row in result.all()}

        practice_names = {}
        if practice_ids:
            result = await db.execute(
                select(Practice.practice_id, Practice.name).where(
                    Practice.practice_id.in_(list(practice_ids))
                )
            )
            practice_names = {row.practice_id: row.name for row in result.all()}

        clinician_names = {}
        if clinician_ids:
            result = await db.execute(
                select(Clinician.clinician_id, Clinician.first_name, Clinician.last_name).where(
                    Clinician.clinician_id.in_(list(clinician_ids))
                )
            )
            clinician_names = {row.clinician_id: f"{row.first_name} {row.last_name}".strip() for row in result.all()}

        # Format response
        users_list = []

        # Add active users
        active_user_emails = set()
        for user, role in users_data:
            active_user_emails.add(user.email.lower())
            users_list.append({
                "id": user.user_id,
                "full_name": f"{user.first_name} {user.last_name}".strip() or "N/A",
                "email": user.email,
                "role": _format_role_name(role.role_type),
                "tenant_id": role.tenant_id or "-",
                "tenant_name": tenant_names.get(role.tenant_id, "-") if role.tenant_id else "-",
                "practice_id": role.practice_id or "-",
                "practice_name": practice_names.get(role.practice_id, "-") if role.practice_id else "-",
                "clinician_id": role.clinician_id or "-",
                "clinician_name": clinician_names.get(role.clinician_id, "-") if role.clinician_id else "-",
                "status": "Active" if user.is_active else "Inactive",
                "created_at": user.created_at,
                "updated_at": user.updated_at
            })

        # Add pending invitations
        # - Skip if user with this email already accepted (exists in auth.users)
        # - Deduplicate: only show the latest invitation per email
        seen_invitation_emails = set()
        for invitation in pending_invitations:
            email_lower = invitation.email.lower()

            # Skip if user already accepted and is active
            if email_lower in active_user_emails:
                continue

            # Skip duplicate invitations for same email (keep only the latest)
            if email_lower in seen_invitation_emails:
                continue
            seen_invitation_emails.add(email_lower)

            users_list.append({
                "id": invitation.invitation_id,
                "full_name": f"{invitation.first_name} {invitation.last_name}".strip() or "N/A",
                "email": invitation.email,
                "role": _format_role_name(invitation.role_type),
                "tenant_id": invitation.tenant_id or "-",
                "tenant_name": tenant_names.get(invitation.tenant_id, "-") if invitation.tenant_id else "-",
                "practice_id": invitation.practice_id or "-",
                "practice_name": practice_names.get(invitation.practice_id, "-") if invitation.practice_id else "-",
                "clinician_id": getattr(invitation, 'clinician_id', None) or "-",
                "clinician_name": "-",
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
