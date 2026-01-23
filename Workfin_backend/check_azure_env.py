"""
Diagnostic script to check Azure environment configuration
This will help identify what's wrong with the deployment
"""
import os
import sys

print("=" * 60)
print("AZURE ENVIRONMENT DIAGNOSTIC CHECK")
print("=" * 60)

# Check critical environment variables
env_vars = {
    "DATABASE_URL": os.getenv("DATABASE_URL"),
    "API_V1_PREFIX": os.getenv("API_V1_PREFIX"),
    "CORS_ORIGINS": os.getenv("CORS_ORIGINS"),
    "SECRET_KEY": os.getenv("SECRET_KEY"),
}

print("\n1. ENVIRONMENT VARIABLES:")
for key, value in env_vars.items():
    if value:
        # Mask sensitive values
        if "SECRET" in key or "PASSWORD" in key or "dp_admin" in str(value):
            display_value = value[:20] + "..." if len(value) > 20 else "***"
        else:
            display_value = value
        print(f"   ✓ {key}: {display_value}")
    else:
        print(f"   ✗ {key}: NOT SET")

# Try to import and check database connection
print("\n2. DATABASE CONNECTION TEST:")
try:
    from app.db.database import engine
    print("   ✓ Database engine imported successfully")

    import asyncio
    from sqlalchemy import text

    async def test_connection():
        try:
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT 1"))
                result.fetchone()
                print("   ✓ Database connection successful")

                # Check if tables exist
                result = await conn.execute(text("""
                    SELECT COUNT(*)
                    FROM information_schema.tables
                    WHERE table_schema = 'denpay-dev'
                """))
                count = result.fetchone()[0]
                print(f"   ✓ Found {count} tables in denpay-dev schema")
                return True
        except Exception as e:
            print(f"   ✗ Database connection failed: {str(e)}")
            return False

    success = asyncio.run(test_connection())
    if not success:
        sys.exit(1)

except Exception as e:
    print(f"   ✗ Failed to test database: {str(e)}")
    sys.exit(1)

# Check if we're running on Azure
print("\n3. DEPLOYMENT ENVIRONMENT:")
website_instance = os.getenv("WEBSITE_INSTANCE_ID")
if website_instance:
    print(f"   ✓ Running on Azure App Service")
    print(f"   Instance ID: {website_instance[:20]}...")
else:
    print(f"   Running locally")

print("\n" + "=" * 60)
print("DIAGNOSTIC CHECK COMPLETE")
print("=" * 60)
