export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
  },

  // Clients
  CLIENTS: {
    LIST: '/clients/',
    CREATE: '/clients//',
    GET: (id: string) => `/clients/${id}/`,
    UPDATE: (id: string) => `/clients/${id}/`,
    DELETE: (id: string) => `/clients/${id}/`,
    USERS: (id: string) => `/clients/${id}/users/`,
    CREATE_USER: (id: string) => `/clients/${id}/users/`,
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
    AUTHORIZE: '/xero/authorize',
    CALLBACK: '/xero/callback',
    TENANTS: '/xero/tenants',
    STATUS: '/xero/status',
    CONNECT: '/xero/connect',
    DISCONNECT: '/xero/disconnect',
    GET: (id: string) => `/xero/${id}`,
    SYNC: {
      ALL: '/xero/sync/all',
      QUICK: '/xero/sync/quick',
      ACCOUNTS: '/xero/sync/accounts',
      CONTACTS: '/xero/sync/contacts',
      CONTACT_GROUPS: '/xero/sync/contact-groups',
      INVOICES: '/xero/sync/invoices',
      CREDIT_NOTES: '/xero/sync/credit-notes',
      PAYMENTS: '/xero/sync/payments',
      BANK_TRANSACTIONS: '/xero/sync/bank-transactions',
      BANK_TRANSFERS: '/xero/sync/bank-transfers',
      JOURNALS: '/xero/sync/journals',
    },
    DATA: {
      ACCOUNTS: '/xero/data/accounts',
      CONTACTS: '/xero/data/contacts',
      CONTACT_GROUPS: '/xero/data/contact-groups',
      INVOICES: '/xero/data/invoices',
      CREDIT_NOTES: '/xero/data/credit-notes',
      PAYMENTS: '/xero/data/payments',
      BANK_TRANSACTIONS: '/xero/data/bank-transactions',
      BANK_TRANSFERS: '/xero/data/bank-transfers',
      JOURNALS: '/xero/data/journals',
      JOURNAL_LINES: '/xero/data/journal-lines',
    },
  },
} as const;
