"""
Authentication Utility Functions
Helper functions for user authentication, JWT tokens, password hashing, etc.
"""
import bcrypt
import jwt
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, select
from auth_models import AuthUser, UserRole, Token, Invitation, RoleType, TokenType
import os
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

# BCrypt configuration - 10 rounds provides good security with faster performance
BCRYPT_ROUNDS = 10

# ============================================================================
# Password Hashing Functions
# ============================================================================

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt with optimized rounds for performance.
    Returns the hashed password as a string.
    """
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    Returns True if the password matches, False otherwise.
    """
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


# ============================================================================
# JWT Token Functions
# ============================================================================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary containing user data (user_id, email, roles, etc.)
        expires_delta: Optional custom expiration time

    Returns:
        JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT refresh token.

    Args:
        data: Dictionary containing user data (user_id, email)

    Returns:
        JWT token string
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.JWTError:
        return None  # Invalid token


# ============================================================================
# User ID Generation Functions
# ============================================================================

async def generate_user_id(session: Session, role_type: str) -> str:
    """
    Generate a unique user_id based on role type using database sequences.
    Format: WA000001, CA000002, PM000003, etc.

    Args:
        session: Database session
        role_type: Role type (e.g., 'WORKFIN_ADMIN', 'CLIENT_ADMIN')

    Returns:
        Generated user_id string (8 characters)
    """
    # Use the database function to generate ID
    result = await session.execute(
        text("SELECT auth.generate_user_id(:role_type)"),
        {"role_type": role_type}
    )
    user_id = result.scalar()
    return user_id


# ============================================================================
# Token Management Functions
# ============================================================================

def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token.
    Used for password reset, email verification, etc.

    Args:
        length: Length of the token in bytes (default 32)

    Returns:
        Secure token string (hex format)
    """
    return secrets.token_urlsafe(length)


async def create_invitation_token(
    session: Session,
    email: str,
    role_type: str,
    invited_by: str,
    tenant_id: Optional[str] = None,
    practice_id: Optional[str] = None,
    approval_level: Optional[str] = None
) -> Invitation:
    """
    Create a new invitation for a user.

    Args:
        session: Database session
        email: Email address to invite
        role_type: Role to assign
        invited_by: User ID of the inviter
        tenant_id: Optional tenant scope
        practice_id: Optional practice scope
        approval_level: Optional approval level

    Returns:
        Created Invitation object
    """
    invitation_token = generate_secure_token()
    expires_at = datetime.utcnow() + timedelta(hours=24)  # 24 hours

    invitation = Invitation(
        email=email,
        invitation_token=invitation_token,
        role_type=role_type,
        tenant_id=tenant_id,
        practice_id=practice_id,
        approval_level=approval_level,
        invited_by=invited_by,
        invited_at=datetime.utcnow(),
        expires_at=expires_at,
        is_used=False
    )

    session.add(invitation)
    await session.commit()
    await session.refresh(invitation)

    return invitation


async def store_refresh_token(
    session: Session,
    user_id: str,
    token: str,
    device_info: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> Token:
    """
    Store a refresh token in the database.

    Args:
        session: Database session
        user_id: User ID
        token: JWT refresh token
        device_info: Optional device information
        ip_address: Optional IP address

    Returns:
        Created Token object
    """
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    token_obj = Token(
        user_id=user_id,
        token=token,
        token_type=TokenType.REFRESH.value,
        device_info=device_info,
        ip_address=ip_address,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
        is_used=False,
        is_revoked=False
    )

    session.add(token_obj)
    # Commit deferred to endpoint level for better performance

    return token_obj


async def revoke_token(session: Session, token: str) -> bool:
    """
    Revoke a token (mark as revoked).

    Args:
        session: Database session
        token: Token string to revoke

    Returns:
        True if token was revoked, False if not found
    """
    result = await session.execute(
        select(Token).where(Token.token == token)
    )
    token_obj = result.scalar_one_or_none()

    if token_obj:
        token_obj.is_revoked = True
        token_obj.revoked_at = datetime.utcnow()
        await session.commit()
        return True

    return False


# ============================================================================
# Authentication Functions
# ============================================================================

async def authenticate_user(session: Session, email: str, password: str) -> Optional[AuthUser]:
    """
    Authenticate a user with email and password.

    Args:
        session: Database session
        email: User email
        password: Plain text password

    Returns:
        AuthUser object if authentication successful, None otherwise
    """
    result = await session.execute(
        select(AuthUser).where(AuthUser.email == email)
    )
    user = result.scalar_one_or_none()

    if not user:
        return None

    if not user.is_active:
        return None

    if not user.password_hash:
        return None  # OAuth user, can't login with password

    if not verify_password(password, user.password_hash):
        # Increment failed login attempts (commit deferred to avoid latency)
        user.failed_login_attempts += 1
        return None

    # Reset failed login attempts and update last login (commit deferred)
    user.failed_login_attempts = 0
    user.last_login_at = datetime.utcnow()
    # Note: Changes will be committed by the calling function/endpoint

    return user


async def get_user_permissions(session: Session, user_id: str = None, user_roles: list[UserRole] = None) -> list[str]:
    """
    Get all permissions for a user based on their roles.

    Args:
        session: Database session
        user_id: User ID (optional if user_roles provided)
        user_roles: List of UserRole objects (optional, fetched if not provided)

    Returns:
        List of permission names (e.g., ['users.create', 'practices.read'])
    """
    # If roles not provided, fetch them
    if user_roles is None:
        if user_id is None:
            return []
        result = await session.execute(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.is_active == True
            )
        )
        user_roles = result.scalars().all()

    if not user_roles:
        return []

    role_types = [role.role_type for role in user_roles]

    # Get permissions for these roles
    from auth_models import RolePermission
    result = await session.execute(
        select(RolePermission.permission_name).where(
            RolePermission.role_type.in_(role_types)
        ).distinct()
    )
    permissions = result.scalars().all()

    return list(permissions)


async def create_user_tokens(user: AuthUser, user_roles: list[UserRole]) -> Dict[str, str]:
    """
    Create access and refresh tokens for a user.

    Args:
        user: AuthUser object
        user_roles: List of user's roles

    Returns:
        Dictionary with access_token and refresh_token
    """
    # Prepare token data
    token_data = {
        "user_id": user.user_id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "roles": [
            {
                "role_type": role.role_type,
                "tenant_id": role.tenant_id,
                "practice_id": role.practice_id,
                "is_primary": role.is_primary_role
            }
            for role in user_roles if role.is_active
        ]
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"user_id": user.user_id, "email": user.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# ============================================================================
# Authorization Functions
# ============================================================================

def check_permission(user_permissions: list[str], required_permission: str) -> bool:
    """
    Check if user has a required permission.

    Args:
        user_permissions: List of user's permissions
        required_permission: Required permission to check

    Returns:
        True if user has permission, False otherwise
    """
    return required_permission in user_permissions


def has_role(user_roles: list[UserRole], role_type: str) -> bool:
    """
    Check if user has a specific role.

    Args:
        user_roles: List of user's roles
        role_type: Role type to check

    Returns:
        True if user has role, False otherwise
    """
    return any(role.role_type == role_type and role.is_active for role in user_roles)


def is_workfin_admin(user_roles: list[UserRole]) -> bool:
    """Check if user is a Workfin Admin"""
    return has_role(user_roles, RoleType.WORKFIN_ADMIN.value)


def is_client_admin(user_roles: list[UserRole], tenant_id: Optional[str] = None) -> bool:
    """
    Check if user is a Client Admin.
    If tenant_id provided, checks for specific client.
    """
    for role in user_roles:
        if role.role_type == RoleType.CLIENT_ADMIN.value and role.is_active:
            if tenant_id is None or role.tenant_id == tenant_id:
                return True
    return False


# ============================================================================
# RLS Helper Functions
# ============================================================================

def get_user_tenant_ids(user_roles: list[UserRole]) -> list[str]:
    """
    Get all tenant IDs user has access to.
    Returns empty list if user is Workfin Admin (has access to all).
    """
    if is_workfin_admin(user_roles):
        return []  # Access to all tenants

    tenant_ids = set()
    for role in user_roles:
        if role.is_active and role.tenant_id:
            tenant_ids.add(role.tenant_id)

    return list(tenant_ids)


def get_user_practice_ids(user_roles: list[UserRole]) -> list[str]:
    """
    Get all practice IDs user has access to.
    Returns empty list if user has client-level or platform-wide access.
    """
    practice_ids = set()
    for role in user_roles:
        if role.is_active and role.practice_id:
            practice_ids.add(role.practice_id)

    return list(practice_ids)


async def create_invitation(
    session: Session,
    email: str,
    role_type: str,
    invited_by_user_id: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    tenant_id: Optional[str] = None,
    practice_id: Optional[str] = None,
    approval_level: Optional[str] = None
) -> str:
    """
    Create an invitation record and return the invitation token.

    Args:
        session: Database session
        email: Email address to send invitation to
        role_type: Role to assign (e.g., CLIENT_ADMIN, PRACTICE_MANAGER_DENPAY)
        invited_by_user_id: User ID of person sending invite
        tenant_id: Tenant ID if applicable
        practice_id: Practice ID if applicable
        approval_level: Approval level if applicable

    Returns:
        Invitation token string
    """
    import secrets
    from auth_models import Invitation

    # Generate secure invitation token
    invitation_token = secrets.token_urlsafe(32)

    # Create invitation expiry (24 hours from now)
    expires_at = datetime.utcnow() + timedelta(hours=24)

    # Create invitation record
    invitation = Invitation(
        email=email,
        invitation_token=invitation_token,
        first_name=first_name,
        last_name=last_name,
        role_type=role_type,
        tenant_id=tenant_id,
        practice_id=practice_id,
        approval_level=approval_level,
        invited_by=invited_by_user_id,
        invited_at=datetime.utcnow(),
        expires_at=expires_at,
        is_used=False
    )

    session.add(invitation)
    # Note: Caller should commit

    return invitation_token


# ============================================================================
# FastAPI Dependency Functions
# ============================================================================

def get_current_user_from_token(authorization: str) -> str:
    """
    Extract user ID from JWT authorization token.

    This is meant to be used with FastAPI's dependency injection where the
    authorization header is provided.

    Args:
        authorization: Authorization header value (Bearer token)

    Returns:
        User ID string

    Raises:
        HTTPException: If token is missing or invalid
    """
    from fastapi import HTTPException

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )

    # Extract token from "Bearer <token>" format
    try:
        parts = authorization.split()
        if len(parts) != 2:
            raise ValueError("Invalid format")
        scheme, token = parts
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication scheme"
            )
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format"
        )

    # Decode token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    # Extract user_id
    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload"
        )

    return user_id