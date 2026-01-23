"""
Data Migration Script: Supabase -> Azure PostgreSQL
Migrates all data from denpay-dev and xero schemas
"""

import asyncio
import asyncpg
from typing import List, Dict, Any

# =============================================================================
# CONFIGURATION - UPDATE THESE VALUES
# =============================================================================

SUPABASE_CONFIG = {
    "host": "db.ehaukxpafptcaqooltqw.supabase.co",
    "port": 5432,
    "database": "postgres",
    "user": "postgres.ehaukxpafptcaqooltqw",
    "password": "Base_RJP_Work01",  # <-- UPDATE THIS
    "ssl": "require"
}

AZURE_CONFIG = {
    "host": "pgsql-uat-uk-workfin-02.postgres.database.azure.com",
    "port": 5432,
    "database": "workfin_uat_db",
    "user": "dp_admin",
    "password": "PZDlJ0B1TU5g3h",
    "ssl": "require"
}

SCHEMAS_TO_MIGRATE = ["denpay-dev", "xero"]

# =============================================================================
# MIGRATION FUNCTIONS
# =============================================================================

async def get_tables(conn: asyncpg.Connection, schema: str) -> List[str]:
    """Get all tables in a schema"""
    query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """
    rows = await conn.fetch(query, schema)
    return [row['table_name'] for row in rows]


async def get_table_columns(conn: asyncpg.Connection, schema: str, table: str) -> List[str]:
    """Get column names for a table"""
    query = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
    """
    rows = await conn.fetch(query, schema, table)
    return [row['column_name'] for row in rows]


async def get_table_data(conn: asyncpg.Connection, schema: str, table: str) -> List[Dict[str, Any]]:
    """Get all data from a table"""
    query = f'SELECT * FROM "{schema}"."{table}"'
    rows = await conn.fetch(query)
    return [dict(row) for row in rows]


async def clear_table(conn: asyncpg.Connection, schema: str, table: str):
    """Clear existing data from table (optional)"""
    query = f'TRUNCATE TABLE "{schema}"."{table}" CASCADE'
    try:
        await conn.execute(query)
    except Exception as e:
        print(f"    Warning: Could not truncate {schema}.{table}: {e}")


async def insert_data(conn: asyncpg.Connection, schema: str, table: str, data: List[Dict[str, Any]], columns: List[str]):
    """Insert data into table"""
    if not data:
        return 0
    
    # Filter columns that exist in the data
    available_columns = [col for col in columns if col in data[0]]
    
    if not available_columns:
        return 0
    
    # Build insert query
    col_names = ", ".join([f'"{col}"' for col in available_columns])
    placeholders = ", ".join([f"${i+1}" for i in range(len(available_columns))])
    query = f'INSERT INTO "{schema}"."{table}" ({col_names}) VALUES ({placeholders})'
    
    # Insert each row
    inserted = 0
    for row in data:
        values = [row.get(col) for col in available_columns]
        try:
            await conn.execute(query, *values)
            inserted += 1
        except asyncpg.UniqueViolationError:
            # Skip duplicates
            pass
        except Exception as e:
            print(f"    Error inserting row: {e}")
    
    return inserted


async def migrate_table(source_conn: asyncpg.Connection, dest_conn: asyncpg.Connection, schema: str, table: str, clear_existing: bool = False):
    """Migrate a single table"""
    print(f"  Migrating {schema}.{table}...")
    
    # Get data from source
    data = await get_table_data(source_conn, schema, table)
    print(f"    Found {len(data)} rows in source")
    
    if not data:
        print(f"    Skipping (no data)")
        return
    
    # Get columns from destination
    columns = await get_table_columns(dest_conn, schema, table)
    
    # Optionally clear existing data
    if clear_existing:
        await clear_table(dest_conn, schema, table)
    
    # Insert data
    inserted = await insert_data(dest_conn, schema, table, data, columns)
    print(f"    Inserted {inserted} rows")


async def migrate_schema(source_conn: asyncpg.Connection, dest_conn: asyncpg.Connection, schema: str, clear_existing: bool = False):
    """Migrate all tables in a schema"""
    print(f"\n{'='*60}")
    print(f"Migrating schema: {schema}")
    print(f"{'='*60}")
    
    # Get tables from source
    tables = await get_tables(source_conn, schema)
    print(f"Found {len(tables)} tables: {', '.join(tables)}")
    
    # Migrate each table
    for table in tables:
        await migrate_table(source_conn, dest_conn, schema, table, clear_existing)


async def main():
    print("="*60)
    print("DATA MIGRATION: Supabase -> Azure PostgreSQL")
    print("="*60)
    
    # Connect to Supabase
    print("\nConnecting to Supabase...")
    try:
        source_conn = await asyncpg.connect(
            host=SUPABASE_CONFIG["host"],
            port=SUPABASE_CONFIG["port"],
            database=SUPABASE_CONFIG["database"],
            user=SUPABASE_CONFIG["user"],
            password=SUPABASE_CONFIG["password"],
            ssl=SUPABASE_CONFIG["ssl"]
        )
        print("✓ Connected to Supabase")
    except Exception as e:
        print(f"✗ Failed to connect to Supabase: {e}")
        return
    
    # Connect to Azure
    print("\nConnecting to Azure PostgreSQL...")
    try:
        dest_conn = await asyncpg.connect(
            host=AZURE_CONFIG["host"],
            port=AZURE_CONFIG["port"],
            database=AZURE_CONFIG["database"],
            user=AZURE_CONFIG["user"],
            password=AZURE_CONFIG["password"],
            ssl=AZURE_CONFIG["ssl"]
        )
        print("✓ Connected to Azure PostgreSQL")
    except Exception as e:
        print(f"✗ Failed to connect to Azure: {e}")
        await source_conn.close()
        return
    
    # Ask user about clearing existing data
    print("\n" + "-"*60)
    clear_existing = input("Clear existing data before migration? (yes/no): ").lower().strip() == "yes"
    
    # Migrate each schema
    for schema in SCHEMAS_TO_MIGRATE:
        await migrate_schema(source_conn, dest_conn, schema, clear_existing)
    
    # Close connections
    await source_conn.close()
    await dest_conn.close()
    
    print("\n" + "="*60)
    print("MIGRATION COMPLETE!")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())