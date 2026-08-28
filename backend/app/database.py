from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    from app.models import (  # noqa: F401
        Project, Target, ScopeRule, Asset, Host, URLModel,
        Parameter, Technology, Job, JobLog, Finding,
        FindingEvidence, AIAnalysis, Report, CustomScript, ToolConfig,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
