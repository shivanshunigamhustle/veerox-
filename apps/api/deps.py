from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.config import Settings, settings
from apps.api.db.session import get_session
from apps.api.redis_client import get_redis


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session


async def get_redis_dep() -> AsyncGenerator[aioredis.Redis, None]:
    async for client in get_redis():
        yield client


def get_settings() -> Settings:
    return settings


DbDep = Annotated[AsyncSession, Depends(get_db)]
RedisDep = Annotated[aioredis.Redis, Depends(get_redis_dep)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
