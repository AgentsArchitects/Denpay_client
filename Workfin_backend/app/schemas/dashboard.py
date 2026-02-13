from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ClientSummary(BaseModel):
    tenant_id: str
    legal_trading_name: str
    status: str


class ClientStats(BaseModel):
    total_clients: int
    active_clients: int
    inactive_clients: int


class UsersByRole(BaseModel):
    role: str
    count: int


class DailyLoginActivity(BaseModel):
    date: str
    count: int
    hour: int


class RecentClient(BaseModel):
    key: str
    name: str
    contact_name: str
    contact_email: str
    status: str
    created_at: Optional[str] = None


class IntegrationStatusItem(BaseModel):
    status: str
    time: str


class PracticeSystemOverview(BaseModel):
    key: str
    name: str
    tenant_name: str
    users: int
    xero_connection: IntegrationStatusItem
    pms_connection: IntegrationStatusItem


class SystemOverviewSummary(BaseModel):
    xero_connected_pct: float
    pms_connected_pct: float
    total_practices: int


class InvitationInfo(BaseModel):
    key: str
    email: str
    name: str
    role_type: str
    tenant_id: Optional[str] = None
    status: str
    invited_at: Optional[str] = None
    expires_at: Optional[str] = None


class DashboardResponse(BaseModel):
    clients: List[ClientSummary]
    client_stats: ClientStats
    users_by_role: List[UsersByRole]
    daily_login_activity: List[DailyLoginActivity]
    recent_clients: List[RecentClient]
    practice_system_overview: List[PracticeSystemOverview]
    system_overview_summary: SystemOverviewSummary
    invitations: List[InvitationInfo]
