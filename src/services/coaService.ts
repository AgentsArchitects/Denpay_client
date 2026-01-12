import apiClient from './api';
import { API_ENDPOINTS } from '../config/constants';

export interface CoACategory {
  id?: string;
  coa_name: string;
  category_number: string;
  values?: string;
  created_at?: string;
  updated_at?: string;
}

class CoAService {
  async getCategories(): Promise<CoACategory[]> {
    const response = await apiClient.get<CoACategory[]>(API_ENDPOINTS.COA.LIST);
    return response.data;
  }

  async getCategory(id: string): Promise<CoACategory> {
    const response = await apiClient.get<CoACategory>(API_ENDPOINTS.COA.GET(id));
    return response.data;
  }

  async createCategory(data: Omit<CoACategory, 'id' | 'created_at' | 'updated_at'>): Promise<CoACategory> {
    const response = await apiClient.post<CoACategory>(API_ENDPOINTS.COA.CREATE, data);
    return response.data;
  }

  async updateCategory(id: string, data: Partial<CoACategory>): Promise<CoACategory> {
    const response = await apiClient.put<CoACategory>(API_ENDPOINTS.COA.UPDATE(id), data);
    return response.data;
  }

  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.COA.DELETE(id));
  }
}

export default new CoAService();
