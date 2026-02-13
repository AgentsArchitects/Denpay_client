"""
Authentication Middleware and Decorators
Permission checking, role validation, and RLS filtering for protected endpoints
"""
from fastapi import HTTPException, status, Depends
from functools import wraps
from typing import List, Optional, Callable
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from auth_models import User, UserRole
from auth_utils import (
    get_user_permissions,
    check_permission,
    has_role,
    is_workfin_admin,
    is_client_admin,
    get_user_tenant_ids,
    get_user_practice_ids
)

# ============================================================================
# Permission Checking Decorator
# ============================================================================

def require_permission(permission: str):
    """
    Decorator to check if the current user has a specific permission.

    Usage:
        @router.get("/api/users")
        @require_permission("users.read")
        async def get_users(current_user: User = Depends(get_current_user)):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get("current_user")
            session = kwargs.get("session")

            if not current_user or not session:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing authentication dependencies"
                )

            # Get user permissions
            permissions = await get_user_permissions(session, current_user.user_id)

            # Check permission
            if not check_permission(permissions, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permission: {permission}"
                )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


def require_role(role_type: str, tenant_id: Optional[str] = None):
    """
    Decorator to check if the current user has a specific role.

    Usage:
        @router.get("/api/admin/settings")
        @require_role("WORKFIN_ADMIN")
        async def get_admin_settings(current_user: User = Depends(get_current_user)):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get("current_user")
            session = kwargs.get("session")

            if not current_user or not session:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing authentication dependencies"
                )

            # Get user roles
            result = await session.execute(
                select(UserRole).where(
                    and_(
                        UserRole.user_id == current_user.user_id,
                        UserRole.is_active == True
                    )
                )
            )
            user_roles = result.scalars().all()

            # Check role
            if role_type == "CLIENT_ADMIN":
                if not is_client_admin(user_roles, tenant_id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required role: {role_type}"
                    )
            elif role_type == "WORKFIN_ADMIN":
                if not is_workfin_admin(user_roles):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required role: {role_type}"
                    )
            else:
                if not has_role(user_roles, role_type):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required role: {role_type}"
                    )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


def require_any_role(role_types: List[str]):
    """
    Decorator to check if the current user has ANY of the specified roles.

    Usage:
        @router.get("/api/reports")
        @require_any_role(["WORKFIN_ADMIN", "CLIENT_ADMIN", "FINANCE_OPERATIONS"])
        async def get_reports(current_user: User = Depends(get_current_user)):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get("current_user")
            session = kwargs.get("session")

            if not current_user or not session:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing authentication dependencies"
                )

            # Get user roles
            result = await session.execute(
                select(UserRole).where(
                    and_(
                        UserRole.user_id == current_user.user_id,
                        UserRole.is_active == True
                    )
                )
            )
            user_roles = result.scalars().all()

            # Check if user has any of the required roles
            has_any_role = any(has_role(user_roles, role_type) for role_type in role_types)

            if not has_any_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required roles. Need one of: {', '.join(role_types)}"
                )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


# ============================================================================
# RLS (Row Level Security) Helper Functions
# ============================================================================

async def get_user_rls_context(session: AsyncSession, user: User) -> dict:
    """
    Get RLS context for the current user.
    Returns tenant_ids and practice_ids the user has access to.

    Returns:
        {
            "is_workfin_admin": bool,
            "tenant_ids": List[str],  # Empty if Workfin Admin
            "practice_ids": List[str]
        }
    """
    # Get user roles
    result = await session.execute(
        select(UserRole).where(
            and_(
                UserRole.user_id == user.user_id,
                UserRole.is_active == True
            )
        )
    )
    user_roles = result.scalars().all()

    # Check if Workfin Admin
    is_admin = is_workfin_admin(user_roles)

    return {
        "is_workfin_admin": is_admin,
        "tenant_ids": [] if is_admin else get_user_tenant_ids(user_roles),
        "practice_ids": get_user_practice_ids(user_roles)
    }


async def filter_by_rls(
    query,
    model,
    user: User,
    session: AsyncSession,
    tenant_field: str = "tenant_id",
    practice_field: str = "practice_id"
):
    """
    Apply RLS filtering to a SQLAlchemy query.

    Args:
        query: SQLAlchemy query to filter
        model: The model being queried (e.g., PracticeModel, ClinicianModel)
        user: Current user
        session: Database session
        tenant_field: Name of the tenant_id field on the model
        practice_field: Name of the practice_id field on the model

    Returns:
        Filtered query

    Usage:
        query = select(PracticeModel)
        query = await filter_by_rls(query, PracticeModel, current_user, session)
    """
    rls_context = await get_user_rls_context(session, user)

    # Workfin Admin sees everything
    if rls_context["is_workfin_admin"]:
        return query

    # Filter by tenant_ids
    if rls_context["tenant_ids"]:
        tenant_attr = getattr(model, tenant_field, None)
        if tenant_attr is not None:
            query = query.where(tenant_attr.in_(rls_context["tenant_ids"]))

    # Filter by practice_ids (if applicable)
    if rls_context["practice_ids"]:
        practice_attr = getattr(model, practice_field, None)
        if practice_attr is not None:
            query = query.where(practice_attr.in_(rls_context["practice_ids"]))

    return query


def check_rls_access(
    user_roles: List[UserRole],
    tenant_id: Optional[str] = None,
    practice_id: Optional[str] = None
) -> bool:
    """
    Check if user has RLS access to a specific tenant/practice.

    Args:
        user_roles: List of user's active roles
        tenant_id: Tenant ID to check access for
        practice_id: Practice ID to check access for

    Returns:
        True if user has access, False otherwise
    """
    # Workfin Admin has access to everything
    if is_workfin_admin(user_roles):
        return True

    # Check tenant-level access
    if tenant_id:
        tenant_ids = get_user_tenant_ids(user_roles)
        if tenant_ids and tenant_id not in tenant_ids:
            return False

    # Check practice-level access
    if practice_id:
        practice_ids = get_user_practice_ids(user_roles)
        if practice_ids and practice_id not in practice_ids:
            return False

    return True


# ============================================================================
# Dependency: Check RLS Access
# ============================================================================

async def require_rls_access(
    tenant_id: Optional[str] = None,
    practice_id: Optional[str] = None
):
    """
    Dependency to check RLS access for a specific tenant/practice.

    Usage:
        @router.get("/api/practices/{practice_id}")
        async def get_practice(
            practice_id: str,
            current_user: User = Depends(get_current_user),
            session: AsyncSession = Depends(get_db),
            _: None = Depends(lambda: require_rls_access(practice_id=practice_id))
        ):
            ...
    """
    async def check_access(
        current_user: User = Depends(get_current_user),
        session: AsyncSession = Depends(get_db)
    ):
        # Get user roles
        result = await session.execute(
            select(UserRole).where(
                and_(
                    UserRole.user_id == current_user.user_id,
                    UserRole.is_active == True
                )
            )
        )
        user_roles = result.scalars().all()

        # Check access
        if not check_rls_access(user_roles, tenant_id, practice_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient permissions for this resource"
            )

        return None

    return check_access