# Environment Configuration Guide

## Environment Files Summary

### Frontend (React + Vite)
- **`.env`** - Active environment file (for both dev & production)
- **`.env.example`** - Template for developers

### Backend (FastAPI)
- **`.env`** - Active environment file with secrets
- **`.env.example`** - Template for developers

---

## Frontend Setup

### Local Development
Copy `.env.example` to `.env` (if not exists):
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Azure Production
Update `.env` before building:
```env
VITE_API_BASE_URL=https://api-uat-uk-workfin-02.azurewebsites.net/api/v1
```

Then rebuild:
```bash
npm run build
```

---

## Backend Setup

### Local Development
Copy `.env.example` to `.env`:
```bash
cd Workfin_backend
cp .env.example .env
```

Update with your credentials:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REDIRECT_URI=http://localhost:8000/api/v1/xero/callback
```

### Azure Production

**IMPORTANT:** Set these as Azure App Service environment variables (don't commit to Git):

```bash
az webapp config appsettings set --name api-uat-uk-workfin-02 --resource-group your-rg --settings \
  DATABASE_URL="your_supabase_url" \
  SECRET_KEY="strong-secret-key-here" \
  CORS_ORIGINS="https://your-frontend-url.azurewebsites.net,http://localhost:5174" \
  XERO_CLIENT_ID="your_xero_client_id" \
  XERO_CLIENT_SECRET="your_xero_client_secret" \
  XERO_REDIRECT_URI="https://api-uat-uk-workfin-02.azurewebsites.net/api/v1/xero/callback"
```

---

## Security Notes

### ⚠️ CRITICAL: Files to NEVER Commit
- `.env` (both frontend & backend)
- `.env.local`
- `.env.production`
- Any file with real credentials

### ✅ Safe to Commit
- `.env.example` (templates only)
- `.gitignore`

### Git Safety Check
Before committing, verify:
```bash
# Check what will be committed
git status

# If .env appears, it's NOT in gitignore!
# Make sure .gitignore includes:
# .env
# .env.local
# .env.*.local
```

---

## Deployment Checklist

### Frontend Deployment to Azure
- [ ] Update `.env` with Azure backend URL
- [ ] Run `npm run build`
- [ ] Push to GitHub (triggers Azure deployment)
- [ ] Verify build in Azure Static Web Apps / App Service

### Backend Deployment to Azure
- [ ] Set all environment variables in Azure App Service
- [ ] Update XERO_REDIRECT_URI to Azure URL
- [ ] Update CORS_ORIGINS to include frontend Azure URL
- [ ] Update Xero app settings at https://developer.xero.com/app/manage
  - Add redirect URI: `https://api-uat-uk-workfin-02.azurewebsites.net/api/v1/xero/callback`
- [ ] Deploy backend code to Azure

### Post-Deployment
- [ ] Test OAuth flow with Azure URLs
- [ ] Verify API calls work from frontend
- [ ] Check CORS settings if getting errors

---

## Common Issues

### Issue: "Failed to load resource: net::ERR_CONNECTION_REFUSED"
**Cause:** Frontend is pointing to wrong API URL (usually localhost instead of Azure)
**Fix:** Update `.env` → `VITE_API_BASE_URL` → Rebuild → Redeploy

### Issue: "CORS Error"
**Cause:** Backend CORS_ORIGINS doesn't include frontend URL
**Fix:** Add frontend URL to backend's CORS_ORIGINS environment variable

### Issue: "Xero OAuth fails"
**Cause:** Xero redirect URI doesn't match Azure backend
**Fix:**
1. Update XERO_REDIRECT_URI in Azure backend env vars
2. Update redirect URI in Xero app settings

---

## Current Configuration

### Frontend
- **Development:** Configured for Azure (`https://api-uat-uk-workfin-02.azurewebsites.net/api`)
- **Production:** Same as development (managed via `.env`)

### Backend
- **Development:** localhost:8000 with localhost Xero callback
- **Production:** Azure App Service with Azure Xero callback (set via Azure env vars)

---

*Last Updated: January 2026*
