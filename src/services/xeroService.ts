import apiClient from './api';
import { API_ENDPOINTS } from '../config/constants';

export interface XeroConnection {
  id?: string;
  client_id: string;
  tenant_id?: string;
  tenant_name?: string;
  status?: string;
  connected_at?: string;
  created_at?: string;
  updated_at?: string;
}

class XeroService {
  async getConnections(): Promise<XeroConnection[]> {
    const response = await apiClient.get<XeroConnection[]>(API_ENDPOINTS.XERO.LIST);
    return response.data;
  }

  async getConnection(id: string): Promise<XeroConnection> {
    const response = await apiClient.get<XeroConnection>(API_ENDPOINTS.XERO.GET(id));
    return response.data;
  }

  async connect(clientId: string, authorizationCode: string): Promise<XeroConnection> {
    const response = await apiClient.post<XeroConnection>(API_ENDPOINTS.XERO.CONNECT, {
      client_id: clientId,
      authorization_code: authorizationCode,
    });
    return response.data;
  }

  async disconnect(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(API_ENDPOINTS.XERO.DISCONNECT(id));
    return response.data;
  }
}

export default new XeroService();
