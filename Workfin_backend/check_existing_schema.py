"""
Script to check existing database schema before running migration.
This will show what columns and tables already exist.
"""
import asyncio
from app.db.database import engine
from sqlalchemy import text

async def check_schema():
    print("=" * 80)
    print("CHECKING EXISTING DATABASE SCHEMA")
    print("=" * 80)

    async with engine.connect() as conn:
        # Check existing columns in clients table
        print("\n1. EXISTING COLUMNS IN 'clients' TABLE:")
        print("-" * 80)
        result = await conn.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'denpay-dev'
            AND table_name = 'clients'
            ORDER BY ordinal_position;
        """))

        existing_columns = []
        for row in result:
            existing_columns.append(row[0])
            print(f"  ✓ {row[0]:<40} {row[1]:<20} NULL: {row[2]}")

        # Check which columns are MISSING from clients table
        print("\n2. COLUMNS NEEDED FOR ONBOARDING FORM (checking if they exist):")
        print("-" * 80)

        needed_columns = [
            'expanded_logo_url', 'logo_url', 'client_type', 'company_registration_no',
            'xero_vat_tax_type', 'accounting_system', 'xero_app',
            'license_workfin_users', 'license_compass_connections',
            'license_finance_system_connections', 'license_pms_connections',
            'license_purchasing_system_connections', 'accountant_name',
            'accountant_address', 'accountant_contact_no', 'accountant_email',
            'it_provider_name', 'it_provider_address', 'it_provider_postcode',
            'it_provider_contact_name', 'it_provider_phone_1', 'it_provider_phone_2',
            'it_provider_email', 'it_provider_notes', 'feature_clinician_pay_enabled',
            'feature_powerbi_enabled'
        ]

        missing_columns = []
        for col in needed_columns:
            if col in existing_columns:
                print(f"  ✓ {col:<40} EXISTS")
            else:
                print(f"  ✗ {col:<40} MISSING - NEEDS TO BE ADDED")
                missing_columns.append(col)

        # Check existing tables
        print("\n3. CHECKING ONBOARDING-RELATED TABLES:")
        print("-" * 80)

        tables_to_check = [
            'clients',
            'client_addresses',
            'client_adjustment_types',
            'client_pms_integrations',
            'client_denpay_periods',
            'client_fy_end_periods'
        ]

        existing_tables = []
        missing_tables = []

        for table_name in tables_to_check:
            result = await conn.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'denpay-dev'
                    AND table_name = '{table_name}'
                );
            """))
            exists = result.scalar()

            if exists:
                print(f"  ✓ {table_name:<40} EXISTS")
                existing_tables.append(table_name)
            else:
                print(f"  ✗ {table_name:<40} MISSING - NEEDS TO BE CREATED")
                missing_tables.append(table_name)

        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY - WHAT NEEDS TO BE ADDED:")
        print("=" * 80)

        if missing_columns:
            print(f"\n✗ MISSING COLUMNS IN 'clients' TABLE ({len(missing_columns)}):")
            for col in missing_columns:
                print(f"  - {col}")
        else:
            print("\n✓ All required columns already exist in 'clients' table")

        if missing_tables:
            print(f"\n✗ MISSING TABLES ({len(missing_tables)}):")
            for table in missing_tables:
                print(f"  - {table}")
        else:
            print("\n✓ All required tables already exist")

        print("\n" + "=" * 80)

if __name__ == "__main__":
    asyncio.run(check_schema())
