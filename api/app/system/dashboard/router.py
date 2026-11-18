from fastapi import (
    APIRouter,
    Depends,
    Request,
    status,
)
from fastapi.responses import StreamingResponse

from app.core import (
    AnyRole,
    ErrorResponse,
    RaiseFor,
    Response,
    get_current_user,
)
from app.core.exceptions import AUDIT_ACTION_KEY
from .dependencies import (
    DashboardServicesDep,
    DashboardStreamDep,
    TokenExpiry,
)
from .schemas import DashboardSummary
from .services import DASHBOARD_ERRORS, DASHBOARD_OUTCOMES

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired access token"}

router = APIRouter(prefix="/dashboard", tags=["System - Dashboard"], dependencies=[Depends(get_current_user)])

raise_for = RaiseFor(DASHBOARD_OUTCOMES, DASHBOARD_ERRORS)


@router.get(
    "/summary",
    response_model=Response[DashboardSummary],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "dashboard.summary"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error reading the summary"},
    },
)
def read_dashboard_summary(actor: AnyRole, services: DashboardServicesDep):
    result = services.summary()
    raise_for(result, "dashboard.summary")
    return result


@router.get(
    "/stream",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "dashboard.stream"},
    responses={
        status.HTTP_200_OK: {
            "content": {"text/event-stream": {}},
            "description": "SSE stream of `dashboard.summary` events (data: DashboardSummary), first now and then on each change",
        },
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
    },
)
async def stream_dashboard_summary(
    request: Request,
    services: DashboardStreamDep,
    until: TokenExpiry,
) -> StreamingResponse:
    return StreamingResponse(services.stream(request, until), media_type="text/event-stream", headers=SSE_HEADERS)
