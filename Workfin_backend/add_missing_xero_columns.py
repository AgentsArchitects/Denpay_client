"""
Migration Script: Add missing tenant_name and integration_id columns to xero schema tables,
then backfill existing rows using data from the tokens table.

Steps:
  1. Add tenant_name and integration_id columns to tokens table (if missing)
  2. Backfill tokens table: populate tenant_name from Xero API, generate integration_id
  3. Add tenant_name and integration_id columns to all data tables (if missing)
  4. Backfill all data tables: UPDATE rows SET tenant_name/integration_id FROM tokens WHERE tenant_id matches
"""
import asyncio
import secrets
import string
from app.db.database import engine
from sqlalchemy import text


def generate_integration_id() -> str:
    """Generate a unique 8-character alphanumeric integration ID."""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(8))


# All xero data tables that need tenant_name and integration_id
DATA_TABLES = [
    "accounts",
    "contacts",
    "contactgroups",
    "invoices",
    "creditnotes",
    "payments",
    '"bankTransactions"',
    '"BankTransfer"',
    "journals",
    '"journalsLines"',
]


async def column_exists(conn, table_name: str, column_name: str) -> bool:
    """Check if a column already exists in a table."""
    clean_table = table_name.strip('"')
    result = await conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'xero'
            AND table_name = :table_name
            AND column_name = :column_name
        )
    """), {"table_name": clean_table, "column_name": column_name})
    return result.scalar()


async def table_exists(conn, table_name: str) -> bool:
    """Check if a table exists in the xero schema."""
    clean_table = table_name.strip('"')
    result = await conn.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'xero'
            AND table_name = :table_name
        )
    """), {"table_name": clean_table})
    return result.scalar()


async def add_column(conn, table_name: str, column_name: str, column_type: str, extra: str = ""):
    """Add a column to a table if it doesn't exist."""
    exists = await column_exists(conn, table_name, column_name)
    if exists:
        clean_table = table_name.strip('"')
        print(f"  SKIP  xero.{clean_table}.{column_name} (already exists)")
        return False

    sql = f'ALTER TABLE xero.{table_name} ADD COLUMN {column_name} {column_type} {extra}'
    await conn.execute(text(sql))
    clean_table = table_name.strip('"')
    print(f"  ADDED xero.{clean_table}.{column_name} ({column_type})")
    return True


async def migrate():
    print("=" * 70)
    print("MIGRATION: Add tenant_name + integration_id to xero schema")
    print("=" * 70)

    async with engine.begin() as conn:
        # ============================================================
        # STEP 1: Add columns to tokens table
        # ============================================================
        print("\n[STEP 1] Adding columns to tokens table...")
        await add_column(conn, "tokens", "tenant_name", "VARCHAR(255)")
        await add_column(conn, "tokens", "integration_id", "VARCHAR(8)", "UNIQUE")

        # ============================================================
        # STEP 2: Backfill tokens table - generate integration_id for
        #         any token rows that don't have one yet
        # ============================================================
        print("\n[STEP 2] Backfilling tokens table...")
        result = await conn.execute(text("""
            SELECT id, tenant_id, tenant_name, integration_id
            FROM xero.tokens
        """))
        token_rows = result.fetchall()
        print(f"  Found {len(token_rows)} token row(s)")

        for row in token_rows:
            token_id, tenant_id, tenant_name, integration_id = row
            updates = {}

            if not integration_id:
                new_id = generate_integration_id()
                updates["integration_id"] = new_id
                print(f"  Generating integration_id={new_id} for tenant_id={tenant_id}")

            if updates:
                set_clauses = ", ".join([f"{k} = :val_{k}" for k in updates])
                params = {f"val_{k}": v for k, v in updates.items()}
                params["token_id"] = token_id
                await conn.execute(text(
                    f"UPDATE xero.tokens SET {set_clauses} WHERE id = :token_id"
                ), params)
                print(f"  Updated token row {token_id}")
            else:
                print(f"  Token row {token_id} already has integration_id={integration_id}, tenant_name={tenant_name}")

        # ============================================================
        # STEP 3: Add columns to all data tables
        # ============================================================
        print("\n[STEP 3] Adding columns to data tables...")
        for table in DATA_TABLES:
            clean = table.strip('"')
            if not await table_exists(conn, table):
                print(f"\n  SKIP  xero.{clean} (table does not exist)")
                continue
            print(f"\n  -- {clean} --")
            await add_column(conn, table, "tenant_name", "VARCHAR(255)")
            await add_column(conn, table, "integration_id", "VARCHAR(8)")

        # ============================================================
        # STEP 4: Backfill all data tables from tokens table
        #         UPDATE data SET tenant_name = t.tenant_name,
        #                         integration_id = t.integration_id
        #         FROM tokens t WHERE data.tenant_id = t.tenant_id
        #         AND (data.tenant_name IS NULL OR data.integration_id IS NULL)
        # ============================================================
        print("\n[STEP 4] Backfilling data tables from tokens...")
        for table in DATA_TABLES:
            clean = table.strip('"')
            if not await table_exists(conn, table):
                continue

            # Check if the table has a tenant_id column (it should)
            has_tenant_id = await column_exists(conn, table, "tenant_id")
            if not has_tenant_id:
                print(f"  SKIP  xero.{clean} (no tenant_id column)")
                continue

            result = await conn.execute(text(f"""
                UPDATE xero.{table} AS d
                SET tenant_name = t.tenant_name,
                    integration_id = t.integration_id
                FROM xero.tokens AS t
                WHERE d.tenant_id = t.tenant_id
                AND (d.tenant_name IS NULL OR d.integration_id IS NULL)
            """))
            updated = result.rowcount
            print(f"  Backfilled xero.{clean}: {updated} row(s) updated")

    print("\n" + "=" * 70)
    print("MIGRATION COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(migrate())
