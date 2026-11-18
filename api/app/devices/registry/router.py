from fastapi import (
    APIRouter,
    Depends,
    Request,
    status,
)
from fastapi.responses import StreamingResponse

from app.core import ErrorResponse, get_current_user
from app.core.exceptions import AUDIT_ACTION_KEY
from .dependencies import DeviceStatusStreamDep, TokenExpiry

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

router = APIRouter(prefix="/devices", tags=["Devices"], dependencies=[Depends(get_current_user)])


@router.get(
    "/stream",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "device.stream"},
    responses={
        status.HTTP_200_OK: {
            "content": {"text/event-stream": {}},
            "description": "SSE stream of `device.status` events (data: DeviceStatusEvent), `: ping` every 15 s",
        },
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse, "description": "Missing, invalid or expired token"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "Broker off or unreachable"},
    },
)
async def stream_device_status(
    request: Request,
    services: DeviceStatusStreamDep,
    until: TokenExpiry,
) -> StreamingResponse:
    return StreamingResponse(services.stream(request, until), media_type="text/event-stream", headers=SSE_HEADERS)
