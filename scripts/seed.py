"""Seed script — inserts a demo Org and User.

Run with:
    python scripts/seed.py

Idempotent: uses INSERT ... ON CONFLICT DO NOTHING so it is safe to run
multiple times against the same database.
"""
from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from apps.api.config import settings


async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=True)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    org_id = uuid.UUID(settings.default_org_id)
    demo_user_id = uuid.UUID("00000000-0000-0000-0000-000000000002")

    async with Session() as session:
        await session.execute(
            text(
                "INSERT INTO orgs (id, name, created_at) "
                "VALUES (:id, :name, NOW()) "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {"id": str(org_id), "name": "Demo Org"},
        )

        await session.execute(
            text(
                "INSERT INTO users (id, org_id, phone, name, created_at) "
                "VALUES (:id, :org_id, :phone, :name, NOW()) "
                "ON CONFLICT (id) DO NOTHING"
            ),
            {
                "id": str(demo_user_id),
                "org_id": str(org_id),
                "phone": "+910000000000",
                "name": "Demo User",
            },
        )

        await session.commit()

    await engine.dispose()
    print(f"Seeded org_id={org_id}, user_id={demo_user_id}")


if __name__ == "__main__":
    asyncio.run(seed())
