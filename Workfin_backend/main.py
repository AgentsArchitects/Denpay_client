import sys
import io

# Fix Windows console encoding to support Unicode characters
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import HTTPException
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Import routers
from app.api.v1.api import api_router
from app.core.config import settings
from app.db.database import engine, Base

# Import all models so they are registered with Base.metadata
from app.db import models  # noqa: F401
from app.db import xero_models  # noqa: F401
from app.db import pms_models  # noqa: F401

load_dotenv()


async def create_xero_tables():
    """Create xero schema and tables if they don't exist"""
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text('CREATE SCHEMA IF NOT EXISTS xero'))
        # Only create xero schema tables, not all models
        xero_tables = [
            t for t in Base.metadata.sorted_tables
            if t.schema == "xero"
        ]
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(sync_conn, tables=xero_tables)
        )
    print("Xero tables verified/created successfully.")


async def create_pms_tables():
    """Create integrations and soe schemas and tables if they don't exist"""
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text('CREATE SCHEMA IF NOT EXISTS integrations'))
        await conn.execute(text('CREATE SCHEMA IF NOT EXISTS soe'))
        pms_tables = [
            t for t in Base.metadata.sorted_tables
            if t.schema in ("integrations", "soe")
        ]
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(sync_conn, tables=pms_tables)
        )
    print("PMS/SOE tables verified/created successfully.")


async def ensure_columns_and_backfill():
    """Ensure tenant_id and integration_id columns exist, then backfill any NULLs"""
    from sqlalchemy import text
    from app.db.utils import generate_alphanumeric_id
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        try:
            # Step 1: Add tenant_id column to clients if it doesn't exist
            await session.execute(text('''
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'denpay-dev' AND table_name = 'clients' AND column_name = 'tenant_id'
                    ) THEN
                        ALTER TABLE "denpay-dev".clients ADD COLUMN tenant_id VARCHAR(8);
                    END IF;
                END $$;
            '''))
            await session.commit()
            print("Ensured tenant_id column exists on clients table.")
        except Exception as e:
            print(f"Warning: Could not ensure tenant_id column: {e}")
            await session.rollback()

        try:
            # Step 2: Add integration_id column to pms_connections if it doesn't exist
            await session.execute(text('''
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'integrations' AND table_name = 'pms_connections' AND column_name = 'integration_id'
                    ) THEN
                        ALTER TABLE integrations.pms_connections ADD COLUMN integration_id VARCHAR(8);
                    END IF;
                END $$;
            '''))
            await session.commit()
            print("Ensured integration_id column exists on pms_connections table.")
        except Exception as e:
            print(f"Warning: Could not ensure integration_id column: {e}")
            await session.rollback()

        try:
            # Step 3: Backfill tenant_id for existing clients
            result = await session.execute(
                text('SELECT id FROM "denpay-dev".clients WHERE tenant_id IS NULL')
            )
            clients_without_tenant = result.fetchall()
            for row in clients_without_tenant:
                tid = generate_alphanumeric_id()
                await session.execute(
                    text('UPDATE "denpay-dev".clients SET tenant_id = :tid WHERE id = :cid'),
                    {"tid": tid, "cid": row[0]}
                )

            if clients_without_tenant:
                print(f"Backfilled tenant_id for {len(clients_without_tenant)} client(s).")

            # Step 4: Backfill integration_id for PMS connections
            result = await session.execute(
                text('SELECT id FROM integrations.pms_connections WHERE integration_id IS NULL')
            )
            connections_without_id = result.fetchall()
            for row in connections_without_id:
                iid = generate_alphanumeric_id()
                await session.execute(
                    text('UPDATE integrations.pms_connections SET integration_id = :iid WHERE id = :cid'),
                    {"iid": iid, "cid": row[0]}
                )

            if connections_without_id:
                print(f"Backfilled integration_id for {len(connections_without_id)} PMS connection(s).")

            await session.commit()
        except Exception as e:
            print(f"Backfill skipped: {e}")
            await session.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting DenPay Client Onboarding API...")
    try:
        await create_xero_tables()
    except Exception as e:
        print(f"Warning: Could not auto-create xero tables: {e}")
    try:
        await create_pms_tables()
    except Exception as e:
        print(f"Warning: Could not auto-create PMS/SOE tables: {e}")
    try:
        await ensure_columns_and_backfill()
    except Exception as e:
        print(f"Warning: Could not backfill IDs: {e}")
    yield
    # Shutdown
    print("Shutting down DenPay Client Onboarding API...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan
)

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "frame-ancestors 'none'"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Serve static files (frontend assets)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    # Mount assets folder
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


# Custom exception handler for 404 - serve SPA for non-API routes
@app.exception_handler(404)
async def custom_404_handler(request: Request, _exc: HTTPException):
    # If it's an API route, return JSON 404
    if request.url.path.startswith(settings.API_V1_PREFIX):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})

    # For all other routes, serve the SPA index.html (for client-side routing)
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    index_path = os.path.join(static_dir, "index.html")

    if os.path.exists(index_path):
        return FileResponse(index_path)

    return JSONResponse(status_code=404, content={"detail": "Not Found"})


# Serve root and frontend routes
@app.get("/")
async def serve_root():
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "DenPay Client Onboarding API", "version": "1.0.0"}


# Catch-all for frontend routes (for SPA routing)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # Don't intercept API routes - let them return 404 properly
    if full_path.startswith("api/") or full_path.startswith("api"):
        return JSONResponse(status_code=404, content={"detail": "API route not found"})
    
    static_dir = os.path.join(os.path.dirname(__file__), "static")

    # Try to serve as a static file first
    file_path = os.path.join(static_dir, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    # If not a static file and not an API route, serve index.html (SPA routing)
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return JSONResponse(status_code=404, content={"detail": "Frontend not found"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
