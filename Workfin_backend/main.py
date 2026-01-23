from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Import routers
from app.api.v1.api import api_router
from app.core.config import settings

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting DenPay Client Onboarding API...")
    yield
    # Shutdown
    print("Shutting down DenPay Client Onboarding API...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan
)

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

# Serve frontend for all non-API routes (must be last!)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # Serve index.html for SPA routing
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    index_path = os.path.join(static_dir, "index.html")
    
    # Check if requesting a specific static file
    file_path = os.path.join(static_dir, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Otherwise serve index.html (SPA routing)
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {"message": "DenPay Client Onboarding API", "version": "1.0.0"}
