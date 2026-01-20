export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
  },

  // Clients
  CLIENTS: {
    LIST: '/clients',
    CREATE: '/clients',
    GET: (id: string) => `/clients/${id}`,
    UPDATE: (id: string) => `/clients/${id}`,
    DELETE: (id: string) => `/clients/${id}`,
    USERS: (id: string) => `/clients/${id}/users`,
    CREATE_USER: (id: string) => `/clients/${id}/users`,
  },

  // Users
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },

  // Compass
  COMPASS: {
    LIST: '/compass/dates',
    CREATE: '/compass/dates',
    GET: (id: string) => `/compass/dates/${id}`,
    UPDATE: (id: string) => `/compass/dates/${id}`,
    DELETE: (id: string) => `/compass/dates/${id}`,
  },

  // Xero
  XERO: {
    LIST: '/xero',
    CONNECT: '/xero/connect',
    DISCONNECT: (id: string) => `/xero/disconnect/${id}`,
    GET: (id: string) => `/xero/${id}`,
  },
} as const;
