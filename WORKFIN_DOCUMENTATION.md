# WorkFin Platform Documentation

## Technical Documentation & Implementation Guide

**Version:** 1.0
**Last Updated:** January 2026
**Project:** WorkFin Client UI with Xero Integration

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Frontend Application](#4-frontend-application)
5. [Backend API](#5-backend-api)
6. [Xero Integration](#6-xero-integration)
7. [Database Schema](#7-database-schema)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Configuration & Environment](#10-configuration--environment)

---

## 1. Project Overview

WorkFin is a comprehensive financial management platform that integrates with Xero accounting software to provide real-time synchronization of financial data. The platform enables businesses to:

- Connect to Xero accounts via OAuth 2.0
- Sync financial data including accounts, contacts, invoices, payments, and more
- View and manage synced data through an intuitive dashboard
- Perform quick syncs for rapid data updates
- Manage client onboarding and user administration

### Key Features

| Feature | Description |
|---------|-------------|
| Xero OAuth Integration | Secure OAuth 2.0 connection to Xero |
| Real-time Data Sync | Full and quick sync options |
| Multi-tenant Support | Support for multiple Xero organizations |
| Financial Data Views | 11 different data visualization pages |
| Client Management | Onboarding and user management |
| Power BI Integration | External reporting capabilities |

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Ant Design | 5.x | UI Component Library |
| React Router | 6.x | Navigation |
| Axios | 1.x | HTTP Client |
| Vite | 5.x | Build Tool |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.100+ | API Framework |
| SQLAlchemy | 2.x | ORM |
| asyncpg | 0.28+ | PostgreSQL Driver |
| httpx | 0.24+ | Async HTTP Client |
| Pydantic | 2.x | Data Validation |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 15+ | Primary Database |
| Supabase | - | Hosted PostgreSQL + PgBouncer |

### External Services
| Service | Purpose |
|---------|---------|
| Xero API | Accounting Data Source |
| Power BI | Business Intelligence Reports |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WORKFIN PLATFORM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐         ┌──────────────────┐                  │
│  │   React Frontend │         │   FastAPI Backend │                  │
│  │   (Port: 5174)   │◄───────►│   (Port: 8000)    │                  │
│  │                  │  REST   │                   │                  │
│  │  - Ant Design UI │  API    │  - OAuth Handler  │                  │
│  │  - React Router  │         │  - Sync Service   │                  │
│  │  - Axios Client  │         │  - Data Endpoints │                  │
│  └──────────────────┘         └─────────┬────────┘                  │
│                                         │                            │
│                                         │ SQLAlchemy                 │
│                                         │ + asyncpg                  │
│                                         ▼                            │
│                               ┌──────────────────┐                  │
│                               │   PostgreSQL      │                  │
│                               │   (Supabase)      │                  │
│                               │                   │                  │
│                               │  - xero schema    │                  │
│                               │  - public schema  │                  │
│                               └──────────────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ OAuth 2.0 + REST API
                                    ▼
                          ┌──────────────────┐
                          │    XERO API       │
                          │                   │
                          │  - OAuth Server   │
                          │  - Accounting API │
                          └──────────────────┘
```

---

## 4. Frontend Application

### 4.1 Project Structure

```
src/
├── components/
│   └── layout/
│       ├── DashboardLayout.tsx    # Main layout wrapper
│       ├── SidebarNav.tsx         # Navigation sidebar
│       └── SidebarNav.css
├── config/
│   └── constants.ts               # API endpoints & config
├── pages/
│   ├── auth/
│   │   └── LoginPage.tsx          # Authentication
│   ├── compass/
│   │   ├── CompassDatesList.tsx   # Compass dates list
│   │   └── CompassDatesCreate.tsx # Create/edit compass dates
│   ├── dashboard/
│   │   └── Practice360.tsx        # Main dashboard
│   ├── onboarding/
│   │   ├── ClientOnboardingList.tsx   # Client list
│   │   ├── ClientOnboardingCreate.tsx # Create/edit client
│   │   └── ClientOnboardingUsers.tsx  # Client users
│   ├── users/
│   │   ├── WorkFinUserList.tsx    # User list
│   │   └── WorkFinUserCreate.tsx  # Create/edit user
│   └── xero/
│       ├── XeroList.tsx           # Xero connections
│       ├── XeroAccounts.tsx       # Chart of Accounts
│       ├── XeroContacts.tsx       # Contacts
│       ├── XeroContactGroups.tsx  # Contact Groups
│       ├── XeroInvoices.tsx       # Invoices
│       ├── XeroCreditNotes.tsx    # Credit Notes
│       ├── XeroPayments.tsx       # Payments
│       ├── XeroBankTransactions.tsx  # Bank Transactions
│       ├── XeroBankTransfers.tsx  # Bank Transfers
│       ├── XeroJournals.tsx       # Journals
│       └── XeroJournalLines.tsx   # Journal Lines
└── services/
    ├── api.ts                     # Axios configuration
    ├── xeroService.ts             # Xero API service
    └── index.ts                   # Service exports
```

### 4.2 Page Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | LoginPage | User authentication |
| `/dashboard` | Practice360 | Main dashboard |
| `/xero/list` | XeroList | Xero connections & sync |
| `/xero/accounts` | XeroAccounts | Chart of Accounts |
| `/xero/contacts` | XeroContacts | Contacts list |
| `/xero/contact-groups` | XeroContactGroups | Contact groups |
| `/xero/invoices` | XeroInvoices | Invoices list |
| `/xero/credit-notes` | XeroCreditNotes | Credit notes |
| `/xero/payments` | XeroPayments | Payments list |
| `/xero/bank-transactions` | XeroBankTransactions | Bank transactions |
| `/xero/bank-transfers` | XeroBankTransfers | Bank transfers |
| `/xero/journals` | XeroJournals | Journals list |
| `/xero/journal-lines` | XeroJournalLines | Journal line items |
| `/onboarding` | ClientOnboardingList | Client list |
| `/onboarding/create` | ClientOnboardingCreate | Create client |
| `/onboarding/edit/:id` | ClientOnboardingCreate | Edit client |
| `/users/list` | WorkFinUserList | User list |
| `/users/create` | WorkFinUserCreate | Create user |
| `/compass/list` | CompassDatesList | Compass dates |
| `/compass/create` | CompassDatesCreate | Create compass date |

### 4.3 Frontend Services

#### XeroService Methods

```typescript
interface XeroService {
  // OAuth & Connection
  authorize(): Promise<{ authorization_url: string }>;
  getTenants(): Promise<XeroTenant[]>;
  disconnect(): Promise<void>;
  getStatus(): Promise<{ connected: boolean; tokens: boolean }>;

  // Sync Operations
  syncAll(tenantId: string): Promise<XeroSyncResponse[]>;
  syncQuick(tenantId: string, limit?: number): Promise<XeroSyncResponse[]>;

  // Data Retrieval
  getAccounts(params?): Promise<PaginatedResponse<XeroAccountData>>;
  getContacts(params?): Promise<PaginatedResponse<XeroContactData>>;
  getContactGroups(params?): Promise<PaginatedResponse<XeroContactGroupData>>;
  getInvoices(params?): Promise<PaginatedResponse<XeroInvoiceData>>;
  getCreditNotes(params?): Promise<PaginatedResponse<XeroCreditNoteData>>;
  getPayments(params?): Promise<PaginatedResponse<XeroPaymentData>>;
  getBankTransactions(params?): Promise<PaginatedResponse<XeroBankTransactionData>>;
  getBankTransfers(params?): Promise<PaginatedResponse<XeroBankTransferData>>;
  getJournals(params?): Promise<PaginatedResponse<XeroJournalData>>;
  getJournalLines(params?): Promise<PaginatedResponse<XeroJournalLineData>>;
}
```

---

## 5. Backend API

### 5.1 Project Structure

```
Workfin_backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/
│   │           └── xero.py        # Xero API endpoints
│   ├── core/
│   │   └── config.py              # Application settings
│   ├── db/
│   │   ├── database.py            # Database connection
│   │   └── xero_models.py         # SQLAlchemy models
│   ├── schemas/
│   │   └── xero.py                # Pydantic schemas
│   └── services/
│       └── xero_service.py        # Xero API client
├── main.py                        # FastAPI application
└── requirements.txt               # Python dependencies
```

### 5.2 Key Backend Components

#### Database Configuration (PgBouncer Compatible)

```python
# Custom connection class for PgBouncer compatibility
class PgBouncerConnection(Connection):
    def _get_unique_id(self, prefix: str) -> str:
        return f"__asyncpg_{prefix}_{uuid4()}__"

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True,
    poolclass=NullPool,
    connect_args={
        "server_settings": {"search_path": '"denpay-dev", public'},
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0,
        "connection_class": PgBouncerConnection,
    },
)
```

#### Xero Service (OAuth & API Client)

```python
class XeroService:
    AUTHORIZATION_URL = "https://login.xero.com/identity/connect/authorize"
    TOKEN_URL = "https://identity.xero.com/connect/token"
    CONNECTIONS_URL = "https://api.xero.com/connections"
    API_BASE_URL = "https://api.xero.com/api.xro/2.0"

    # OAuth Methods
    def get_authorization_url(state: str) -> str
    async def exchange_code_for_tokens(code: str) -> Dict
    async def refresh_access_token(refresh_token: str) -> Dict
    async def get_valid_token() -> Optional[str]

    # API Methods
    async def get_tenants() -> List[Dict]
    async def get_accounts(tenant_id: str) -> List[Dict]
    async def get_contacts(tenant_id: str, page: int) -> List[Dict]
    async def get_contact_groups(tenant_id: str) -> List[Dict]
    async def get_invoices(tenant_id: str, page: int) -> List[Dict]
    async def get_credit_notes(tenant_id: str, page: int) -> List[Dict]
    async def get_payments(tenant_id: str, page: int) -> List[Dict]
    async def get_bank_transactions(tenant_id: str, page: int) -> List[Dict]
    async def get_bank_transfers(tenant_id: str) -> List[Dict]
    async def get_journals(tenant_id: str, offset: int) -> List[Dict]
```

---

## 6. Xero Integration

### 6.1 OAuth 2.0 Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │     │Frontend │     │ Backend │     │  Xero   │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ Click Connect │               │               │
     │──────────────►│               │               │
     │               │               │               │
     │               │ GET /authorize│               │
     │               │──────────────►│               │
     │               │               │               │
     │               │ auth_url      │               │
     │               │◄──────────────│               │
     │               │               │               │
     │ Redirect to Xero              │               │
     │◄──────────────│               │               │
     │               │               │               │
     │ Xero Login & Consent          │               │
     │──────────────────────────────────────────────►│
     │               │               │               │
     │ Redirect with code            │               │
     │◄──────────────────────────────────────────────│
     │               │               │               │
     │ GET /callback?code=xxx        │               │
     │──────────────────────────────►│               │
     │               │               │               │
     │               │               │ Exchange code │
     │               │               │──────────────►│
     │               │               │               │
     │               │               │ Access Token  │
     │               │               │◄──────────────│
     │               │               │               │
     │               │               │ Store Token   │
     │               │               │ in Database   │
     │               │               │               │
     │ Redirect to /xero/list?connected              │
     │◄──────────────────────────────│               │
     │               │               │               │
```

### 6.2 Data Synchronization

#### Full Sync
Syncs all data from Xero with pagination support:
- Fetches all pages of each entity type
- Commits in batches of 50 records
- Syncs 10 entity types in sequence

#### Quick Sync
Fast sync with limited records (default: 20 per entity):
- Single page fetch per entity
- Syncs all 10 entity types
- Ideal for quick data updates

#### Synced Entity Types

| Entity | Full Sync | Quick Sync | Pagination |
|--------|-----------|------------|------------|
| Accounts | Yes | Yes (limited) | No |
| Contacts | Yes | Yes (limited) | 100/page |
| Contact Groups | Yes | Yes (limited) | No |
| Invoices | Yes | Yes (limited) | 100/page |
| Credit Notes | Yes | Yes (limited) | 100/page |
| Payments | Yes | Yes (limited) | 100/page |
| Bank Transactions | Yes | Yes (limited) | 100/page |
| Bank Transfers | Yes | Yes (limited) | No |
| Journals | Yes | Yes (limited) | Offset-based |
| Journal Lines | Yes (with Journals) | Yes (with Journals) | N/A |

---

## 7. Database Schema

### 7.1 Schema Overview

All Xero data is stored in the `xero` schema within PostgreSQL.

### 7.2 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           XERO SCHEMA                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐                           ┌──────────────┐        │
│  │   tokens     │                           │  accounts    │        │
│  ├──────────────┤                           ├──────────────┤        │
│  │ id (PK)      │                           │ id (PK)      │        │
│  │ client_id    │                           │ account_id   │        │
│  │ tenant_id    │                           │ tenant_id    │        │
│  │ access_token │                           │ code         │        │
│  │ refresh_token│                           │ name         │        │
│  │ expires_at   │                           │ type         │        │
│  └──────────────┘                           │ class        │        │
│                                             │ status       │        │
│  ┌──────────────┐                           └──────────────┘        │
│  │  contacts    │                                                    │
│  ├──────────────┤      ┌──────────────┐     ┌──────────────┐        │
│  │ id (PK)      │      │contactgroups │     │   invoices   │        │
│  │ contact_id   │      ├──────────────┤     ├──────────────┤        │
│  │ tenant_id    │      │ id (PK)      │     │ id (PK)      │        │
│  │ name         │      │ contact_     │     │ invoice_id   │        │
│  │ email        │      │ group_id     │     │ tenant_id    │        │
│  │ is_customer  │      │ tenant_id    │     │ contact_id   │◄──┐    │
│  │ is_supplier  │      │ name         │     │ date         │   │    │
│  └──────────────┘      │ status       │     │ due_date     │   │    │
│         ▲              └──────────────┘     │ total        │   │    │
│         │                                   │ status       │   │    │
│         │                                   └──────────────┘   │    │
│         │                                                      │    │
│         │              ┌──────────────┐     ┌──────────────┐   │    │
│         │              │ creditnotes  │     │   payments   │   │    │
│         │              ├──────────────┤     ├──────────────┤   │    │
│         │              │ id (PK)      │     │ id (PK)      │   │    │
│         │              │ credit_      │     │ payment_id   │   │    │
│         └──────────────│ note_id      │     │ tenant_id    │   │    │
│                        │ tenant_id    │     │ invoice_id   │───┘    │
│                        │ contact_id   │     │ date         │        │
│                        │ total        │     │ amount       │        │
│                        └──────────────┘     │ status       │        │
│                                             └──────────────┘        │
│                                                                      │
│  ┌──────────────┐      ┌──────────────┐     ┌──────────────┐        │
│  │bankTransact- │      │ BankTransfer │     │   journals   │        │
│  │ions          │      ├──────────────┤     ├──────────────┤        │
│  ├──────────────┤      │ id (PK)      │     │ id (PK)      │        │
│  │ id (PK)      │      │ bank_        │     │ journal_id   │◄──┐    │
│  │ bank_txn_id  │      │ transfer_id  │     │ tenant_id    │   │    │
│  │ tenant_id    │      │ tenant_id    │     │ journal_date │   │    │
│  │ contact_id   │      │ from_bank_id │     │ journal_num  │   │    │
│  │ date         │      │ to_bank_id   │     │ source_type  │   │    │
│  │ total        │      │ amount       │     └──────────────┘   │    │
│  │ status       │      │ date         │                        │    │
│  └──────────────┘      └──────────────┘     ┌──────────────┐   │    │
│                                             │journalsLines │   │    │
│                                             ├──────────────┤   │    │
│                                             │ id (PK)      │   │    │
│                                             │ journal_     │   │    │
│                                             │ line_id      │   │    │
│                                             │ journal_id   │───┘    │
│                                             │ account_id   │        │
│                                             │ net_amount   │        │
│                                             │ gross_amount │        │
│                                             └──────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Table Definitions

#### xero.tokens
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| client_id | UUID | Reference to client |
| tenant_id | VARCHAR(100) | Xero organization ID |
| tenant_name | VARCHAR(255) | Organization name |
| access_token | TEXT | OAuth access token |
| refresh_token | TEXT | OAuth refresh token |
| expires_at | TIMESTAMP | Token expiration |
| token_type | VARCHAR(50) | Bearer |
| scope | TEXT | OAuth scopes |

#### xero.accounts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| account_id | VARCHAR(100) | Xero Account ID (unique) |
| tenant_id | VARCHAR(100) | Xero organization ID |
| code | VARCHAR(50) | Account code |
| name | VARCHAR(255) | Account name |
| type | VARCHAR(50) | BANK, CURRENT, EQUITY, etc. |
| class | VARCHAR(50) | ASSET, LIABILITY, REVENUE, etc. |
| status | VARCHAR(50) | ACTIVE, ARCHIVED |
| currency_code | VARCHAR(10) | Currency |
| tax_type | VARCHAR(50) | Tax type |
| raw_data | JSONB | Full Xero response |
| synced_at | TIMESTAMP | Last sync time |

#### xero.contacts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| contact_id | VARCHAR(100) | Xero Contact ID (unique) |
| tenant_id | VARCHAR(100) | Xero organization ID |
| name | VARCHAR(500) | Contact name |
| email_address | VARCHAR(255) | Email |
| is_customer | BOOLEAN | Customer flag |
| is_supplier | BOOLEAN | Supplier flag |
| contact_status | VARCHAR(50) | ACTIVE, ARCHIVED |
| tax_number | VARCHAR(100) | Tax/VAT number |
| default_currency | VARCHAR(10) | Default currency |

#### xero.invoices
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| invoice_id | VARCHAR(100) | Xero Invoice ID (unique) |
| tenant_id | VARCHAR(100) | Xero organization ID |
| type | VARCHAR(50) | ACCPAY, ACCREC |
| invoice_number | VARCHAR(100) | Invoice number |
| contact_id | VARCHAR(100) | Associated contact |
| contact_name | VARCHAR(500) | Contact name |
| date | DATE | Invoice date |
| due_date | DATE | Due date |
| status | VARCHAR(50) | DRAFT, AUTHORISED, PAID, VOIDED |
| total | NUMERIC(18,2) | Total amount |
| amount_due | NUMERIC(18,2) | Amount due |
| amount_paid | NUMERIC(18,2) | Amount paid |
| currency_code | VARCHAR(10) | Currency |

#### xero.payments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| payment_id | VARCHAR(100) | Xero Payment ID (unique) |
| tenant_id | VARCHAR(100) | Xero organization ID |
| date | DATE | Payment date |
| amount | NUMERIC(18,2) | Payment amount |
| invoice_id | VARCHAR(100) | Associated invoice |
| status | VARCHAR(50) | AUTHORISED, DELETED |
| payment_type | VARCHAR(50) | Payment type |
| is_reconciled | BOOLEAN | Reconciliation status |

#### xero.journals / xero.journalsLines
| journals Column | Type | journalsLines Column | Type |
|-----------------|------|---------------------|------|
| journal_id | VARCHAR(100) | journal_line_id | VARCHAR(100) |
| tenant_id | VARCHAR(100) | journal_id | VARCHAR(100) |
| journal_date | DATE | account_id | VARCHAR(100) |
| journal_number | INTEGER | account_code | VARCHAR(50) |
| reference | VARCHAR(255) | account_name | VARCHAR(255) |
| source_type | VARCHAR(50) | net_amount | NUMERIC(18,2) |
| | | gross_amount | NUMERIC(18,2) |
| | | tax_amount | NUMERIC(18,2) |

---

## 8. API Endpoints Reference

### 8.1 OAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/xero/authorize` | Get Xero authorization URL |
| GET | `/api/v1/xero/callback` | OAuth callback handler |
| POST | `/api/v1/xero/disconnect` | Disconnect from Xero |
| GET | `/api/v1/xero/status` | Check connection status |
| GET | `/api/v1/xero/tenants` | Get connected organizations |

### 8.2 Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/xero/sync/all?tenant_id=xxx` | Full data sync |
| POST | `/api/v1/xero/sync/quick?tenant_id=xxx&limit=20` | Quick sync (limited) |
| POST | `/api/v1/xero/sync/accounts?tenant_id=xxx` | Sync accounts only |
| POST | `/api/v1/xero/sync/contacts?tenant_id=xxx` | Sync contacts only |
| POST | `/api/v1/xero/sync/contact-groups?tenant_id=xxx` | Sync contact groups |
| POST | `/api/v1/xero/sync/invoices?tenant_id=xxx` | Sync invoices only |
| POST | `/api/v1/xero/sync/credit-notes?tenant_id=xxx` | Sync credit notes |
| POST | `/api/v1/xero/sync/payments?tenant_id=xxx` | Sync payments only |
| POST | `/api/v1/xero/sync/bank-transactions?tenant_id=xxx` | Sync bank transactions |
| POST | `/api/v1/xero/sync/bank-transfers?tenant_id=xxx` | Sync bank transfers |
| POST | `/api/v1/xero/sync/journals?tenant_id=xxx` | Sync journals |

### 8.3 Data Retrieval Endpoints

| Method | Endpoint | Query Parameters |
|--------|----------|------------------|
| GET | `/api/v1/xero/data/accounts` | tenant_id, page, page_size |
| GET | `/api/v1/xero/data/contacts` | tenant_id, page, page_size, is_customer, is_supplier |
| GET | `/api/v1/xero/data/contact-groups` | tenant_id, page, page_size |
| GET | `/api/v1/xero/data/invoices` | tenant_id, page, page_size, status, type |
| GET | `/api/v1/xero/data/credit-notes` | tenant_id, page, page_size |
| GET | `/api/v1/xero/data/payments` | tenant_id, page, page_size |
| GET | `/api/v1/xero/data/bank-transactions` | tenant_id, page, page_size |
| GET | `/api/v1/xero/data/bank-transfers` | tenant_id, page, page_size |
| GET | `/api/v1/xero/data/journals` | tenant_id, page, page_size |
| GET | `/api/v1/xero/data/journal-lines` | tenant_id, journal_id, page, page_size |

### 8.4 Response Formats

#### Paginated Response
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

#### Sync Response
```json
{
  "entity_type": "accounts",
  "synced_count": 45,
  "status": "SUCCESS",
  "message": null
}
```

---

## 9. Data Flow Diagrams

### 9.1 Xero Connection Flow

```
User                    Frontend                  Backend                    Xero
  │                        │                         │                         │
  │ Click "Connect"        │                         │                         │
  │───────────────────────►│                         │                         │
  │                        │                         │                         │
  │                        │ GET /xero/authorize     │                         │
  │                        │────────────────────────►│                         │
  │                        │                         │                         │
  │                        │ { authorization_url }   │                         │
  │                        │◄────────────────────────│                         │
  │                        │                         │                         │
  │ Redirect to Xero       │                         │                         │
  │◄───────────────────────│                         │                         │
  │                        │                         │                         │
  │ Login & Authorize      │                         │                         │
  │────────────────────────────────────────────────────────────────────────────►
  │                        │                         │                         │
  │ Redirect with code     │                         │                         │
  │◄────────────────────────────────────────────────────────────────────────────
  │                        │                         │                         │
  │ GET /callback?code=xxx │                         │                         │
  │───────────────────────────────────────────────►│                         │
  │                        │                         │                         │
  │                        │                         │ POST /token             │
  │                        │                         │────────────────────────►│
  │                        │                         │                         │
  │                        │                         │ access_token            │
  │                        │                         │◄────────────────────────│
  │                        │                         │                         │
  │                        │                         │ Store in DB             │
  │                        │                         │                         │
  │ Redirect ?connected    │                         │                         │
  │◄───────────────────────────────────────────────│                         │
```

### 9.2 Data Sync Flow

```
User                    Frontend                  Backend                    Database
  │                        │                         │                         │
  │ Click "Sync All"       │                         │                         │
  │───────────────────────►│                         │                         │
  │                        │                         │                         │
  │                        │ POST /sync/all          │                         │
  │                        │────────────────────────►│                         │
  │                        │                         │                         │
  │                        │                         │ Get Token               │
  │                        │                         │────────────────────────►│
  │                        │                         │                         │
  │                        │                         │◄────────────────────────│
  │                        │                         │                         │
  │                        │                         │ Fetch from Xero API     │
  │                        │                         │ (Accounts, Contacts...) │
  │                        │                         │                         │
  │                        │                         │ Upsert Records          │
  │                        │                         │────────────────────────►│
  │                        │                         │                         │
  │                        │                         │ Commit                  │
  │                        │                         │────────────────────────►│
  │                        │                         │                         │
  │                        │ [{ entity: "accounts",  │                         │
  │                        │    synced: 45 }, ...]   │                         │
  │                        │◄────────────────────────│                         │
  │                        │                         │                         │
  │ Show Results           │                         │                         │
  │◄───────────────────────│                         │                         │
```

---

## 10. Configuration & Environment

### 10.1 Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname

# Xero OAuth
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=http://localhost:8000/api/v1/xero/callback
XERO_SCOPES=openid profile email accounting.transactions accounting.contacts accounting.settings accounting.journals.read offline_access

# Server
HOST=0.0.0.0
PORT=8000
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 10.2 Required Xero OAuth Scopes

| Scope | Purpose |
|-------|---------|
| `openid` | OpenID Connect |
| `profile` | User profile |
| `email` | User email |
| `accounting.transactions` | Invoices, payments, bank transactions |
| `accounting.contacts` | Contacts, contact groups |
| `accounting.settings` | Chart of accounts |
| `accounting.journals.read` | Journal entries |
| `offline_access` | Refresh tokens |

### 10.3 Running the Application

#### Backend
```bash
cd Workfin_backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd Workfin_client_ui
npm install
npm run dev
```

---

## Summary

The WorkFin platform provides a comprehensive solution for integrating with Xero accounting software. Key accomplishments include:

- **Complete OAuth 2.0 Integration**: Secure authentication flow with token refresh handling
- **Multi-tenant Support**: Connect and manage multiple Xero organizations
- **Comprehensive Data Sync**: 10 entity types with full and quick sync options
- **PgBouncer Compatibility**: Custom connection handling for Supabase deployment
- **Responsive UI**: Modern React frontend with Ant Design components
- **Paginated Data Views**: Efficient data display with filtering and search

### Entity Coverage

| Entity | Sync | Display | API Endpoint |
|--------|------|---------|--------------|
| Accounts | ✅ | ✅ | ✅ |
| Contacts | ✅ | ✅ | ✅ |
| Contact Groups | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ✅ |
| Credit Notes | ✅ | ✅ | ✅ |
| Payments | ✅ | ✅ | ✅ |
| Bank Transactions | ✅ | ✅ | ✅ |
| Bank Transfers | ✅ | ✅ | ✅ |
| Journals | ✅ | ✅ | ✅ |
| Journal Lines | ✅ | ✅ | ✅ |

---

*Document generated for WorkFin Platform - January 2026*
