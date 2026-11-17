from fastapi import (
    APIRouter,
    Depends,
    Request,
    status,
)
from fastapi.responses import StreamingResponse

from app.core import ErrorResponse, get_current_user
from app.core.exceptions import AUDIT_ACTION_KEY
from .dependencies import ScaleStreamDep, TokenExpiry

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

router = APIRouter(prefix="/scales", tags=["Scales"], dependencies=[Depends(get_current_user)])


@router.get(
    "/stream",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "scale.stream"},
    responses={
        status.HTTP_200_OK: {
            "content": {"text/event-stream": {}},
            "description": "SSE stream of `scale.reading` events (data: ScaleReadingEvent), `: ping` every 15 s",
        },
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse, "description": "Missing, invalid or expired token"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "Broker off or unreachable"},
    },
)
async def stream_scale_readings(
    request: Request,
    services: ScaleStreamDep,
    until: TokenExpiry,
) -> StreamingResponse:
    return StreamingResponse(services.stream(request, until), media_type="text/event-stream", headers=SSE_HEADERS)
