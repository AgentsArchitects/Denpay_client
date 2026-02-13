"""
Run database migration to add contact_first_name and contact_last_name to clients table
"""
import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def run_migration():
    """Add contact name columns to clients table"""
    async with AsyncSessionLocal() as session:
        try:
            print("Running migration: Adding contact_first_name and contact_last_name to clients...")

            # Add columns
            await session.execute(text("""
                ALTER TABLE "denpay-dev".clients
                ADD COLUMN IF NOT EXISTS contact_first_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS contact_last_name VARCHAR(100);
            """))

            # Update existing records
            await session.execute(text("""
                UPDATE "denpay-dev".clients
                SET contact_first_name = '', contact_last_name = ''
                WHERE contact_first_name IS NULL OR contact_last_name IS NULL;
            """))

            await session.commit()
            print("Migration completed successfully!")

        except Exception as e:
            await session.rollback()
            print(f"Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    asyncio.run(run_migration())
