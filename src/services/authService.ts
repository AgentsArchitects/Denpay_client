import apiClient from './api';
import { API_ENDPOINTS } from '../config/constants';

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

class AuthService {
  async login(data: LoginData): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, data);

    // Store token and user info in localStorage
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      // Clear localStorage regardless of API response
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Decode JWT payload (base64) and check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        // Token is expired — clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        return false;
      }
      return true;
    } catch {
      // Invalid token format — clear storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      return false;
    }
  }
}

export default new AuthService();
