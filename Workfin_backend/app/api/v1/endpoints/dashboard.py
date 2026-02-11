from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, text
from app.db.database import get_db
from app.db.models import Client, Practice, XeroConnection
from app.db.pms_models import PMSConnection
from app.schemas.dashboard import (
    DashboardResponse,
    ClientSummary,
    ClientStats,
    UsersByRole,
    DailyLoginActivity,
    RecentClient,
    PracticeSystemOverview,
    IntegrationStatusItem,
    SystemOverviewSummary,
    InvitationInfo,
)
from datetime import datetime, timedelta
import sys
import os

# Add auth modules to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from auth_models import AuthUser, UserRole, Invitation

router = APIRouter()


@router.get("/stats", response_model=DashboardResponse)
async def get_dashboard_stats(
    tenant_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get aggregated dashboard statistics for the Practice 360 dashboard."""

    # 1. Client list (for dropdown)
    client_query = select(
        Client.tenant_id,
        Client.legal_trading_name,
        Client.status
    ).order_by(Client.legal_trading_name)
    client_result = await db.execute(client_query)
    clients = [
        ClientSummary(
            tenant_id=row.tenant_id,
            legal_trading_name=row.legal_trading_name or "Unknown",
            status=row.status or "Active"
        )
        for row in client_result.fetchall()
    ]

    # 2. Client stats (total, active, inactive)
    stats_query = select(
        func.count(Client.tenant_id).label("total"),
        func.count(case((Client.status == "Active", 1))).label("active"),
        func.count(case((Client.status == "Inactive", 1))).label("inactive"),
    )
    if tenant_id:
        stats_query = stats_query.where(Client.tenant_id == tenant_id)
    stats_result = await db.execute(stats_query)
    stats_row = stats_result.fetchone()
    client_stats = ClientStats(
        total_clients=stats_row.total or 0,
        active_clients=stats_row.active or 0,
        inactive_clients=stats_row.inactive or 0,
    )

    # 3. Users by role (from auth.user_roles)
    role_query = (
        select(
            UserRole.role_type,
            func.count(UserRole.user_role_id).label("count"),
        )
        .where(UserRole.is_active == True)
        .group_by(UserRole.role_type)
        .order_by(func.count(UserRole.user_role_id).desc())
    )
    if tenant_id:
        role_query = role_query.where(UserRole.tenant_id == tenant_id)
    role_result = await db.execute(role_query)
    users_by_role = [
        UsersByRole(
            role=_format_role_name(row.role_type),
            count=row.count,
        )
        for row in role_result.fetchall()
    ]

    # 4. Daily login activity (last 7 days from auth.users.last_login_at)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    login_query = (
        select(
            func.date(AuthUser.last_login_at).label("login_date"),
            func.count(AuthUser.user_id).label("login_count"),
        )
        .where(AuthUser.last_login_at >= seven_days_ago)
        .where(AuthUser.last_login_at.isnot(None))
        .group_by(func.date(AuthUser.last_login_at))
        .order_by(text("login_date"))
    )
    if tenant_id:
        # Join to user_roles to filter by tenant
        login_query = (
            select(
                func.date(AuthUser.last_login_at).label("login_date"),
                func.count(AuthUser.user_id.distinct()).label("login_count"),
            )
            .join(UserRole, UserRole.user_id == AuthUser.user_id)
            .where(AuthUser.last_login_at >= seven_days_ago)
            .where(AuthUser.last_login_at.isnot(None))
            .where(UserRole.tenant_id == tenant_id)
            .group_by(func.date(AuthUser.last_login_at))
            .order_by(text("login_date"))
        )

    login_result = await db.execute(login_query)
    login_rows = login_result.fetchall()

    # Build 7-day array, filling in zeros for missing dates
    daily_login_activity = []
    login_map = {str(row.login_date): row.login_count for row in login_rows}
    for i in range(7):
        day = datetime.utcnow() - timedelta(days=6 - i)
        date_str = day.strftime("%m/%d/%Y")
        date_key = day.strftime("%Y-%m-%d")
        daily_login_activity.append(
            DailyLoginActivity(
                date=date_str,
                count=login_map.get(date_key, 0),
                hour=0,
            )
        )

    # 5. Recent clients (last 10 onboarded, with invitation status)
    recent_query = select(Client).order_by(Client.created_at.desc()).limit(10)
    if tenant_id:
        recent_query = recent_query.where(Client.tenant_id == tenant_id)
    recent_result = await db.execute(recent_query)
    recent_clients_rows = recent_result.scalars().all()

    recent_clients = []
    for c in recent_clients_rows:
        # Check invitation status for this client's contact email
        inv_status = "Active"
        if c.contact_email:
            inv_result = await db.execute(
                select(Invitation)
                .where(Invitation.email == c.contact_email)
                .order_by(Invitation.invited_at.desc())
                .limit(1)
            )
            invitation = inv_result.scalar_one_or_none()
            if invitation:
                if invitation.is_used and invitation.accepted_at:
                    inv_status = "Accepted"
                elif not invitation.is_used and invitation.expires_at and invitation.expires_at < datetime.utcnow():
                    inv_status = "Expired"
                elif not invitation.is_used:
                    inv_status = "Pending Invite"

        contact_name = " ".join(
            filter(None, [c.contact_first_name, c.contact_last_name])
        ) or "N/A"

        recent_clients.append(
            RecentClient(
                key=c.tenant_id,
                name=c.legal_trading_name or "Unknown",
                contact_name=contact_name,
                contact_email=c.contact_email or "N/A",
                status=inv_status,
                created_at=c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else None,
            )
        )

    # 6. Practice system overview + summary
    practice_query = select(Practice).order_by(Practice.name)
    if tenant_id:
        practice_query = practice_query.where(Practice.tenant_id == tenant_id)
    practice_result = await db.execute(practice_query)
    practices = practice_result.scalars().all()

    # Batch-fetch Xero connections and PMS connections for all relevant tenant_ids
    all_tenant_ids = list(set(p.tenant_id for p in practices))

    xero_map = {}
    if all_tenant_ids:
        xero_result = await db.execute(
            select(XeroConnection).where(XeroConnection.tenant_id.in_(all_tenant_ids))
        )
        for xc in xero_result.scalars().all():
            xero_map[xc.tenant_id] = xc

    pms_map = {}
    if all_tenant_ids:
        pms_result = await db.execute(
            select(PMSConnection).where(PMSConnection.tenant_id.in_(all_tenant_ids))
        )
        for pc in pms_result.scalars().all():
            # Store by tenant_id (latest if multiple)
            if pc.tenant_id not in pms_map:
                pms_map[pc.tenant_id] = pc

    # Get user counts per tenant
    user_count_map = {}
    if all_tenant_ids:
        uc_result = await db.execute(
            select(
                UserRole.tenant_id,
                func.count(UserRole.user_id.distinct()).label("user_count"),
            )
            .where(UserRole.tenant_id.in_(all_tenant_ids))
            .where(UserRole.is_active == True)
            .group_by(UserRole.tenant_id)
        )
        for row in uc_result.fetchall():
            user_count_map[row.tenant_id] = row.user_count

    # Get client names for tenant_ids
    client_name_map = {c.tenant_id: c.legal_trading_name for c in clients}

    practice_overview = []
    xero_connected_count = 0
    pms_connected_count = 0

    for p in practices:
        # Xero status
        xc = xero_map.get(p.tenant_id)
        if xc and xc.status == "CONNECTED":
            xero_status = IntegrationStatusItem(
                status="Success",
                time=xc.last_sync_at.strftime("%Y-%m-%d %H:%M") if xc.last_sync_at else "Connected",
            )
            xero_connected_count += 1
        else:
            xero_status = IntegrationStatusItem(status="Fail", time="Not connected")

        # PMS status
        pc = pms_map.get(p.tenant_id)
        if pc and pc.connection_status == "CONNECTED":
            pms_status = IntegrationStatusItem(
                status="Success",
                time=pc.last_sync_at.strftime("%Y-%m-%d %H:%M") if pc.last_sync_at else "Connected",
            )
            pms_connected_count += 1
        else:
            pms_status = IntegrationStatusItem(status="Fail", time="Not connected")

        practice_overview.append(
            PracticeSystemOverview(
                key=p.practice_id,
                name=p.name or "Unknown Practice",
                tenant_name=client_name_map.get(p.tenant_id, "Unknown"),
                users=user_count_map.get(p.tenant_id, 0),
                xero_connection=xero_status,
                pms_connection=pms_status,
            )
        )

    total_practices = len(practices)
    system_overview_summary = SystemOverviewSummary(
        xero_connected_pct=round((xero_connected_count / total_practices * 100) if total_practices > 0 else 0, 1),
        pms_connected_pct=round((pms_connected_count / total_practices * 100) if total_practices > 0 else 0, 1),
        total_practices=total_practices,
    )

    # 7. Invitations (most recent 20)
    inv_query = select(Invitation).order_by(Invitation.invited_at.desc()).limit(20)
    if tenant_id:
        inv_query = inv_query.where(Invitation.tenant_id == tenant_id)
    inv_result = await db.execute(inv_query)
    invitations_rows = inv_result.scalars().all()

    invitations = []
    for inv in invitations_rows:
        if inv.is_used and inv.accepted_at:
            inv_status = "Accepted"
        elif not inv.is_used and inv.expires_at and inv.expires_at < datetime.utcnow():
            inv_status = "Expired"
        else:
            inv_status = "Pending"

        name = " ".join(filter(None, [inv.first_name, inv.last_name])) or inv.email
        invitations.append(
            InvitationInfo(
                key=str(inv.invitation_id),
                email=inv.email,
                name=name,
                role_type=_format_role_name(inv.role_type),
                tenant_id=inv.tenant_id,
                status=inv_status,
                invited_at=inv.invited_at.strftime("%Y-%m-%d %H:%M") if inv.invited_at else None,
                expires_at=inv.expires_at.strftime("%Y-%m-%d %H:%M") if inv.expires_at else None,
            )
        )

    return DashboardResponse(
        clients=clients,
        client_stats=client_stats,
        users_by_role=users_by_role,
        daily_login_activity=daily_login_activity,
        recent_clients=recent_clients,
        practice_system_overview=practice_overview,
        system_overview_summary=system_overview_summary,
        invitations=invitations,
    )


def _format_role_name(role_type: str) -> str:
    """Convert WORKFIN_ADMIN to WorkFin Admin, etc."""
    mapping = {
        "WORKFIN_ADMIN": "WorkFin Admin",
        "CLIENT_ADMIN": "Client Admin",
        "PRACTICE_MANAGER": "Practice Manager",
        "PRACTICE_MANAGER_DENPAY": "PM Denpay",
        "DENPAY_ADMIN": "Denpay Admin",
        "OPERATIONS_MANAGER": "Operations",
        "FINANCE_OPERATIONS": "Finance",
        "HR_OPERATIONS": "HR",
    }
    return mapping.get(role_type, role_type.replace("_", " ").title() if role_type else "Unknown")
