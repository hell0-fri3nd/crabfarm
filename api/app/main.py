# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import settings
from app.authentication import ROUTERS as AUTH_ROUTERS

def create_app(settings) -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version="2.0.0",
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
        allow_methods=["GET", "POST", "PUT", "PATCH"],
        allow_headers=["Authorization", "Content-Type", "X-Correlation-ID"],
        expose_headers=["X-Correlation-ID"],
        max_age=3600
    )
    
    
    for router in (
        *AUTH_ROUTERS,
    ):
        app.include_router(router, prefix=settings.api_prefix)


    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "ok"
        }

    return app

app = create_app(settings)