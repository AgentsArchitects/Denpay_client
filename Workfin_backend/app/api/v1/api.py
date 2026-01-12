from fastapi import APIRouter
from app.api.v1.endpoints import auth, clients, users, compass, xero, coa

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(compass.router, prefix="/compass", tags=["Compass"])
api_router.include_router(xero.router, prefix="/xero", tags=["Xero"])
api_router.include_router(coa.router, prefix="/coa", tags=["Chart of Accounts"])
