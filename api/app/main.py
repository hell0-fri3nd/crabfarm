# main.py

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from aio_pika.exceptions import AMQPError
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.core import settings, register_exception_handlers

from app.infrastructure.messaging import CRAB_WEIGHT, RabbitClient, SYSTEM_EVENTS
from app.infrastructure.streaming import StreamHub
from app.infrastructure.vision import YoloDetector

from app.system import ROUTERS as SYSTEM_ROUTERS
from app.authentication import ROUTERS as AUTH_ROUTERS
from app.crab_management import ROUTERS as CRAB_ROUTERS
from app.audit import ROUTERS as AUDIT_ROUTERS
from app.artificial_intelligence import ROUTERS as AI_ROUTERS
from app.monitoring import ROUTERS as MONITORING_ROUTERS

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    broker = RabbitClient()
    app.state.broker = app.state.hub = None
    if settings.rabbitmq_enabled:
        try:
            await broker.connect()
            hub = StreamHub(broker, bindings=[SYSTEM_EVENTS], device_bindings=[CRAB_WEIGHT])
            await hub.start()
            app.state.broker, app.state.hub = broker, hub
        except (AMQPError, OSError):
            # Auth and CRUD keep working without the broker; stream endpoints answer 503 until a restart
            logger.exception("RabbitMQ unreachable at startup; live streams are disabled")

    detector = YoloDetector()
    app.state.detector = detector
    try:
        await run_in_threadpool(detector.load)
    except Exception:
        # Missing weights or a failed download: everything else keeps working; detection sockets close with 1013
        logger.exception("YOLO model %s failed to load; live detection is disabled", detector.name)

    yield

    detector.close()
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
        *AI_ROUTERS,
        *MONITORING_ROUTERS,
    ):
        app.include_router(router, prefix=settings.api_prefix)


    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "ok"
        }

    return app

app = create_app(settings)