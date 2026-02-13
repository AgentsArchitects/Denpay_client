import apiClient from './api';
import { API_ENDPOINTS } from '../config/constants';

export interface User {
  id?: string;
  full_name: string;
  email: string;
  role: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

class UserService {
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get<User[]>(API_ENDPOINTS.USERS.LIST);
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await apiClient.get<User>(API_ENDPOINTS.USERS.GET(id));
    return response.data;
  }

  async createUser(data: User): Promise<User> {
    const response = await apiClient.post<User>(API_ENDPOINTS.USERS.CREATE, data);
    return response.data;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await apiClient.put<User>(API_ENDPOINTS.USERS.UPDATE(id), data);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.USERS.DELETE(id));
  }
}

export default new UserService();
