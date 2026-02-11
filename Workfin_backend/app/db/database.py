from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings
from uuid import uuid4
from asyncpg import Connection


class PgBouncerConnection(Connection):
    """
    Custom asyncpg Connection class that generates unique prepared statement names.
    This prevents "prepared statement already exists" errors when using pgbouncer
    in transaction or statement pooling mode.
    """
    def _get_unique_id(self, prefix: str) -> str:
        return f"__asyncpg_{prefix}_{uuid4()}__"


# Create async engine with NullPool to work with pgbouncer
# For pgbouncer compatibility, we:
# 1. Use NullPool (no connection pooling on SQLAlchemy side)
# 2. Disable statement caching
# 3. Use custom connection class with unique prepared statement names
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # Disabled verbose SQL logging
    future=True,
    poolclass=NullPool,
    connect_args={
        "server_settings": {"search_path": '"denpay-dev", public'},
        # Disable prepared statement caching for pgbouncer
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0,
        # Use custom connection class with unique statement names
        "connection_class": PgBouncerConnection,
    },
)

# Create session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


# Dependency to get database session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
