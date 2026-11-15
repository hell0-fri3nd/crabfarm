from fastapi import (
    APIRouter,
    Depends,
    Request,
    status,
)
from fastapi.responses import StreamingResponse

from app.authentication.users import get_current_user, require_permissions
from app.core import Permission
from app.core.exceptions import AUDIT_ACTION_KEY
from .dependencies import StreamHubDep, TokenExpiry
from .schemas import ErrorResponse
from .services import EventStreamServices

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

router = APIRouter(prefix="/events", tags=["System - Events"], dependencies=[Depends(get_current_user)])


@router.get(
    "/stream",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "events.stream"},
    dependencies=[Depends(require_permissions(Permission.EVENTS_READ))],
    responses={
        status.HTTP_200_OK: {
            "content": {"text/event-stream": {}},
            "description": "SSE stream of `system.<type>` events (data: SystemEvent), `: ping` every 15 s",
        },
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse, "description": "Missing, invalid or expired token"},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse, "description": "Missing events:read permission"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "Broker unreachable"},
    },
)
async def stream_events(request: Request, hub: StreamHubDep, until: TokenExpiry) -> StreamingResponse:
    return StreamingResponse(
        EventStreamServices(hub).stream(request, until),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )
