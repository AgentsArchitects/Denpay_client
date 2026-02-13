"""
Authentication API Routes - REAL DATABASE AUTHENTICATION
Handles login, logout, token refresh, password reset, and user session management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

# Import from the correct locations
import sys
import os
# Add the backend root to path so we can import auth modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from auth_models import AuthUser, UserRole as UserRoleModel, Token, Invitation
from auth_utils import (
    authenticate_user,
    create_user_tokens,
    decode_token,
    hash_password,
    store_refresh_token,
    get_user_permissions,
    verify_password,
    generate_user_id
)
from app.db.database import get_db
from app.schemas.user import AcceptInvitationRequest, AcceptInvitationResponse
import uuid

# Create router
router = APIRouter()
security = HTTPBearer()

# ============================================================================
# Pydantic Models (Request/Response)
# ============================================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserResponse(BaseModel):
    user_id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone_number: Optional[str]
    is_email_verified: bool
    is_active: bool
    last_login_at: Optional[datetime]
    roles: List[Dict[str, Any]]
    permissions: List[str]

# ============================================================================
# Dependency: Get Current User from JWT Token
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_db)
) -> AuthUser:
    """
    Dependency to extract and validate JWT token, returning the current user.
    Usage: current_user: AuthUser = Depends(get_current_user)
    """
    token = credentials.credentials

    # Decode token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token type
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await session.execute(
        select(AuthUser).where(AuthUser.user_id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user

# ============================================================================
# Authentication Routes
# ============================================================================

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_db)
):
    """
    Authenticate user with email and password using REAL database.
    Returns access token, refresh token, and user info.
    """
    # Authenticate user from database
    user = await authenticate_user(session, login_data.email, login_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user roles
    result = await session.execute(
        select(UserRoleModel).where(
            and_(
                UserRoleModel.user_id == user.user_id,
                UserRoleModel.is_active == True
            )
        )
    )
    user_roles = result.scalars().all()

    if not user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no active roles assigned"
        )

    # Only WorkFin Admin users can log in to this portal
    is_workfin_admin = any(role.role_type == "WORKFIN_ADMIN" for role in user_roles)
    if not is_workfin_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Login to Client Portal"
        )

    # Get permissions (pass user_roles to avoid fetching again)
    permissions = await get_user_permissions(session, user_roles=user_roles)

    # Create tokens (synchronous, no DB query)
    tokens = await create_user_tokens(user, user_roles)

    # Store refresh token asynchronously - don't wait
    device_info = {
        "user_agent": request.headers.get("user-agent"),
        "device": "web"
    }
    ip_address = request.client.host if request.client else None

    # Store token without blocking the response
    await store_refresh_token(
        session,
        user.user_id,
        tokens["refresh_token"],
        device_info,
        ip_address
    )

    # Build user response
    user_data = {
        "user_id": user.user_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone_number": user.phone_number,
        "is_email_verified": user.is_email_verified,
        "is_active": user.is_active,
        "last_login_at": user.last_login_at,
        "roles": [
            {
                "role_type": role.role_type,
                "tenant_id": role.tenant_id,
                "practice_id": role.practice_id,
                "clinician_id": role.clinician_id,
                "is_primary_role": role.is_primary_role
            }
            for role in user_roles
        ],
        "permissions": permissions
    }

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": tokens["token_type"],
        "user": user_data
    }


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """
    Logout user by revoking the current refresh token.
    """
    # Revoke all refresh tokens for this user
    result = await session.execute(
        select(Token).where(
            and_(
                Token.user_id == current_user.user_id,
                Token.token_type == "REFRESH",
                Token.is_revoked == False
            )
        )
    )
    tokens = result.scalars().all()

    for token_obj in tokens:
        token_obj.is_revoked = True
        token_obj.revoked_at = datetime.utcnow()

    await session.commit()

    return {
        "message": "Successfully logged out",
        "revoked_tokens": len(tokens)
    }


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    request: Request,
    session: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using a valid refresh token.
    Returns new access token and refresh token.
    """
    # Decode refresh token
    payload = decode_token(refresh_data.refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Verify token type
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    # Check if token exists and is not revoked
    result = await session.execute(
        select(Token).where(
            and_(
                Token.token == refresh_data.refresh_token,
                Token.token_type == "REFRESH",
                Token.is_revoked == False
            )
        )
    )
    token_obj = result.scalar_one_or_none()

    if not token_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or has been revoked"
        )

    # Check if token is expired
    if token_obj.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )

    # Get user
    user_id = payload.get("user_id")
    result = await session.execute(
        select(AuthUser).where(AuthUser.user_id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Get user roles
    result = await session.execute(
        select(UserRoleModel).where(
            and_(
                UserRoleModel.user_id == user.user_id,
                UserRoleModel.is_active == True
            )
        )
    )
    user_roles = result.scalars().all()

    # Mark old refresh token as used
    token_obj.is_used = True
    token_obj.used_at = datetime.utcnow()

    # Create new tokens
    tokens = await create_user_tokens(user, user_roles)

    # Store new refresh token
    device_info = {
        "user_agent": request.headers.get("user-agent"),
        "device": "web"
    }
    ip_address = request.client.host if request.client else None

    await store_refresh_token(
        session,
        user.user_id,
        tokens["refresh_token"],
        device_info,
        ip_address
    )

    await session.commit()

    # Get permissions (pass user_roles to avoid fetching again)
    permissions = await get_user_permissions(session, user_roles=user_roles)

    # Build user response
    user_data = {
        "user_id": user.user_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone_number": user.phone_number,
        "is_email_verified": user.is_email_verified,
        "is_active": user.is_active,
        "last_login_at": user.last_login_at,
        "roles": [
            {
                "role_type": role.role_type,
                "tenant_id": role.tenant_id,
                "practice_id": role.practice_id,
                "clinician_id": role.clinician_id,
                "is_primary_role": role.is_primary_role
            }
            for role in user_roles
        ],
        "permissions": permissions
    }

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": tokens["token_type"],
        "user": user_data
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Get current authenticated user's information.
    """
    # Get user roles
    result = await session.execute(
        select(UserRoleModel).where(
            and_(
                UserRoleModel.user_id == current_user.user_id,
                UserRoleModel.is_active == True
            )
        )
    )
    user_roles = result.scalars().all()

    # Get permissions (pass user_roles to avoid fetching again)
    permissions = await get_user_permissions(session, user_roles=user_roles)

    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone_number": current_user.phone_number,
        "is_email_verified": current_user.is_email_verified,
        "is_active": current_user.is_active,
        "last_login_at": current_user.last_login_at,
        "roles": [
            {
                "role_type": role.role_type,
                "tenant_id": role.tenant_id,
                "practice_id": role.practice_id,
                "clinician_id": role.clinician_id,
                "is_primary_role": role.is_primary_role,
                "approval_level": role.approval_level
            }
            for role in user_roles
        ],
        "permissions": permissions
    }


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Change password for the current authenticated user.
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Hash new password
    new_password_hash = hash_password(password_data.new_password)

    # Update password
    current_user.password_hash = new_password_hash
    current_user.updated_at = datetime.utcnow()

    await session.commit()

    return {
        "message": "Password changed successfully"
    }


@router.post("/accept-invitation", response_model=AcceptInvitationResponse)
async def accept_invitation(
    invitation_data: AcceptInvitationRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Accept invitation and create user account with password.

    This endpoint:
    1. Validates the invitation token
    2. Creates user account in auth.users
    3. Hashes the password
    4. Assigns the user role
    5. Marks invitation as used
    """
    try:
        # Validate password confirmation
        if invitation_data.password != invitation_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match"
            )

        # Find and validate invitation
        result = await session.execute(
            select(Invitation).where(Invitation.invitation_token == invitation_data.token)
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid invitation token"
            )

        # Check if invitation is already used
        if invitation.is_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation has already been used"
            )

        # Check if invitation is expired
        if invitation.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation has expired"
            )

        # Check if user with this email already exists
        result = await session.execute(
            select(AuthUser).where(AuthUser.email == invitation.email)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        # Generate user ID
        user_id = await generate_user_id(session, invitation.role_type)

        # Hash password
        password_hash = hash_password(invitation_data.password)

        # Create user account
        new_user = AuthUser(
            user_id=user_id,
            email=invitation.email,
            password_hash=password_hash,
            first_name=invitation.first_name or "",
            last_name=invitation.last_name or "",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(new_user)

        # Create user role assignment
        user_role = UserRoleModel(
            user_id=user_id,
            role_type=invitation.role_type,
            tenant_id=invitation.tenant_id,
            practice_id=invitation.practice_id,
            approval_level=invitation.approval_level,
            is_primary_role=True,
            is_active=True,
            assigned_by=invitation.invited_by,
            assigned_at=datetime.utcnow()
        )
        session.add(user_role)

        # Mark invitation as used
        invitation.is_used = True
        invitation.accepted_at = datetime.utcnow()
        invitation.created_user_id = user_id

        # Commit all changes
        await session.commit()

        return AcceptInvitationResponse(
            success=True,
            message="Account created successfully! You can now login.",
            user_id=user_id,
            email=invitation.email
        )

    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept invitation: {str(e)}"
        )
