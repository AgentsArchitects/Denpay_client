# Azure Deployment Checklist

## Current Status Summary

✓ **Database Migration**: Completed successfully
  - 45 tables in `denpay-dev` schema
  - 11 tables in `xero` schema
  - Azure PostgreSQL: `pgsql-uat-uk-workfin-02.postgres.database.azure.com`

✓ **Frontend Build**: Production build created
  - Latest build: Jan 23 12:27 in `dist/` folder
  - Contains updated API URL: `https://api-uat-uk-workfin-02.azurewebsites.net/api`

✓ **Backend Configuration**: Ready for deployment
  - API routes configured at `/api/*`
  - Static file serving configured
  - CORS configured for Azure domain

⚠️ **Deployment Status**: Frontend build needs to be copied to backend static folder

## Step-by-Step Deployment Guide

### Step 1: Copy Latest Frontend Build to Backend

The latest frontend build (with correct Azure API URL) is in the `dist/` folder but needs to be copied to `Workfin_backend/static/`.

```bash
# Remove old static files
rm -rf Workfin_backend/static/*

# Copy new build
cp -r dist/* Workfin_backend/static/

# Verify copy was successful
ls -la Workfin_backend/static/
```

**What this does**: Ensures the backend serves the latest frontend build with the correct API configuration pointing to Azure.

### Step 2: Verify Local Configuration Files

Before deploying, ensure your local `.env` files are properly configured (they are already set up):

**Frontend** (`d:\Workfin_client_ui\.env`):
```env
VITE_API_BASE_URL=https://api-uat-uk-workfin-02.azurewebsites.net/api
```

**Backend** (`d:\Workfin_client_ui\Workfin_backend\.env`):
```env
DATABASE_URL=postgresql+asyncpg://dp_admin:PZDlJ0B1TU5g3h@pgsql-uat-uk-workfin-02.postgres.database.azure.com:5432/workfin_uat_db?ssl=require
```

**Note**: These local `.env` files are for development only. Azure uses environment variables set in the App Service.

### Step 3: Commit and Push Changes

```bash
# Stage the updated static files
git add Workfin_backend/static/

# Create commit
git commit -m "Update frontend build with Azure PostgreSQL configuration

- Latest frontend build with correct API URL
- Database migrated to Azure PostgreSQL
- Ready for deployment

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to trigger Azure deployment
git push origin azure_deploy
```

**What this does**: Triggers the Azure deployment workflow that will deploy your updated application.

### Step 4: Verify Azure App Service Environment Variables

Ensure these environment variables are set in Azure App Service `api-uat-uk-workfin-02`:

```bash
az webapp config appsettings list \
  --name api-uat-uk-workfin-02 \
  --resource-group rg-uat-uk-01 \
  --query "[].{name:name, value:value}" \
  --output table
```

**Required Environment Variables**:
- `DATABASE_URL`: Azure PostgreSQL connection string
- `SECRET_KEY`: JWT secret (should be strong in production)
- `CORS_ORIGINS`: Should include `https://api-uat-uk-workfin-02.azurewebsites.net`
- `XERO_CLIENT_ID`: Your Xero OAuth client ID
- `XERO_CLIENT_SECRET`: Your Xero OAuth client secret
- `XERO_REDIRECT_URI`: `https://api-uat-uk-workfin-02.azurewebsites.net/api/xero/callback`

If any are missing, set them:

```bash
az webapp config appsettings set \
  --name api-uat-uk-workfin-02 \
  --resource-group rg-uat-uk-01 \
  --settings \
    DATABASE_URL="postgresql+asyncpg://dp_admin:PZDlJ0B1TU5g3h@pgsql-uat-uk-workfin-02.postgres.database.azure.com:5432/workfin_uat_db?ssl=require" \
    SECRET_KEY="<generate-a-strong-secret>" \
    CORS_ORIGINS="https://api-uat-uk-workfin-02.azurewebsites.net,http://localhost:5174" \
    API_V1_PREFIX="/api" \
    XERO_CLIENT_ID="CB00641375904E9A8A9C0E2E77C47962" \
    XERO_CLIENT_SECRET="MPv9QWv-ZsU_5gZe2wJle3BUJikRcg6vYb0HYEZMUIJ8qpD8" \
    XERO_REDIRECT_URI="https://api-uat-uk-workfin-02.azurewebsites.net/api/xero/callback" \
    XERO_SCOPES="openid profile email accounting.transactions accounting.contacts accounting.settings accounting.journals.read offline_access"
```

### Step 5: Monitor Deployment

Watch the deployment progress:

**Via Azure Portal**:
1. Go to Azure Portal → App Services → `api-uat-uk-workfin-02`
2. Click on "Deployment Center" in left menu
3. Watch the deployment logs

**Via CLI**:
```bash
az webapp log tail \
  --name api-uat-uk-workfin-02 \
  --resource-group rg-uat-uk-01
```

### Step 6: Restart App Service (if needed)

After updating environment variables, restart the app:

```bash
az webapp restart \
  --name api-uat-uk-workfin-02 \
  --resource-group rg-uat-uk-01
```

### Step 7: Test Deployment

Test each component to verify everything works:

#### A. Health Check
```bash
curl https://api-uat-uk-workfin-02.azurewebsites.net/health
```
**Expected**: `{"status":"healthy"}`

#### B. API Documentation
Open in browser: https://api-uat-uk-workfin-02.azurewebsites.net/api/docs

**Expected**: Interactive Swagger UI with all API endpoints

#### C. Database Connection (via API)
```bash
curl https://api-uat-uk-workfin-02.azurewebsites.net/api/clients
```
**Expected**: `[]` (empty array, no clients created yet)

**If you get an error**: Check Azure logs for database connection issues

#### D. Frontend Application
Open in browser: https://api-uat-uk-workfin-02.azurewebsites.net/

**Expected**: React application loads with login page

**Check in browser console**: Should NOT see any localhost:8001 URLs

#### E. Frontend to Backend Communication
1. Open browser console (F12)
2. Navigate to "Client Onboarding" in the app
3. Check Network tab

**Expected**: All API requests go to `https://api-uat-uk-workfin-02.azurewebsites.net/api/*`

#### F. Create Test Client
1. Fill out the Client Onboarding form
2. Submit
3. Verify client appears in the clients list

**If successful**: Database is working correctly!

### Step 8: Update Xero OAuth Configuration

Update your Xero App settings at https://developer.xero.com/app/manage:

1. Go to your Xero app: "DenPay Client Onboarding"
2. Update Redirect URI to: `https://api-uat-uk-workfin-02.azurewebsites.net/api/xero/callback`
3. Save changes

**Test Xero Integration**:
1. In the app, go to Xero Integrations
2. Click "Connect to Xero"
3. Should redirect to Xero login
4. After authorization, should redirect back to your app

## Common Issues and Solutions

### Issue: Frontend shows "Failed to fetch" errors

**Cause**: Frontend built with wrong API URL or CORS misconfiguration

**Solution**:
1. Verify `VITE_API_BASE_URL` in `.env` is correct
2. Rebuild frontend: `npm run build`
3. Copy to backend static: `cp -r dist/* Workfin_backend/static/`
4. Redeploy

### Issue: API returns 404 for all endpoints

**Cause**: API_V1_PREFIX not set correctly

**Solution**:
```bash
az webapp config appsettings set \
  --name api-uat-uk-workfin-02 \
  --resource-group rg-uat-uk-01 \
  --settings API_V1_PREFIX="/api"
```

### Issue: Database connection fails

**Cause**: Firewall rules or connection string incorrect

**Solution**:
1. Verify DATABASE_URL in Azure App Service settings
2. Check Azure PostgreSQL firewall rules allow Azure services
3. Check Azure logs: `az webapp log tail --name api-uat-uk-workfin-02 --resource-group rg-uat-uk-01`

### Issue: CORS errors in browser console

**Cause**: CORS_ORIGINS not configured correctly

**Solution**:
```bash
az webapp config appsettings set \
  --name api-uat-uk-workfin-02 \
  --resource-group rg-uat-uk-01 \
  --settings CORS_ORIGINS="https://api-uat-uk-workfin-02.azurewebsites.net"
```

### Issue: Xero OAuth fails with "Invalid redirect URI"

**Cause**: Xero app not configured with Azure redirect URI

**Solution**: Update redirect URI in Xero developer portal (see Step 8 above)

## Local Development vs. Production

### Local Development
- Frontend runs on: `http://localhost:5174` (Vite dev server)
- Backend runs on: `http://localhost:8000` (FastAPI uvicorn)
- Database: Azure PostgreSQL (requires firewall rule for your IP)
- Use `.env` files for configuration

### Production (Azure)
- Frontend served from: Backend static files at `/`
- Backend API at: `/api/*`
- Database: Azure PostgreSQL (firewall allows Azure services)
- Environment variables set in Azure App Service
- All traffic on: `https://api-uat-uk-workfin-02.azurewebsites.net`

## Quick Reference: Important URLs

### Production URLs
- **Application**: https://api-uat-uk-workfin-02.azurewebsites.net/
- **API Docs**: https://api-uat-uk-workfin-02.azurewebsites.net/api/docs
- **Health Check**: https://api-uat-uk-workfin-02.azurewebsites.net/health
- **Clients API**: https://api-uat-uk-workfin-02.azurewebsites.net/api/clients
- **Xero Callback**: https://api-uat-uk-workfin-02.azurewebsites.net/api/xero/callback

### Azure Resources
- **App Service**: `api-uat-uk-workfin-02`
- **Resource Group**: `rg-uat-uk-01`
- **Database Server**: `pgsql-uat-uk-workfin-02.postgres.database.azure.com`
- **Database Name**: `workfin_uat_db`

### Developer Resources
- **Xero App Management**: https://developer.xero.com/app/manage
- **Azure Portal**: https://portal.azure.com

## Next Actions

1. [ ] Copy latest frontend build to backend static folder
2. [ ] Commit and push changes
3. [ ] Verify Azure environment variables
4. [ ] Monitor deployment
5. [ ] Test all endpoints
6. [ ] Update Xero OAuth redirect URI
7. [ ] Create first test client

---

**Note**: The database migration is complete and ready. The main remaining task is to copy the frontend build and deploy.
