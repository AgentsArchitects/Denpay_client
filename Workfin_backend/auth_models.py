"""
Authentication and Authorization Models for RLS (Row Level Security)
Models for auth schema: users, user_roles, invitations, tokens, role_permissions
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, Enum as SQLEnum, TIMESTAMP, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base
import enum

# Schema name for auth tables
AUTH_SCHEMA = "auth"

# ============================================================================
# Enums
# ============================================================================

class RoleType(str, enum.Enum):
    """User role types"""
    WORKFIN_ADMIN = "WORKFIN_ADMIN"
    CLIENT_ADMIN = "CLIENT_ADMIN"
    PRACTICE_MANAGER = "PRACTICE_MANAGER"
    PRACTICE_MANAGER_DENPAY = "PRACTICE_MANAGER_DENPAY"
    DENPAY_ADMIN = "DENPAY_ADMIN"
    OPERATIONS_MANAGER = "OPERATIONS_MANAGER"
    FINANCE_OPERATIONS = "FINANCE_OPERATIONS"
    HR_OPERATIONS = "HR_OPERATIONS"


class TokenType(str, enum.Enum):
    """Token types for various authentication flows"""
    REFRESH = "REFRESH"
    PASSWORD_RESET = "PASSWORD_RESET"
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION"
    MFA_TOKEN = "MFA_TOKEN"


class ApprovalLevel(str, enum.Enum):
    """Approval levels for workflows"""
    CL1 = "CL1"
    CL2 = "CL2"
    CL3 = "CL3"


# ============================================================================
# Model: User
# ============================================================================

class AuthUser(Base):
    """
    Main user table with OAuth support and password authentication.
    user_id format: WA000001, CA000002, PM000003, etc.
    """
    __tablename__ = "users"
    __table_args__ = {"schema": AUTH_SCHEMA}

    # Primary Key - 8 character VARCHAR with role prefix
    user_id = Column(String(8), primary_key=True, index=True)

    # Authentication fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # NULL if using OAuth

    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # 'MICROSOFT', 'GOOGLE', or NULL
    oauth_subject_id = Column(String(255), nullable=True)  # OAuth unique ID

    # Personal information
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)

    # Account status
    is_email_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Login tracking
    last_login_at = Column(TIMESTAMP, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)

    # Audit fields
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    created_by = Column(String(8), ForeignKey(f"{AUTH_SCHEMA}.users.user_id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    roles = relationship("UserRole", foreign_keys="UserRole.user_id", back_populates="user", cascade="all, delete-orphan")
    tokens = relationship("Token", back_populates="user", cascade="all, delete-orphan")
    invitations_sent = relationship("Invitation", foreign_keys="Invitation.invited_by", back_populates="inviter")
    invitations_accepted = relationship("Invitation", foreign_keys="Invitation.created_user_id", back_populates="created_user")

    def __repr__(self):
        return f"<AuthUser(user_id='{self.user_id}', email='{self.email}', name='{self.first_name} {self.last_name}')>"


# ============================================================================
# Model: UserRole
# ============================================================================

class UserRole(Base):
    """
    Assigns roles to users with RLS scope (tenant, practice, clinician).
    This table determines what data a user can access via Row Level Security.
    """
    __tablename__ = "user_roles"
    __table_args__ = {"schema": AUTH_SCHEMA}

    user_role_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))

    # User reference
    user_id = Column(String(8), ForeignKey(f"{AUTH_SCHEMA}.users.user_id", ondelete="CASCADE"), nullable=False, index=True)

    # Role definition
    role_type = Column(String(50), nullable=False, index=True)

    # RLS Scope: determines what data the user can access
    tenant_id = Column(String(8), nullable=True, index=True)  # NULL = platform-wide
    practice_id = Column(String(8), nullable=True, index=True)  # NULL = client-level
    clinician_id = Column(String(8), nullable=True, index=True)  # NULL = not clinician-specific

    # Additional metadata
    approval_level = Column(String(10), nullable=True)  # CL1, CL2, CL3
    is_primary_role = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Audit fields
    assigned_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    assigned_by = Column(String(8), ForeignKey(f"{AUTH_SCHEMA}.users.user_id", ondelete="RESTRICT"), nullable=False)

    # Relationships
    user = relationship("AuthUser", back_populates="roles", foreign_keys=[user_id])
    assigner = relationship("AuthUser", foreign_keys=[assigned_by])

    def __repr__(self):
        return f"<UserRole(user_id='{self.user_id}', role='{self.role_type}', tenant='{self.tenant_id}')>"


# ============================================================================
# Model: Invitation
# ============================================================================

class Invitation(Base):
    """
    Tracks pending user invitations sent via email.
    Invitations expire after 7 days.
    """
    __tablename__ = "invitations"
    __table_args__ = {"schema": AUTH_SCHEMA}

    invitation_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))

    # Invitation details
    email = Column(String(255), nullable=False, index=True)
    invitation_token = Column(String(500), unique=True, nullable=False, index=True)

    # Personal information
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)

    # Role assignment for invited user
    role_type = Column(String(50), nullable=False)
    tenant_id = Column(String(8), nullable=True, index=True)
    practice_id = Column(String(8), nullable=True)
    approval_level = Column(String(10), nullable=True)

    # Invitation metadata
    invited_by = Column(String(8), ForeignKey(f"{AUTH_SCHEMA}.users.user_id", ondelete="CASCADE"), nullable=False)
    invited_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    expires_at = Column(TIMESTAMP, nullable=False)  # Default 7 days from creation

    # Status tracking
    is_used = Column(Boolean, default=False, nullable=False, index=True)
    accepted_at = Column(TIMESTAMP, nullable=True)
    created_user_id = Column(String(8), ForeignKey(f"{AUTH_SCHEMA}.users.user_id", ondelete="SET NULL"), nullable=True)

    # Relationships
    inviter = relationship("AuthUser", foreign_keys=[invited_by], back_populates="invitations_sent")
    created_user = relationship("AuthUser", foreign_keys=[created_user_id], back_populates="invitations_accepted")

    def __repr__(self):
        return f"<Invitation(email='{self.email}', role='{self.role_type}', used={self.is_used})>"


# ============================================================================
# Model: Token
# ============================================================================

class Token(Base):
    """
    Unified token storage for all token types:
    - REFRESH: JWT refresh tokens (7 days)
    - PASSWORD_RESET: Password reset tokens (1 hour)
    - EMAIL_VERIFICATION: Email verification tokens (24 hours)
    - MFA_TOKEN: Multi-factor auth tokens (5 minutes)
    """
    __tablename__ = "tokens"
    __table_args__ = {"schema": AUTH_SCHEMA}

    token_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))

    # Token ownership
    user_id = Column(String(8), ForeignKey(f"{AUTH_SCHEMA}.users.user_id", ondelete="CASCADE"), nullable=False, index=True)

    # Token details
    token = Column(String(500), unique=True, nullable=False, index=True)
    token_type = Column(String(50), nullable=False, index=True)

    # Additional metadata
    device_info = Column(JSONB, nullable=True)  # Browser/device info for refresh tokens
    ip_address = Column(String(45), nullable=True)

    # Timestamps
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    expires_at = Column(TIMESTAMP, nullable=False, index=True)

    # Status tracking
    is_used = Column(Boolean, default=False, nullable=False, index=True)
    used_at = Column(TIMESTAMP, nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False, index=True)
    revoked_at = Column(TIMESTAMP, nullable=True)

    # Relationships
    user = relationship("AuthUser", back_populates="tokens")

    def __repr__(self):
        return f"<Token(type='{self.token_type}', user='{self.user_id}', expired={self.expires_at < datetime.utcnow()})>"


# ============================================================================
# Model: RolePermission
# ============================================================================

class RolePermission(Base):
    """
    Maps roles to specific permissions.
    Defines what each role can do (e.g., WORKFIN_ADMIN can users.create).
    Permission format: resource.action (e.g., 'users.create', 'practices.read')
    """
    __tablename__ = "role_permissions"
    __table_args__ = {"schema": AUTH_SCHEMA}

    role_permission_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))

    # Role and permission mapping
    role_type = Column(String(50), nullable=False, index=True)
    permission_name = Column(String(100), nullable=False, index=True)
    permission_category = Column(String(50), nullable=True, index=True)  # USER_MANAGEMENT, REPORTS, etc.

    # Permission description
    description = Column(Text, nullable=True)

    # Audit fields
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    created_by = Column(String(8), ForeignKey(f"{AUTH_SCHEMA}.users.user_id", ondelete="SET NULL"), nullable=True)

    # Relationships
    creator = relationship("AuthUser", foreign_keys=[created_by])

    def __repr__(self):
        return f"<RolePermission(role='{self.role_type}', permission='{self.permission_name}')>"