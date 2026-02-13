"""
Run database migration to add first_name and last_name to invitations table
"""
import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def run_migration():
    """Add first_name and last_name columns to auth.invitations table"""
    async with AsyncSessionLocal() as session:
        try:
            print("Running migration: Adding first_name and last_name to auth.invitations...")

            # Add columns
            await session.execute(text("""
                ALTER TABLE auth.invitations
                ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
            """))

            # Update existing records
            await session.execute(text("""
                UPDATE auth.invitations
                SET first_name = '', last_name = ''
                WHERE first_name IS NULL OR last_name IS NULL;
            """))

            await session.commit()
            print("Migration completed successfully!")

        except Exception as e:
            await session.rollback()
            print(f"Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    asyncio.run(run_migration())
