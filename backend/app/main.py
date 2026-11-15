from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.router import api_v1_router
from app.core.config import Settings, settings
from app.core.database import init_db


class UTCTimezoneMiddleware:
    """Pure ASGI middleware gắn header tiêu chuẩn H4 UTC mà không gây deadlock BaseHTTPMiddleware."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-timezone-standard", b"UTC-ISO8601-H4"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Khởi tạo schema SQLAlchemy ORM, chạy migration và seed dữ liệu khi khởi động."""
    init_db()
    yield


def create_app(app_settings: Settings | None = None) -> FastAPI:
    """App Factory khởi tạo FastAPI, CORS (Dev/Prod) và modular routers v1."""
    cfg = app_settings or settings

    application = FastAPI(
        title=cfg.project_name,
        version=cfg.version,
        description=(
            "API Hệ thống Giáo dục & Dự án Công nghệ CodeMind Campus "
            "(Modular Routers, CORS Dev/Prod, SQLAlchemy 2.0 UTC H4 & JWT RBAC)"
        ),
        lifespan=lifespan,
    )

    application.add_middleware(UTCTimezoneMiddleware)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(cfg.cors_origins),
        allow_origin_regex=cfg.cors_origin_regex,
        allow_credentials=True,
        allow_methods=list(cfg.cors_allow_methods),
        allow_headers=list(cfg.cors_allow_headers),
    )

    application.include_router(health_router)
    application.include_router(api_v1_router, prefix="/v1")
    return application


app = create_app()
