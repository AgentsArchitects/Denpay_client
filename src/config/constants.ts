// export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// export const API_ENDPOINTS = {
//   // Authentication
//   AUTH: {
//     LOGIN: '/auth/login',
//     LOGOUT: '/auth/logout',
//   },

//   // Clients
//   CLIENTS: {
//     LIST: '/clients/',
//     CREATE: '/clients/',
//     GET: (id: string) => `/clients/${id}/`,
//     UPDATE: (id: string) => `/clients/${id}/`,
//     DELETE: (id: string) => `/clients/${id}/`,
//     USERS: (id: string) => `/clients/${id}/users/`,
//     CREATE_USER: (id: string) => `/clients/${id}/users/`,
//   },

//   // Users
//   USERS: {
//     LIST: '/users',
//     CREATE: '/users',
//     GET: (id: string) => `/users/${id}`,
//     UPDATE: (id: string) => `/users/${id}`,
//     DELETE: (id: string) => `/users/${id}`,
//   },

//   // Compass
//   COMPASS: {
//     LIST: '/compass/dates',
//     CREATE: '/compass/dates',
//     GET: (id: string) => `/compass/dates/${id}`,
//     UPDATE: (id: string) => `/compass/dates/${id}`,
//     DELETE: (id: string) => `/compass/dates/${id}`,
//   },

//   // Xero
//   XERO: {
//     LIST: '/xero',
//     AUTHORIZE: '/xero/authorize',
//     CALLBACK: '/xero/callback',
//     TENANTS: '/xero/tenants',
//     STATUS: '/xero/status',
//     CONNECT: '/xero/connect',
//     DISCONNECT: '/xero/disconnect',
//     GET: (id: string) => `/xero/${id}`,
//     SYNC: {
//       ALL: '/xero/sync/all',
//       QUICK: '/xero/sync/quick',
//       ACCOUNTS: '/xero/sync/accounts',
//       CONTACTS: '/xero/sync/contacts',
//       CONTACT_GROUPS: '/xero/sync/contact-groups',
//       INVOICES: '/xero/sync/invoices',
//       CREDIT_NOTES: '/xero/sync/credit-notes',
//       PAYMENTS: '/xero/sync/payments',
//       BANK_TRANSACTIONS: '/xero/sync/bank-transactions',
//       BANK_TRANSFERS: '/xero/sync/bank-transfers',
//       JOURNALS: '/xero/sync/journals',
//     },
//     DATA: {
//       ACCOUNTS: '/xero/data/accounts',
//       CONTACTS: '/xero/data/contacts',
//       CONTACT_GROUPS: '/xero/data/contact-groups',
//       INVOICES: '/xero/data/invoices',
//       CREDIT_NOTES: '/xero/data/credit-notes',
//       PAYMENTS: '/xero/data/payments',
//       BANK_TRANSACTIONS: '/xero/data/bank-transactions',
//       BANK_TRANSFERS: '/xero/data/bank-transfers',
//       JOURNALS: '/xero/data/journals',
//       JOURNAL_LINES: '/xero/data/journal-lines',
//     },
//   },
// } as const;








export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
  },
  // Clients
  CLIENTS: {
    LIST: '/clients/',
    CREATE: '/clients/',
    GET: (id: string) => `/clients/${id}`,
    UPDATE: (id: string) => `/clients/${id}`,
    DELETE: (id: string) => `/clients/${id}`,
    BY_TENANT: (tenantId: string) => `/clients/by-tenant/${tenantId}`,
    USERS: (id: string) => `/clients/${id}/users`,
    CREATE_USER: (id: string) => `/clients/${id}/users`,
  },
  // Users
  USERS: {
    LIST: '/users/',
    CREATE: '/users/',
    GET: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },
  // Compass
  COMPASS: {
    LIST: '/compass/dates/',
    CREATE: '/compass/dates/',
    GET: (id: string) => `/compass/dates/${id}`,
    UPDATE: (id: string) => `/compass/dates/${id}`,
    DELETE: (id: string) => `/compass/dates/${id}`,
  },
  // Xero
  XERO: {
    LIST: '/xero/',
    AUTHORIZE: '/xero/authorize/',
    CALLBACK: '/xero/callback/',
    TENANTS: '/xero/tenants/',
    STATUS: '/xero/status/',
    CONNECT: '/xero/connect/',
    DISCONNECT: '/xero/disconnect/',
    GET: (id: string) => `/xero/${id}`,
    SYNC: {
      ALL: '/xero/sync/all/',
      QUICK: '/xero/sync/quick/',
      ACCOUNTS: '/xero/sync/accounts/',
      CONTACTS: '/xero/sync/contacts/',
      CONTACT_GROUPS: '/xero/sync/contact-groups/',
      INVOICES: '/xero/sync/invoices/',
      CREDIT_NOTES: '/xero/sync/credit-notes/',
      PAYMENTS: '/xero/sync/payments/',
      BANK_TRANSACTIONS: '/xero/sync/bank-transactions/',
      BANK_TRANSFERS: '/xero/sync/bank-transfers/',
      JOURNALS: '/xero/sync/journals/',
    },
    DATA: {
      ACCOUNTS: '/xero/data/accounts/',
      CONTACTS: '/xero/data/contacts/',
      CONTACT_GROUPS: '/xero/data/contact-groups/',
      INVOICES: '/xero/data/invoices/',
      CREDIT_NOTES: '/xero/data/credit-notes/',
      PAYMENTS: '/xero/data/payments/',
      BANK_TRANSACTIONS: '/xero/data/bank-transactions/',
      BANK_TRANSFERS: '/xero/data/bank-transfers/',
      JOURNALS: '/xero/data/journals/',
      JOURNAL_LINES: '/xero/data/journal-lines/',
      CUSTOM: (tableName: string) => `/xero/data/custom/${tableName}/`,
    },
  },
  // PMS Integrations
  PMS: {
    CONNECTIONS: {
      LIST: '/pms/connections/',
      CREATE: '/pms/connections/',
      GET: (id: string) => `/pms/connections/${id}`,
      UPDATE: (id: string) => `/pms/connections/${id}`,
      DELETE: (id: string) => `/pms/connections/${id}`,
      TEST: (id: string) => `/pms/connections/${id}/test`,
      SYNC: (id: string) => `/pms/connections/${id}/sync`,
      SYNC_ENTITY: (id: string, entity_type: string) => `/pms/connections/${id}/sync/${entity_type}`,
      HISTORY: (id: string) => `/pms/connections/${id}/history`,
    },
    SOE_DATA: {
      PATIENTS: '/soe-data/patients/',
      APPOINTMENTS: '/soe-data/appointments/',
      PROVIDERS: '/soe-data/providers/',
      TREATMENTS: '/soe-data/treatments/',
    },
  },
  // SOE (Azure Gold Layer)
  SOE: {
    TABLES: '/soe/tables',
    INTEGRATIONS: '/soe/integrations',
    PATIENTS: '/soe/patients',
    APPOINTMENTS: '/soe/appointments',
    DATA: (tableName: string) => `/soe/data/${tableName}`,
  },
} as const;
