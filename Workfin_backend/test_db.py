import asyncio
from app.db.database import engine
from app.db.models import Client
from sqlalchemy import select, text

async def test_connection():
    print("Testing database connection...")

    try:
        async with engine.connect() as conn:
            # Test basic connection
            result = await conn.execute(text("SELECT 1"))
            print(f"OK Basic connection successful: {result.scalar()}")

            # Test schema access
            result = await conn.execute(text('SELECT current_schema()'))
            print(f"OK Current schema: {result.scalar()}")

            # Try to query clients table
            result = await conn.execute(text('SELECT COUNT(*) FROM "denpay-dev".clients'))
            count = result.scalar()
            print(f"OK Clients table query successful: {count} clients found")

            # Try to get all clients
            result = await conn.execute(text('SELECT id, legal_trading_name, workfin_reference FROM "denpay-dev".clients LIMIT 5'))
            rows = result.fetchall()
            print(f"OK Found {len(rows)} clients:")
            for row in rows:
                print(f"  - {row[1]} ({row[2]})")

    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_connection())
