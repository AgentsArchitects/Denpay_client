from fastapi import APIRouter
from app.api.v1.endpoints import auth, clients, users, compass, xero, coa, soe, pms_integrations, soe_data, dashboard

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(compass.router, prefix="/compass", tags=["Compass"])
api_router.include_router(xero.router, prefix="/xero", tags=["Xero"])
api_router.include_router(coa.router, prefix="/coa", tags=["Chart of Accounts"])
api_router.include_router(soe.router, prefix="/soe", tags=["SOE"])
api_router.include_router(pms_integrations.router, prefix="/pms", tags=["PMS Integrations"])
api_router.include_router(soe_data.router, prefix="/soe-data", tags=["SOE Data"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
