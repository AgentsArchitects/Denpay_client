# DenPay Client Onboarding API

FastAPI backend for the DenPay Client Onboarding and Management system.

## Features

- **Authentication**: JWT-based authentication
- **Client Management**: Full CRUD operations for client onboarding
- **User Management**: WorkFin users and client-specific users
- **Compass Dates**: Payment schedule management
- **Xero Integration**: OAuth connection management
- **Chart of Accounts**: CoA category management

## Tech Stack

- **Framework**: FastAPI 0.115.6
- **Database**: PostgreSQL (via Supabase)
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT tokens via python-jose
- **Password Hashing**: bcrypt via passlib
- **Server**: Uvicorn

## Project Structure

```
Workfin_backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/      # API endpoints
│   │       │   ├── auth.py
│   │       │   ├── clients.py
│   │       │   ├── users.py
│   │       │   ├── compass.py
│   │       │   ├── xero.py
│   │       │   └── coa.py
│   │       └── api.py          # API router
│   ├── core/
│   │   ├── config.py           # Configuration settings
│   │   └── security.py         # JWT & password utilities
│   └── schemas/                # Pydantic models
│       ├── auth.py
│       ├── client.py
│       ├── user.py
│       ├── compass.py
│       ├── xero.py
│       └── coa.py
├── main.py                     # FastAPI app entry point
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables
└── README.md
```

## Setup Instructions

### 1. Create Virtual Environment

```bash
cd Workfin_backend
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

Update the `.env` file with your Supabase credentials:
- `DATABASE_URL`: Your PostgreSQL connection string
- `SECRET_KEY`: A strong secret key for JWT tokens
- `CORS_ORIGINS`: Frontend URLs (comma-separated)

### 5. Run the Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at: `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout user

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/{client_id}` - Get client details
- `POST /api/clients` - Create new client
- `PUT /api/clients/{client_id}` - Update client
- `DELETE /api/clients/{client_id}` - Delete client
- `GET /api/clients/{client_id}/users` - Get client users
- `POST /api/clients/{client_id}/users` - Create client user

### Users
- `GET /api/users` - List all WorkFin users
- `GET /api/users/{user_id}` - Get user details
- `POST /api/users` - Create new user
- `PUT /api/users/{user_id}` - Update user
- `DELETE /api/users/{user_id}` - Delete user

### Compass Dates
- `GET /api/compass/dates` - List all compass dates
- `GET /api/compass/dates/{compass_id}` - Get compass date details
- `POST /api/compass/dates` - Create new compass date
- `PUT /api/compass/dates/{compass_id}` - Update compass date
- `DELETE /api/compass/dates/{compass_id}` - Delete compass date

### Xero Integration
- `GET /api/xero` - List all Xero connections
- `GET /api/xero/{connection_id}` - Get connection details
- `POST /api/xero/connect` - Connect to Xero (OAuth)
- `POST /api/xero/disconnect/{connection_id}` - Disconnect from Xero

### Chart of Accounts
- `GET /api/coa/categories` - List all CoA categories
- `GET /api/coa/categories/{category_id}` - Get category details
- `POST /api/coa/categories` - Create new category
- `PUT /api/coa/categories/{category_id}` - Update category
- `DELETE /api/coa/categories/{category_id}` - Delete category

## Current Status

✅ **Completed:**
- FastAPI project structure
- All API endpoints with mock data
- Pydantic schemas for all models
- JWT authentication
- CORS configuration

⏳ **Next Steps:**
- Connect to Supabase PostgreSQL database
- Create database models with SQLAlchemy
- Implement database migrations with Alembic
- Replace mock data with actual database queries

## Demo Credentials

For testing the login endpoint:
- **Email**: ajay.lad@workfin.com
- **Password**: Demo@123

## Development

### Run with Auto-Reload
```bash
uvicorn main:app --reload --port 8000
```

### Run in Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## License

Proprietary - DenPay System
