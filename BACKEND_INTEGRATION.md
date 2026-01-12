# Backend Integration Guide

## Overview

Your DenPay Client Onboarding system is now connected to a FastAPI backend. This guide explains how everything works and how to get started.

## Architecture

```
Frontend (React + Vite)  →  FastAPI Backend  →  Supabase PostgreSQL
Port: 5174                   Port: 8000           (To be connected)
```

## What's Been Set Up

### ✅ FastAPI Backend
- **Location**: `D:\Softgetix\Denpay\Workfin_backend`
- **Status**: Running on http://localhost:8000
- **Documentation**: http://localhost:8000/api/docs

### ✅ API Services Layer (Frontend)
- **Location**: `src/services/`
- All API endpoints configured
- JWT authentication handling
- Error handling with interceptors

### ⏳ Database Connection
- Ready to connect to Supabase PostgreSQL
- SQLAlchemy models need to be created
- Waiting for database schema

---

## Quick Start Guide

### 1. Start the FastAPI Backend

**Navigate to backend directory:**
```bash
cd D:\Softgetix\Denpay\Workfin_backend
```

**Activate virtual environment:**
```bash
venv\Scripts\activate
```

**Start the server:**
```bash
uvicorn main:app --reload --port 8000
```

The backend will be available at: http://localhost:8000

### 2. Start the React Frontend

**Navigate to frontend directory:**
```bash
cd D:\Softgetix\Denpay\Workfin_client_ui
```

**Start development server:**
```bash
npm run dev
```

The frontend will be available at: http://localhost:5174

### 3. Test the Connection

1. Open http://localhost:5174 in your browser
2. Login with demo credentials:
   - **Email**: ajay.lad@workfin.com
   - **Password**: Demo@123
3. The frontend will authenticate with the backend API

---

## API Endpoints

All endpoints are prefixed with `/api`

### Authentication
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout user

### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create new client
- `GET /api/clients/{id}` - Get client details
- `PUT /api/clients/{id}` - Update client
- `DELETE /api/clients/{id}` - Delete client
- `GET /api/clients/{id}/users` - Get client users
- `POST /api/clients/{id}/users` - Create client user

### Users
- `GET /api/users` - List WorkFin users
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Compass Dates
- `GET /api/compass/dates` - List compass dates
- `POST /api/compass/dates` - Create compass date
- `PUT /api/compass/dates/{id}` - Update compass date
- `DELETE /api/compass/dates/{id}` - Delete compass date

### Xero Integration
- `GET /api/xero` - List Xero connections
- `POST /api/xero/connect` - Connect to Xero
- `POST /api/xero/disconnect/{id}` - Disconnect from Xero

### Chart of Accounts
- `GET /api/coa/categories` - List CoA categories
- `POST /api/coa/categories` - Create category
- `PUT /api/coa/categories/{id}` - Update category
- `DELETE /api/coa/categories/{id}` - Delete category

---

## Environment Variables

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Backend (.env)
```env
# Database (update with your Supabase credentials)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/database

# JWT
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:5174,http://localhost:5173

# API
API_V1_PREFIX=/api
PROJECT_NAME=DenPay Client Onboarding API
```

---

## Current Status

### ✅ Working Features
- FastAPI backend with all endpoints
- React frontend with API service layer
- JWT authentication
- CORS configured
- Mock data for testing

### ⏳ Next Steps
1. **Connect to Supabase Database**
   - Create database models (SQLAlchemy)
   - Set up migrations (Alembic)
   - Update endpoints to use database
   - Replace mock data

2. **Update Components**
   - Connect React components to API services
   - Remove localStorage persistence
   - Add loading states
   - Implement error handling

---

## How to Use API Services in Components

The API services are already created in `src/services/`. Here's how to use them:

### Example: Login
```typescript
import { authService } from '../services';

const handleLogin = async (email: string, password: string) => {
  try {
    const response = await authService.login({ email, password });
    console.log('Login successful:', response);
    // Navigate to dashboard
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### Example: Get Clients
```typescript
import { clientService } from '../services';

const fetchClients = async () => {
  try {
    const clients = await clientService.getClients();
    console.log('Clients:', clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
  }
};
```

### Example: Create User
```typescript
import { userService } from '../services';

const createUser = async (userData) => {
  try {
    const newUser = await userService.createUser({
      full_name: userData.fullName,
      email: userData.email,
      role: userData.role
    });
    console.log('User created:', newUser);
  } catch (error) {
    console.error('Error creating user:', error);
  }
};
```

---

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

These provide interactive API documentation where you can test endpoints directly.

---

## Troubleshooting

### Backend won't start
```bash
# Make sure you're in the backend directory
cd D:\Softgetix\Denpay\Workfin_backend

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --port 8000
```

### Frontend can't connect to backend
1. Ensure backend is running on port 8000
2. Check `.env` file in frontend has correct API URL
3. Check CORS settings in backend `.env`

### CORS errors
Make sure `CORS_ORIGINS` in backend `.env` includes your frontend URL:
```env
CORS_ORIGINS=http://localhost:5174,http://localhost:5173
```

---

## Next: Database Integration

To connect to your Supabase PostgreSQL database:

1. **Get your Supabase connection string**
2. **Update backend `.env` file** with your DATABASE_URL
3. **Create database models** (SQLAlchemy)
4. **Run migrations** (Alembic)
5. **Update API endpoints** to use database instead of mock data

Share your database schema, and I'll help you set this up!

---

## Demo Credentials

**Email**: ajay.lad@workfin.com
**Password**: Demo@123

---

## Support

- Backend README: `D:\Softgetix\Denpay\Workfin_backend\README.md`
- API Docs: http://localhost:8000/api/docs
- Frontend running on: http://localhost:5174
- Backend running on: http://localhost:8000
