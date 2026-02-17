import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '../config/constants';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 seconds - Azure App Service can be slow on cold starts
});

// Request interceptor - add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized - token invalid/expired/inactive account → redirect to login
    // But skip redirect for Xero endpoints (they return 401 when not connected)
    const isXeroEndpoint = error.config?.url?.includes('/xero');
    if (error.response?.status === 401 && !isXeroEndpoint) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Handle 403 Forbidden - authenticated but not authorised (e.g. non-admin hitting admin route)
    if (error.response?.status === 403) {
      console.warn('Access denied (403):', (error.response?.data as any)?.detail);
    }

    // Handle other errors
    const errorMessage = (error.response?.data as any)?.detail || error.message || 'An error occurred';

    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data,
    });
  }
);

export default apiClient;
