# main.py

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from aio_pika.exceptions import AMQPError
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import settings, register_exception_handlers

from app.infrastructure.messaging import RabbitClient, SYSTEM_EVENTS
from app.infrastructure.streaming import StreamHub

from app.system import ROUTERS as SYSTEM_ROUTERS
from app.authentication import ROUTERS as AUTH_ROUTERS
from app.crab_management import ROUTERS as CRAB_ROUTERS
from app.audit import ROUTERS as AUDIT_ROUTERS

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    broker = RabbitClient()
    app.state.broker = app.state.hub = None
    if settings.rabbitmq_enabled:
        try:
            await broker.connect()
            hub = StreamHub(broker, bindings=[SYSTEM_EVENTS])
            await hub.start()
            app.state.broker, app.state.hub = broker, hub
        except (AMQPError, OSError):
            # Auth and CRUD keep working without the broker; stream endpoints answer 503 until a restart
            logger.exception("RabbitMQ unreachable at startup; live streams are disabled")

    yield

    if app.state.hub is not None:
        await app.state.hub.stop()
    await broker.close()


def create_app(settings) -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version="2.0.0",
        lifespan=lifespan,
        description="""
## Crabfarm API

Backend API for the Crabfarm application.

### Features

- Authentication and authorization
- User management
- API health monitoring
- Database integration

### API Documentation

This API provides endpoints for interacting with the Crabfarm backend.
        """,
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Correlation-ID"],
        expose_headers=["X-Correlation-ID"],
        max_age=3600
    )

    register_exception_handlers(app)

    for router in (
        *AUTH_ROUTERS,
        *CRAB_ROUTERS,
        *AUDIT_ROUTERS,
        *SYSTEM_ROUTERS,
    ):
        app.include_router(router, prefix=settings.api_prefix)


    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "ok"
        }

    return app

app = create_app(settings)