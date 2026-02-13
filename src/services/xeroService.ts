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

export interface XeroTenant {
  tenant_id: string;
  tenant_name: string;
  tenant_type: string;
}

export interface XeroSyncResponse {
  entity_type: string;
  synced_count: number;
  status: 'success' | 'failed' | 'partial';
  message?: string;
}

export interface XeroStatus {
  connected: boolean;
  tokens: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface XeroAccountData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  account_id: string;
  code: string | null;
  name: string;
  type: string | null;
  class: string | null;
  status: string | null;
  description: string | null;
  currency_code: string | null;
  tax_type: string | null;
  synced_at: string | null;
}

export interface XeroContactData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  contact_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  contact_status: string | null;
  is_customer: boolean;
  is_supplier: boolean;
  default_currency: string | null;
  tax_number: string | null;
  synced_at: string | null;
}

export interface XeroInvoiceData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  invoice_id: string;
  invoice_number: string | null;
  type: string | null;
  contact_name: string | null;
  date: string | null;
  due_date: string | null;
  status: string | null;
  total: number;
  amount_due: number;
  amount_paid: number;
  currency_code: string | null;
  reference: string | null;
  synced_at: string | null;
}

export interface XeroCreditNoteData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  credit_note_id: string;
  credit_note_number: string | null;
  type: string | null;
  contact_name: string | null;
  date: string | null;
  status: string | null;
  total: number;
  remaining_credit: number;
  currency_code: string | null;
  reference: string | null;
  synced_at: string | null;
}

export interface XeroPaymentData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  payment_id: string;
  date: string | null;
  amount: number;
  reference: string | null;
  status: string | null;
  payment_type: string | null;
  is_reconciled: boolean;
  synced_at: string | null;
}

export interface XeroBankTransactionData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  bank_transaction_id: string;
  type: string | null;
  contact_name: string | null;
  date: string | null;
  reference: string | null;
  status: string | null;
  total: number;
  is_reconciled: boolean;
  currency_code: string | null;
  synced_at: string | null;
}

export interface XeroJournalData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  journal_id: string;
  journal_number: number | null;
  journal_date: string | null;
  reference: string | null;
  source_type: string | null;
  synced_at: string | null;
}

export interface XeroJournalLineData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  journal_line_id: string;
  journal_id: string;
  account_id: string | null;
  account_code: string | null;
  account_type: string | null;
  account_name: string | null;
  description: string | null;
  net_amount: number;
  gross_amount: number;
  tax_amount: number;
  tax_type: string | null;
  tax_name: string | null;
  synced_at: string | null;
}

export interface XeroContactGroupData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  contact_group_id: string;
  name: string;
  status: string | null;
  synced_at: string | null;
}

export interface XeroBankTransferData {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  integration_id: string | null;
  bank_transfer_id: string;
  from_bank_account_id: string | null;
  to_bank_account_id: string | null;
  amount: number;
  date: string | null;
  has_attachments: boolean;
  synced_at: string | null;
}

class XeroService {
  /**
   * Get the Xero OAuth authorization URL
   * Redirects user to Xero login page
   */
  async getAuthorizationUrl(clientId?: string): Promise<{ authorization_url: string }> {
    const params = clientId ? `?client_id=${clientId}` : '';
    const response = await apiClient.get<{ authorization_url: string }>(
      `${API_ENDPOINTS.XERO.AUTHORIZE}${params}`
    );
    return response.data;
  }

  /**
   * Initiate Xero OAuth flow - opens Xero login in same window
   */
  async connectToXero(clientId?: string): Promise<void> {
    const { authorization_url } = await this.getAuthorizationUrl(clientId);
    window.location.href = authorization_url;
  }

  /**
   * Get Xero connection status
   */
  async getStatus(): Promise<XeroStatus> {
    const response = await apiClient.get<XeroStatus>(API_ENDPOINTS.XERO.STATUS);
    return response.data;
  }

  /**
   * Get list of connected Xero tenants (organizations)
   * @param tenantId - Optional: Filter by WorkFin tenant_id
   */
  async getTenants(tenantId?: string): Promise<XeroTenant[]> {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const response = await apiClient.get<XeroTenant[]>(API_ENDPOINTS.XERO.TENANTS, { params });
    return response.data;
  }

  /**
   * Disconnect from Xero
   */
  async disconnect(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(API_ENDPOINTS.XERO.DISCONNECT);
    return response.data;
  }

  /**
   * Quick sync - fetches limited data (accounts, contacts, invoices only)
   * Much faster than full sync, good for initial display
   */
  async syncQuick(tenantId: string, limit: number = 20): Promise<XeroSyncResponse[]> {
    const response = await apiClient.post<XeroSyncResponse[]>(
      `${API_ENDPOINTS.XERO.SYNC.QUICK}?tenant_id=${tenantId}&limit=${limit}`,
      {},
      { timeout: 60000 } // 1 minute timeout for quick sync
    );
    return response.data;
  }

  /**
   * Sync all Xero data for a tenant
   * Uses extended timeout for large data syncs
   */
  async syncAll(tenantId: string, limit: number = 0): Promise<XeroSyncResponse[]> {
    const limitParam = limit > 0 ? `&limit=${limit}` : '';
    const response = await apiClient.post<XeroSyncResponse[]>(
      `${API_ENDPOINTS.XERO.SYNC.ALL}?tenant_id=${tenantId}${limitParam}`,
      {},
      { timeout: 300000 } // 5 minutes timeout for full sync
    );
    return response.data;
  }

  /**
   * Sync specific entity type
   */
  async syncAccounts(tenantId: string): Promise<XeroSyncResponse> {
    const response = await apiClient.post<XeroSyncResponse>(
      `${API_ENDPOINTS.XERO.SYNC.ACCOUNTS}?tenant_id=${tenantId}`
    );
    return response.data;
  }

  async syncContacts(tenantId: string): Promise<XeroSyncResponse> {
    const response = await apiClient.post<XeroSyncResponse>(
      `${API_ENDPOINTS.XERO.SYNC.CONTACTS}?tenant_id=${tenantId}`
    );
    return response.data;
  }

  async syncInvoices(tenantId: string): Promise<XeroSyncResponse> {
    const response = await apiClient.post<XeroSyncResponse>(
      `${API_ENDPOINTS.XERO.SYNC.INVOICES}?tenant_id=${tenantId}`
    );
    return response.data;
  }

  async syncPayments(tenantId: string): Promise<XeroSyncResponse> {
    const response = await apiClient.post<XeroSyncResponse>(
      `${API_ENDPOINTS.XERO.SYNC.PAYMENTS}?tenant_id=${tenantId}`
    );
    return response.data;
  }

  async syncBankTransactions(tenantId: string): Promise<XeroSyncResponse> {
    const response = await apiClient.post<XeroSyncResponse>(
      `${API_ENDPOINTS.XERO.SYNC.BANK_TRANSACTIONS}?tenant_id=${tenantId}`
    );
    return response.data;
  }

  async syncJournals(tenantId: string): Promise<XeroSyncResponse> {
    const response = await apiClient.post<XeroSyncResponse>(
      `${API_ENDPOINTS.XERO.SYNC.JOURNALS}?tenant_id=${tenantId}`
    );
    return response.data;
  }

  // Legacy methods for backwards compatibility
  async getConnections(): Promise<XeroConnection[]> {
    const response = await apiClient.get<XeroConnection[]>(API_ENDPOINTS.XERO.LIST);
    return response.data;
  }

  async getConnection(id: string): Promise<XeroConnection> {
    const response = await apiClient.get<XeroConnection>(API_ENDPOINTS.XERO.GET(id));
    return response.data;
  }

  // ==================
  // Data Fetching Methods (from synced database)
  // ==================

  async getAccounts(params?: {
    tenant_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<XeroAccountData>> {
    const response = await apiClient.get<PaginatedResponse<XeroAccountData>>(
      API_ENDPOINTS.XERO.DATA.ACCOUNTS,
      { params }
    );
    return response.data;
  }

  async getContacts(params?: {
    tenant_id?: string;
    page?: number;
    page_size?: number;
    is_customer?: boolean;
    is_supplier?: boolean;
  }): Promise<PaginatedResponse<XeroContactData>> {
    const response = await apiClient.get<PaginatedResponse<XeroContactData>>(
      API_ENDPOINTS.XERO.DATA.CONTACTS,
      { params }
    );
    return response.data;
  }

  async getInvoices(params?: {
    tenant_id?: string;
    page?: number;
    page_size?: number;
    status?: string;
    type?: string;
  }): Promise<PaginatedResponse<XeroInvoiceData>> {
    const response = await apiClient.get<PaginatedResponse<XeroInvoiceData>>(
      API_ENDPOINTS.XERO.DATA.INVOICES,
      { params }
    );
    return response.data;
  }

  async getCreditNotes(params?: {
    tenant_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<XeroCreditNoteData>> {
    const response = await apiClient.get<PaginatedResponse<XeroCreditNoteData>>(
      API_ENDPOINTS.XERO.DATA.CREDIT_NOTES,
      { params }
    );
    return response.data;
  }

  async getPayments(params?: {
    tenant_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<XeroPaymentData>> {
    const response = await apiClient.get<PaginatedResponse<XeroPaymentData>>(
      API_ENDPOINTS.XERO.DATA.PAYMENTS,
      { params }
    );
    return response.data;
  }

  async getBankTransactions(params?: {
    tenant_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<XeroBankTransactionData>> {
    const response = await apiClient.get<PaginatedResponse<XeroBankTransactionData>>(
      API_ENDPOINTS.XERO.DATA.BANK_TRANSACTIONS,
      { params }
    );
    return response.data;
  }

  async getJournals(params?: {
    tenant_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<XeroJournalData>> {
    const response = await apiClient.get<PaginatedResponse<XeroJournalData>>(
      API_ENDPOINTS.XERO.DATA.JOURNALS,
      { params }
    );
    return response.data;
  }

  async getJournalLines(params?: {
    tenant_id?: string;
    journal_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<XeroJournalLineData>> {
    const response = await apiClient.get<PaginatedResponse<XeroJournalLineData>>(
      API_ENDPOINTS.XERO.DATA.JOURNAL_LINES,
      { params }
    );
    return response.data;
  }

  async getContactGroups(params?: {
    tenant_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<XeroContactGroupData>> {
    const response = await apiClient.get<PaginatedResponse<XeroContactGroupData>>(
      API_ENDPOINTS.XERO.DATA.CONTACT_GROUPS,
      { params }
    );
    return response.data;
  }

  async getBankTransfers(params?: {
    tenant_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<XeroBankTransferData>> {
    const response = await apiClient.get<PaginatedResponse<XeroBankTransferData>>(
      API_ENDPOINTS.XERO.DATA.BANK_TRANSFERS,
      { params }
    );
    return response.data;
  }

  async getCustomTableData(tableName: string, params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Record<string, any>>> {
    const response = await apiClient.get<PaginatedResponse<Record<string, any>>>(
      API_ENDPOINTS.XERO.DATA.CUSTOM(tableName),
      { params }
    );
    return response.data;
  }
}

export default new XeroService();
