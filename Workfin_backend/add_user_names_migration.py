"""
Migration to add first_name and last_name columns to auth.users table
"""
import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def run_migration():
    async with AsyncSessionLocal() as session:
        try:
            # Add first_name column if it doesn't exist
            await session.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'auth'
                        AND table_name = 'users'
                        AND column_name = 'first_name'
                    ) THEN
                        ALTER TABLE auth.users ADD COLUMN first_name VARCHAR(100);
                    END IF;
                END $$;
            """))

            # Add last_name column if it doesn't exist
            await session.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'auth'
                        AND table_name = 'users'
                        AND column_name = 'last_name'
                    ) THEN
                        ALTER TABLE auth.users ADD COLUMN last_name VARCHAR(100);
                    END IF;
                END $$;
            """))

            await session.commit()
            print("✅ Migration completed successfully!")
            print("   - Added first_name column to auth.users (if not exists)")
            print("   - Added last_name column to auth.users (if not exists)")

        except Exception as e:
            await session.rollback()
            print(f"❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    asyncio.run(run_migration())
