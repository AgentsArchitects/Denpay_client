import apiClient from './api';
import { API_ENDPOINTS } from '../config/constants';

export interface ClientSummary {
  tenant_id: string;
  legal_trading_name: string;
  status: string;
}

export interface ClientStats {
  total_clients: number;
  active_clients: number;
  inactive_clients: number;
}

export interface UsersByRole {
  role: string;
  count: number;
}

export interface DailyLoginActivity {
  date: string;
  count: number;
  hour: number;
}

export interface RecentClient {
  key: string;
  name: string;
  contact_name: string;
  contact_email: string;
  status: string;
  created_at: string | null;
}

export interface IntegrationStatusItem {
  status: 'Success' | 'Fail';
  time: string;
}

export interface PracticeSystemOverview {
  key: string;
  name: string;
  tenant_name: string;
  users: number;
  xero_connection: IntegrationStatusItem;
  pms_connection: IntegrationStatusItem;
}

export interface SystemOverviewSummary {
  xero_connected_pct: number;
  pms_connected_pct: number;
  total_practices: number;
}

export interface InvitationInfo {
  key: string;
  email: string;
  name: string;
  role_type: string;
  tenant_id: string | null;
  status: string;
  invited_at: string | null;
  expires_at: string | null;
}

export interface DashboardData {
  clients: ClientSummary[];
  client_stats: ClientStats;
  users_by_role: UsersByRole[];
  daily_login_activity: DailyLoginActivity[];
  recent_clients: RecentClient[];
  practice_system_overview: PracticeSystemOverview[];
  system_overview_summary: SystemOverviewSummary;
  invitations: InvitationInfo[];
}

class DashboardService {
  async getStats(tenantId?: string): Promise<DashboardData> {
    const params = tenantId && tenantId !== 'all' ? { tenant_id: tenantId } : {};
    const response = await apiClient.get<DashboardData>(
      API_ENDPOINTS.DASHBOARD.STATS,
      { params }
    );
    return response.data;
  }
}

export default new DashboardService();
