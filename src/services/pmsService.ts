import apiClient from './api';
import { API_ENDPOINTS } from '../config/constants';

// ==================
// Type Definitions
// ==================

export interface PMSConnection {
  id: string;
  tenant_id: string;  // 8-char alphanumeric tenant ID
  tenant_name?: string;
  practice_id?: string;
  pms_type: 'SOE' | 'DENTALLY' | 'SFD' | 'CARESTACK' | 'XERO' | 'COMPASS';
  integration_id: string;  // 8-char alphanumeric integration ID
  integration_name: string;
  external_practice_id?: string;
  external_site_code?: string;
  data_source?: string;
  sync_frequency?: string;
  sync_config?: Record<string, any>;
  sync_patients?: boolean;
  sync_appointments?: boolean;
  sync_providers?: boolean;
  sync_treatments?: boolean;
  sync_billing?: boolean;
  connection_status?: string;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_error?: string;
  last_sync_records_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PMSConnectionCreate {
  tenant_id: string;  // 8-char alphanumeric tenant ID (REQUIRED)
  tenant_name?: string;
  practice_id?: string;
  pms_type: 'SOE' | 'DENTALLY' | 'SFD' | 'CARESTACK' | 'XERO' | 'COMPASS';
  integration_id: string;  // 8-char alphanumeric integration ID (REQUIRED)
  integration_name: string;
  external_practice_id?: string;
  external_site_code?: string;
  data_source?: string;
  sync_frequency?: string;
  sync_config?: Record<string, any>;
  sync_patients?: boolean;
  sync_appointments?: boolean;
  sync_providers?: boolean;
  sync_treatments?: boolean;
  sync_billing?: boolean;
}

export interface PMSConnectionUpdate {
  integration_name?: string;
  external_practice_id?: string;
  external_site_code?: string;
  data_source?: string;
  sync_frequency?: string;
  sync_config?: Record<string, any>;
  sync_patients?: boolean;
  sync_appointments?: boolean;
  sync_providers?: boolean;
  sync_treatments?: boolean;
  sync_billing?: boolean;
  connection_status?: string;
}

export interface SyncHistory {
  id: string;
  connection_id: string;
  sync_type: string;
  sync_scope?: string;
  status: string;
  records_processed?: number;
  records_created?: number;
  records_updated?: number;
  records_skipped?: number;
  records_failed?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  triggered_by?: string;
}

export interface SOEPatient {
  id: string;
  connection_id: string;
  external_patient_id: string;
  title?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  preferred_name?: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  phone_mobile?: string;
  phone_home?: string;
  phone_work?: string;
  address_line1?: string;
  city?: string;
  postcode?: string;
  registration_date?: string;
  patient_status?: string;
  patient_type?: string;
  nhs_number?: string;
  source_system?: string;
  last_synced_at?: string;
}

export interface SOEAppointment {
  id: string;
  connection_id: string;
  external_appointment_id: string;
  patient_id?: string;
  provider_id?: string;
  appointment_date?: string;
  start_time?: string;
  duration_minutes?: number;
  appointment_type?: string;
  appointment_status?: string;
  cancellation_reason?: string;
  fee_charged?: number;
  fee_nhs?: number;
  fee_private?: number;
  payment_status?: string;
  uda_value?: number;
  source_system?: string;
  last_synced_at?: string;
}

export interface SOEProvider {
  id: string;
  connection_id: string;
  external_provider_id: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  gdc_number?: string;
  provider_type?: string;
  specialization?: string;
  email?: string;
  phone?: string;
  employment_type?: string;
  employment_status?: string;
  start_date?: string;
  source_system?: string;
  last_synced_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SyncResponse {
  status: string;
  results?: Record<string, any>;
  records_processed?: number;
  records_created?: number;
  records_updated?: number;
  records_failed?: number;
  duration_seconds?: number;
  message?: string;
}

// ==================
// API Service Methods
// ==================

class PMSService {
  // Connection CRUD
  async listConnections(params?: {
    tenant_id?: string;  // Changed from client_id to tenant_id
    practice_id?: string;
    pms_type?: string;
    integration_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<PMSConnection>> {
    const response = await apiClient.get(API_ENDPOINTS.PMS.CONNECTIONS.LIST, { params });
    return response.data;
  }

  async getConnection(id: string): Promise<PMSConnection> {
    const response = await apiClient.get(API_ENDPOINTS.PMS.CONNECTIONS.GET(id));
    return response.data;
  }

  async createConnection(data: PMSConnectionCreate): Promise<PMSConnection> {
    const response = await apiClient.post(API_ENDPOINTS.PMS.CONNECTIONS.CREATE, data);
    return response.data;
  }

  async updateConnection(id: string, data: PMSConnectionUpdate): Promise<PMSConnection> {
    const response = await apiClient.put(API_ENDPOINTS.PMS.CONNECTIONS.UPDATE(id), data);
    return response.data;
  }

  async deleteConnection(id: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete(API_ENDPOINTS.PMS.CONNECTIONS.DELETE(id));
    return response.data;
  }

  // Test & Sync
  async testConnection(id: string): Promise<{ status: string; message: string; tables?: string[] }> {
    const response = await apiClient.post(API_ENDPOINTS.PMS.CONNECTIONS.TEST(id));
    return response.data;
  }

  async syncConnection(id: string, triggered_by: string = 'manual'): Promise<SyncResponse> {
    const response = await apiClient.post(
      API_ENDPOINTS.PMS.CONNECTIONS.SYNC(id),
      {},
      { params: { triggered_by } }
    );
    return response.data;
  }

  async syncEntity(
    id: string,
    entity_type: 'patients' | 'appointments' | 'providers',
    triggered_by: string = 'manual'
  ): Promise<SyncResponse> {
    const response = await apiClient.post(
      API_ENDPOINTS.PMS.CONNECTIONS.SYNC_ENTITY(id, entity_type),
      {},
      { params: { triggered_by } }
    );
    return response.data;
  }

  // Sync History
  async getSyncHistory(
    connection_id: string,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<SyncHistory>> {
    const response = await apiClient.get(API_ENDPOINTS.PMS.CONNECTIONS.HISTORY(connection_id), {
      params,
    });
    return response.data;
  }

  // Synced Data (from PostgreSQL)
  async getPatients(
    connection_id?: string,
    params?: {
      search?: string;
      patient_status?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<PaginatedResponse<SOEPatient>> {
    const response = await apiClient.get(API_ENDPOINTS.PMS.SOE_DATA.PATIENTS, {
      params: { connection_id, ...params },
    });
    return response.data;
  }

  async getAppointments(
    connection_id?: string,
    params?: {
      date_from?: string;
      date_to?: string;
      appointment_status?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<PaginatedResponse<SOEAppointment>> {
    const response = await apiClient.get(API_ENDPOINTS.PMS.SOE_DATA.APPOINTMENTS, {
      params: { connection_id, ...params },
    });
    return response.data;
  }

  async getProviders(
    connection_id?: string,
    params?: {
      employment_status?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<PaginatedResponse<SOEProvider>> {
    const response = await apiClient.get(API_ENDPOINTS.PMS.SOE_DATA.PROVIDERS, {
      params: { connection_id, ...params },
    });
    return response.data;
  }

  // SOE Blob Data (from Azure Gold Layer)
  async getSOEIntegrations(): Promise<{ integrations: { integration_id: string; integration_name: string }[] }> {
    const response = await apiClient.get(API_ENDPOINTS.SOE.INTEGRATIONS);
    return response.data;
  }

  async getSOETables(): Promise<{ tables: string[]; count: number }> {
    const response = await apiClient.get(API_ENDPOINTS.SOE.TABLES);
    return response.data;
  }

  async getSOEPatients(params?: {
    limit?: number;
    offset?: number;
    integration_id?: string;
  }): Promise<{ data: any[]; total: number; table: string }> {
    const response = await apiClient.get(API_ENDPOINTS.SOE.PATIENTS, { params });
    return response.data;
  }

  async getSOEAppointments(params?: {
    limit?: number;
    offset?: number;
    integration_id?: string;
  }): Promise<{ data: any[]; total: number; table: string }> {
    const response = await apiClient.get(API_ENDPOINTS.SOE.APPOINTMENTS, { params });
    return response.data;
  }

  async getSOETableData(
    table_name: string,
    params?: {
      limit?: number;
      offset?: number;
      integration_id?: string;
    }
  ): Promise<{ data: any[]; total: number; table: string }> {
    const response = await apiClient.get(API_ENDPOINTS.SOE.DATA(table_name), { params });
    return response.data;
  }
}

export default new PMSService();
