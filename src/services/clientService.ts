import apiClient from './api';
import { API_ENDPOINTS } from '../config/constants';

export interface Client {
  id?: string;
  tenant_id?: string;  // 8-char alphanumeric tenant ID
  legal_client_trading_name: string;
  legal_trading_name?: string;  // Alias for legal_client_trading_name
  name?: string;  // Alias for display name
  workfin_legal_entity_reference: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  client_type?: string;
  logo?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  country?: string;
  company_registration?: string;
  xero_vat_type?: string;
  phone?: string;
  email?: string;
  admin_user_name?: string;
  admin_user_email?: string;
  accounting_system?: string;
  workfin_users_count?: number;
  compass_connections_count?: number;
  finance_system_connections_count?: number;
  pms_connections_count?: number;
  purchasing_system_connections_count?: number;
  accountant_name?: string;
  accountant_address?: string;
  accountant_contact?: string;
  accountant_email?: string;
  it_provider_name?: string;
  it_provider_address?: string;
  it_provider_postcode?: string;
  it_provider_contact_name?: string;
  it_provider_phone_1?: string;
  it_provider_phone_2?: string;
  it_provider_email?: string;
  it_provider_notes?: string;
  adjustment_types?: any[];
  pms_integration?: any;
  denpay_periods?: any[];
  fy_ends?: any[];
  clinician_pay_system_enabled?: boolean;
  power_bi_reports_enabled?: boolean;
}

export interface ClientUser {
  id?: string;
  tenant_id: string;
  name: string;
  email: string;
  roles: string;
  status?: string;
  created_at?: string;
}

class ClientService {
  async getClients(): Promise<Client[]> {
    const response = await apiClient.get<Client[]>(API_ENDPOINTS.CLIENTS.LIST);
    return response.data;
  }

  async getClient(id: string): Promise<Client> {
    const response = await apiClient.get<Client>(API_ENDPOINTS.CLIENTS.GET(id));
    return response.data;
  }

  async createClient(data: Client): Promise<Client> {
    const response = await apiClient.post<Client>(API_ENDPOINTS.CLIENTS.CREATE, data);
    return response.data;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    const response = await apiClient.put<Client>(API_ENDPOINTS.CLIENTS.UPDATE(id), data);
    return response.data;
  }

  async deleteClient(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CLIENTS.DELETE(id));
  }

  async getClientUsers(clientId: string): Promise<ClientUser[]> {
    const response = await apiClient.get<ClientUser[]>(API_ENDPOINTS.CLIENTS.USERS(clientId));
    return response.data;
  }

  async createClientUser(clientId: string, data: Omit<ClientUser, 'id' | 'tenant_id' | 'status' | 'created_at'>): Promise<ClientUser> {
    const response = await apiClient.post<ClientUser>(
      API_ENDPOINTS.CLIENTS.CREATE_USER(clientId),
      data
    );
    return response.data;
  }

  async resendInvitation(clientId: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      `/clients/${clientId}/resend-invitation`
    );
    return response.data;
  }
}

export default new ClientService();
