from fastapi import APIRouter, Depends
from app.api.v1.endpoints import auth, clients, users, compass, xero, coa, soe, pms_integrations, soe_data, dashboard
from app.api.v1.endpoints.auth import require_admin

api_router = APIRouter()

# Auth routes (public - login, refresh, accept-invitation don't need auth)
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# All other routes require JWT authentication + WORKFIN_ADMIN role
admin_auth = [Depends(require_admin)]
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"], dependencies=admin_auth)
api_router.include_router(users.router, prefix="/users", tags=["Users"], dependencies=admin_auth)
api_router.include_router(compass.router, prefix="/compass", tags=["Compass"], dependencies=admin_auth)
api_router.include_router(xero.router, prefix="/xero", tags=["Xero"], dependencies=admin_auth)
api_router.include_router(coa.router, prefix="/coa", tags=["Chart of Accounts"], dependencies=admin_auth)
api_router.include_router(soe.router, prefix="/soe", tags=["SOE"], dependencies=admin_auth)
api_router.include_router(pms_integrations.router, prefix="/pms", tags=["PMS Integrations"], dependencies=admin_auth)
api_router.include_router(soe_data.router, prefix="/soe-data", tags=["SOE Data"], dependencies=admin_auth)
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"], dependencies=admin_auth)
