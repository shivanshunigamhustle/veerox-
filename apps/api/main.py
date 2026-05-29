from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from apps.api.channels.whatsapp.webhook import router as whatsapp_router
from apps.api.logging import setup_logging
from apps.api.rate_limit import limiter
from apps.api.routers import admin, conversations, health, leads
from apps.api.sentry import init_sentry


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()
    init_sentry()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Veerox AI",
        description="Voice + WhatsApp AI agent backend.",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(conversations.router)
    app.include_router(leads.router)
    app.include_router(admin.router)
    app.include_router(whatsapp_router)

    return app


app = create_app()
