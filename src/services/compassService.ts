import apiClient from './api';
import { API_ENDPOINTS } from '../config/constants';

export interface CompassDate {
  id?: string;
  month: string;
  schedule_period: string;
  adjustment_last_day: string;
  processing_cut_off_date: string;
  pay_statement_available: string;
  pay_date: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

class CompassService {
  async getCompassDates(): Promise<CompassDate[]> {
    const response = await apiClient.get<CompassDate[]>(API_ENDPOINTS.COMPASS.LIST);
    return response.data;
  }

  async getCompassDate(id: string): Promise<CompassDate> {
    const response = await apiClient.get<CompassDate>(API_ENDPOINTS.COMPASS.GET(id));
    return response.data;
  }

  async createCompassDate(data: Omit<CompassDate, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<CompassDate> {
    const response = await apiClient.post<CompassDate>(API_ENDPOINTS.COMPASS.CREATE, data);
    return response.data;
  }

  async updateCompassDate(id: string, data: Partial<CompassDate>): Promise<CompassDate> {
    const response = await apiClient.put<CompassDate>(API_ENDPOINTS.COMPASS.UPDATE(id), data);
    return response.data;
  }

  async deleteCompassDate(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.COMPASS.DELETE(id));
  }
}

export default new CompassService();
