# 🗄️ Database Setup Guide

## Quick Setup (5 minutes)

### Step 1: Open Supabase SQL Editor

Click this link (or copy to browser):
```
https://supabase.com/dashboard/project/ehaukxpafptcaqooltqw/sql/new
```

### Step 2: Run Migration Files

Run these files **in order** (very important!):

#### File 1: Create Schema
```
supabase/migrations/000_create_schema.sql
```
1. Open the file in your editor
2. Copy ALL the content
3. Paste into Supabase SQL Editor
4. Click **RUN** button (bottom right)
5. Wait for "Success. No rows returned"

#### File 2: Create Enums
```
supabase/migrations/001_create_enums_v2.sql
```
Repeat the same process

#### File 3: Create Core Tables
```
supabase/migrations/002_create_core_tables.sql
```

#### File 4: Create Clinician Tables
```
supabase/migrations/003_create_clinician_tables.sql
```

#### File 5: Create Rate Tables
```
supabase/migrations/004_create_rate_tables.sql
```

#### File 6: Create Adjustment Tables
```
supabase/migrations/005_create_adjustment_tables.sql
```

#### File 7: Create Paysheet Tables
```
supabase/migrations/006_create_paysheet_tables.sql
```

#### File 8: Create System Tables
```
supabase/migrations/007_create_system_tables.sql
```

#### File 9: Create RLS Policies (Optional - for security)
```
supabase/migrations/008_create_rls_policies_fixed.sql
```

#### File 10: Create Triggers and Functions (Optional)
```
supabase/migrations/009_create_triggers_and_functions.sql
```

#### File 11: Create Views (Optional)
```
supabase/migrations/010_create_views.sql
```

#### File 12: Add Sample Data (Optional - for testing)
```
supabase/migrations/011_seed_data.sql
```

---

## ✅ Verify Tables Were Created

After running the migrations:

### Method 1: Using Supabase Dashboard
1. Go to **Table Editor** (left sidebar)
2. You should see tables like:
   - clients
   - client_addresses
   - practices
   - practice_addresses
   - clinicians
   - clinician_addresses
   - paysheets
   - gl_codes
   - income_rates
   - etc.

### Method 2: Using Our Test Script
```powershell
cd e:\Downloads\Denpay-main\backend
venv\Scripts\activate
python test_supabase.py
```

You should now see:
```
✅ clients: X records
✅ practices: X records
✅ clinicians: X records
```

---

## 🚨 Important Notes

### Order Matters!
Run the files in the exact order shown. Each file depends on the previous ones.

### If You Get Errors:
- **"relation already exists"**: Table already created, skip to next file
- **"type already exists"**: Enum already created, skip to next file
- **"column does not exist"**: You skipped a file, go back and run missing files
- **"permission denied"**: Make sure you're using your service_role key

### Required Files (Minimum):
To get the API working, you MUST run files 000-007:
- ✅ 000_create_schema.sql
- ✅ 001_create_enums_v2.sql
- ✅ 002_create_core_tables.sql
- ✅ 003_create_clinician_tables.sql
- ✅ 004_create_rate_tables.sql
- ✅ 005_create_adjustment_tables.sql
- ✅ 006_create_paysheet_tables.sql
- ✅ 007_create_system_tables.sql

### Optional Files:
- 008_create_rls_policies_fixed.sql (Row Level Security - for production)
- 009_create_triggers_and_functions.sql (Auto-updates, validation)
- 010_create_views.sql (Reporting, analytics)
- 011_seed_data.sql (Sample data for testing)

---

## 📊 Expected Tables

After setup, you should have these tables:

### Core Tables:
- `clients` - Client companies
- `client_addresses` - Client addresses
- `practices` - Dental practices
- `practice_addresses` - Practice locations
- `synapse_configs` - Azure Synapse configurations

### Clinician Tables:
- `clinicians` - Clinician profiles
- `clinician_addresses` - Clinician addresses
- `clinician_practices` - Practice assignments
- `clinician_users` - User accounts

### Rate & Financial Tables:
- `income_rates` - Payment rates
- `nhs_contracts` - NHS contracts
- `gl_codes` - General ledger codes

### Adjustment Tables:
- `income_adjustments`
- `session_adjustments`
- `cross_charges`
- `lab_deductions`
- `bad_debts`
- `miscellaneous_adjustments`

### Paysheet Tables:
- `paysheets` - Main paysheet records
- `paysheet_sections` - Paysheet sections
- `paysheet_line_items` - Individual line items
- `paysheet_approval_history` - Approval workflow

### System Tables:
- `compass_dates` - Pay period dates
- `sync_jobs` - Data sync tracking
- `user_roles` - User permissions

---

## 🎯 Quick Start (Fastest Way)

If you want to get started quickly, run ONLY these files:

```
1. 000_create_schema.sql
2. 001_create_enums_v2.sql
3. 002_create_core_tables.sql
4. 011_seed_data.sql (for sample data)
```

This will create the basic structure and add some test data.

---

## After Setup

Once tables are created:

1. **Restart your backend:**
   ```powershell
   # Stop server (Ctrl+C)
   python run_server.py
   ```

2. **Test the API:**
   ```
   http://localhost:8000/api/clients
   ```
   Should return actual data (or empty array if no seed data)

3. **Check frontend:**
   ```
   http://localhost:8000
   ```
   Will fetch real data from Supabase!

---

## Need Help?

Run the test script to see what's missing:
```powershell
cd backend
python test_supabase.py
```
