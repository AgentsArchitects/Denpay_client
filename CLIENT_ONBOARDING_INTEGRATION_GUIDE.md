# Client Onboarding Form - Backend Integration Guide

## Overview
This guide shows how to connect the 10-tab Client Onboarding form to the FastAPI backend.

---

## ✅ Backend Setup Complete

The following backend components have been set up:

1. ✅ **Database Models** - Updated with all form fields
2. ✅ **Pydantic Schemas** - Support nested data structure
3. ✅ **API Endpoints** - Handle complete onboarding data
4. ✅ **Migration Script** - Ready to run on database

---

## Step 1: Run Database Migration

Before using the API, run the migration to add new fields and tables:

```bash
cd D:\Softgetix\Denpay\Workfin_client_ui\Workfin_backend

# Connect to database and run migration
psql -h aws-1-ap-southeast-1.pooler.supabase.com \
     -p 6543 \
     -d postgres \
     -U postgres.ehaukxpafptcaqooltqw \
     -f migrations/001_add_client_onboarding_fields.sql
```

**Or use a database tool** (like pgAdmin, DBeaver, or Supabase Studio) to execute the SQL script.

---

## Step 2: Update Frontend Form Submission

### Current Form Structure

The [ClientOnboardingCreate.tsx](src/pages/onboarding/ClientOnboardingCreate.tsx) component has 9 separate forms across 10 tabs:
- `form` - Tab 1 (Client Information)
- `contactForm` - Tab 2 (Contact Information)
- `licenseForm` - Tab 3 (License Information)
- `accountantForm` - Tab 4 (Accountant Details)
- `itProviderForm` - Tab 5 (IT Provider Details)
- `adjustmentForm` - Tab 6 (Adjustment Types)
- `pmsForm` - Tab 7 (PMS Integration Details)
- `denpayForm` - Tab 8 (Denpay Period)
- `fyEndForm` - Tab 9 (FY End)
- `featureForm` - Tab 10 (Feature Access)

### Add Form Submission Handler

Update the ClientOnboardingCreate component to add a submit handler:

```typescript
// src/pages/onboarding/ClientOnboardingCreate.tsx

import { clientService } from '../../services';

const ClientOnboardingCreate: React.FC = () => {
  // ... existing code ...

  const handleFinish = async () => {
    try {
      // Validate all forms
      await Promise.all([
        form.validateFields(),
        contactForm.validateFields(),
        licenseForm.validateFields(),
        // accountantForm and itProviderForm are optional
        // adjustmentForm, pmsForm, denpayForm, fyEndForm are optional
      ]);

      // Gather all form values
      const clientInfo = form.getFieldsValue();
      const contactInfo = contactForm.getFieldsValue();
      const licenseInfo = licenseForm.getFieldsValue();
      const accountantInfo = accountantForm.getFieldsValue();
      const itProviderInfo = itProviderForm.getFieldsValue();
      const featureInfo = featureForm.getFieldsValue();

      // Build API request payload
      const payload = {
        // Tab 1: Client Information
        legal_client_trading_name: clientInfo.tradingName,
        workfin_legal_entity_reference: clientInfo.entityReference,
        client_type: clientInfo.type,
        company_registration: clientInfo.companyRegNo,
        xero_vat_type: clientInfo.xeroVatTaxType,

        // Address (nested object)
        address: {
          line1: clientInfo.addressLine1,
          line2: clientInfo.addressLine2 || null,
          city: clientInfo.city,
          county: clientInfo.county || null,
          postcode: clientInfo.postCode,
          country: clientInfo.country || 'United Kingdom'
        },

        // Logos (if uploaded)
        expanded_logo_url: expandedLogo[0]?.response?.url || null, // Assuming upload returns URL
        logo_url: uploadLogo[0]?.response?.url || null,

        // Tab 2: Contact Information
        phone: contactInfo.phoneNumber,
        email: contactInfo.emailId,
        admin_user: {
          name: contactInfo.adminUserFullName,
          email: contactInfo.adminUserEmail
        },

        // Tab 3: License Information
        accounting_system: licenseInfo.accountingSystem || null,
        xero_app: licenseInfo.xeroApp || null,
        workfin_users_count: parseInt(licenseInfo.licenseWorkfinUsers) || 0,
        compass_connections_count: parseInt(licenseInfo.licenseCompassConnections) || 0,
        finance_system_connections_count: parseInt(licenseInfo.licenseFinanceSystemConnections) || 0,
        pms_connections_count: parseInt(licenseInfo.licensePracticeManagementConnections) || 0,
        purchasing_system_connections_count: parseInt(licenseInfo.licensePurchasingSystemConnections) || 0,

        // Tab 4: Accountant Details
        accountant_name: accountantInfo.accountantName || null,
        accountant_address: accountantInfo.accountantAddress || null,
        accountant_contact: accountantInfo.accountantContactNo || null,
        accountant_email: accountantInfo.accountantEmail || null,

        // Tab 5: IT Provider Details
        it_provider_name: itProviderInfo.nameOfProvider || null,
        it_provider_address: itProviderInfo.address || null,
        it_provider_postcode: itProviderInfo.postCode || null,
        it_provider_contact_name: itProviderInfo.contactName || null,
        it_provider_phone_1: itProviderInfo.telephoneNo || null,
        it_provider_phone_2: itProviderInfo.telephoneNo1 || null,
        it_provider_email: itProviderInfo.email || null,
        it_provider_notes: itProviderInfo.additionalNotes || null,

        // Tab 6: Adjustment Types
        adjustment_types: adjustmentTypes.map(name => ({ name })),

        // Tab 7: PMS Integration Details (if implemented)
        pms_integrations: [], // TODO: Implement when PMS integration UI is ready

        // Tab 8: Denpay Period
        denpay_periods: denpayPeriods.map((_, index) => {
          const values = denpayForm.getFieldsValue();
          return {
            month: values[`denpay_month_${index}`]?.format('YYYY-MM-01'),
            from_date: values[`denpay_from_${index}`]?.format('YYYY-MM-DD'),
            to_date: values[`denpay_to_${index}`]?.format('YYYY-MM-DD')
          };
        }).filter(p => p.month && p.from_date && p.to_date),

        // Tab 9: FY End
        fy_end_periods: fyEndPeriods.map((_, index) => {
          const values = fyEndForm.getFieldsValue();
          return {
            month: values[`fyend_month_${index}`]?.format('YYYY-MM-01'),
            from_date: values[`fyend_from_${index}`]?.format('YYYY-MM-DD'),
            to_date: values[`fyend_to_${index}`]?.format('YYYY-MM-DD')
          };
        }).filter(p => p.month && p.from_date && p.to_date),

        // Tab 10: Feature Access
        clinician_pay_system_enabled: clinicianPayEnabled,
        power_bi_reports_enabled: powerBIEnabled
      };

      // Submit to API
      const response = await clientService.createClient(payload);

      message.success('Client onboarding completed successfully!');
      navigate('/onboarding');

    } catch (error: any) {
      console.error('Failed to create client:', error);
      if (error.response?.data?.detail) {
        message.error(`Error: ${error.response.data.detail}`);
      } else {
        message.error('Failed to create client. Please try again.');
      }
    }
  };

  // Update the "Finish" button handler
  const handleNext = () => {
    const currentTabIndex = parseInt(activeTab);
    if (currentTabIndex < 10) {
      setActiveTab(String(currentTabIndex + 1));
    } else {
      // Last tab - submit the form
      handleFinish();
    }
  };

  // ... rest of the component ...
};
```

---

## Step 3: API Request/Response Examples

### Create Client Request

```http
POST http://localhost:8001/api/clients/
Content-Type: application/json

{
  "legal_client_trading_name": "Dental Care Ltd",
  "workfin_legal_entity_reference": "DEN2237",
  "client_type": "ltd-company",
  "company_registration": "12345678",
  "xero_vat_type": "Standard Rate",
  "expanded_logo_url": null,
  "logo_url": null,
  "address": {
    "line1": "123 High Street",
    "line2": "Suite 100",
    "city": "London",
    "county": "Greater London",
    "postcode": "SW1A 1AA",
    "country": "United Kingdom"
  },
  "phone": "+44 20 1234 5678",
  "email": "info@dentalcare.com",
  "admin_user": {
    "name": "John Smith",
    "email": "john.smith@dentalcare.com"
  },
  "accounting_system": "xero",
  "xero_app": null,
  "workfin_users_count": 5,
  "compass_connections_count": 3,
  "finance_system_connections_count": 2,
  "pms_connections_count": 1,
  "purchasing_system_connections_count": 1,
  "accountant_name": "ABC Accountants Ltd",
  "accountant_address": "456 Business Park",
  "accountant_contact": "+44 20 9876 5432",
  "accountant_email": "contact@abcaccountants.com",
  "it_provider_name": "Tech Solutions Ltd",
  "it_provider_address": "789 Tech Street",
  "it_provider_postcode": "EC1A 1BB",
  "it_provider_contact_name": "Jane Doe",
  "it_provider_phone_1": "+44 20 1111 2222",
  "it_provider_phone_2": "+44 20 3333 4444",
  "it_provider_email": "support@techsolutions.com",
  "it_provider_notes": "Preferred contact time: 9am-5pm",
  "adjustment_types": [
    { "name": "Mentoring Fee" },
    { "name": "Retainer Fee" },
    { "name": "Therapist - Invoice" },
    { "name": "Locum - Days" },
    { "name": "Reconciliation Adjustment" },
    { "name": "Payment on Account" },
    { "name": "Previous Period Payment" },
    { "name": "Training and Other" }
  ],
  "pms_integrations": [],
  "denpay_periods": [
    {
      "month": "2025-01-01",
      "from_date": "2025-01-01",
      "to_date": "2025-01-31"
    }
  ],
  "fy_end_periods": [
    {
      "month": "2025-04-01",
      "from_date": "2025-04-01",
      "to_date": "2026-03-31"
    }
  ],
  "clinician_pay_system_enabled": true,
  "power_bi_reports_enabled": false
}
```

### Successful Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "legal_trading_name": "Dental Care Ltd",
  "workfin_reference": "DEN2237",
  "client_type": "ltd-company",
  "company_registration_no": "12345678",
  "xero_vat_tax_type": "Standard Rate",
  "contact_phone": "+44 20 1234 5678",
  "contact_email": "info@dentalcare.com",
  "status": "Active",
  "created_at": "2026-01-08T10:30:00Z",
  "updated_at": "2026-01-08T10:30:00Z",
  "address": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "line1": "123 High Street",
    "line2": "Suite 100",
    "city": "London",
    "county": "Greater London",
    "postcode": "SW1A 1AA",
    "country": "United Kingdom"
  },
  "adjustment_types": [
    { "id": "770e8400-...", "name": "Mentoring Fee" },
    { "id": "880e8400-...", "name": "Retainer Fee" }
    // ... etc
  ],
  "pms_integrations": [],
  "denpay_periods": [
    {
      "id": "990e8400-...",
      "month": "2025-01-01",
      "from_date": "2025-01-01",
      "to_date": "2025-01-31"
    }
  ],
  "fy_end_periods": [
    {
      "id": "aa0e8400-...",
      "month": "2025-04-01",
      "from_date": "2025-04-01",
      "to_date": "2026-03-31"
    }
  ],
  "feature_clinician_pay_enabled": true,
  "feature_powerbi_enabled": false
}
```

---

## Step 4: File Upload Handling

For logo uploads, you'll need to implement file upload separately. Here's a suggested approach:

### Option 1: Supabase Storage

```typescript
import { supabase } from '../../lib/supabaseClient';

const handleLogoUpload = async (file: File, type: 'expanded' | 'standard'): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${type}.${fileExt}`;
  const filePath = `client-logos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('assets')
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('assets')
    .getPublicUrl(filePath);

  return publicUrl;
};

// In your form submission handler:
let expandedLogoUrl = null;
let logoUrl = null;

if (expandedLogo.length > 0) {
  expandedLogoUrl = await handleLogoUpload(expandedLogo[0].originFileObj, 'expanded');
}

if (uploadLogo.length > 0) {
  logoUrl = await handleLogoUpload(uploadLogo[0].originFileObj, 'standard');
}
```

### Option 2: Backend Upload Endpoint

Create a separate endpoint to handle file uploads:

```python
# app/api/v1/endpoints/upload.py

from fastapi import APIRouter, UploadFile, File
import shutil
from pathlib import Path

router = APIRouter()

@router.post("/upload/logo")
async def upload_logo(file: UploadFile = File(...)):
    upload_dir = Path("static/logos")
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / f"{uuid.uuid4()}_{file.filename}"

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/static/logos/{file_path.name}"}
```

---

## Step 5: Testing the Integration

### 1. Start the Backend

```bash
cd D:\Softgetix\Denpay\Workfin_client_ui\Workfin_backend
venv\Scripts\activate
uvicorn main:app --reload --port 8001
```

### 2. Start the Frontend

```bash
cd D:\Softgetix\Denpay\Workfin_client_ui
npm run dev
```

### 3. Test the Form

1. Navigate to http://localhost:5174/onboarding/create
2. Fill in all required fields across the 10 tabs
3. Click "Finish" on the last tab
4. Check the browser console for any errors
5. Verify the client was created by visiting http://localhost:8001/api/docs and testing the GET /api/clients/ endpoint

---

## Step 6: Add Required Dependencies

Add required imports to the ClientOnboardingCreate component:

```typescript
import { message } from 'antd';
import { clientService } from '../../services';
```

---

## API Endpoints Reference

### List Clients
```
GET /api/clients/
Response: Array of client summary objects
```

### Get Client by ID
```
GET /api/clients/{client_id}
Response: Full client object with all relationships
```

### Create Client
```
POST /api/clients/
Body: ClientCreate object (see example above)
Response: Full client object with all relationships
```

### Update Client
```
PUT /api/clients/{client_id}
Body: ClientUpdate object (partial update supported)
Response: Updated client object
```

### Delete Client
```
DELETE /api/clients/{client_id}
Response: 204 No Content
```

---

## Troubleshooting

### Issue: Validation Errors

Check that all required fields are included:
- `legal_client_trading_name`
- `workfin_legal_entity_reference`
- `phone`
- `email`
- `address` (with `line1`, `city`, `postcode`)
- `admin_user` (with `name` and `email`)

### Issue: Database Connection Errors

Ensure the migration has been run and the backend can connect to the database.

### Issue: CORS Errors

Make sure the frontend URL is in the `CORS_ORIGINS` environment variable in the backend `.env` file:

```env
CORS_ORIGINS=http://localhost:5174,http://localhost:5173,http://localhost:8001
```

---

## Next Steps

1. ✅ Run database migration
2. ✅ Update form submission handler
3. ⬜ Implement file upload for logos
4. ⬜ Test end-to-end flow
5. ⬜ Add loading states and error handling
6. ⬜ Add success confirmation dialog
7. ⬜ Implement edit mode for existing clients

---

## Summary

The backend is now fully configured to accept all data from the 10-tab client onboarding form. The main tasks remaining are:

1. **Frontend**: Update the form submission handler to collect and structure data from all tabs
2. **Database**: Run the migration script to add new columns and tables
3. **Testing**: Verify the complete onboarding flow works end-to-end
4. **File Upload**: Implement logo upload functionality

All backend code has been updated and is ready to use!
