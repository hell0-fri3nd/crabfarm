from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Query,
    Request,
    status,
)
from fastapi.responses import StreamingResponse

from app.core import (
    AnyRole,
    ErrorResponse,
    Page,
    RaiseFor,
    Response,
    ValidationErrorResponse,
    get_current_user,
)
from app.core.exceptions import AUDIT_ACTION_KEY
from .dependencies import (
    TokenExpiry,
    WaterSensorLogServicesDep,
    WaterSensorStreamDep,
    WaterSensorThresholdServicesDep,
)
from .models import WaterSensorLogs
from .schemas import (
    ListWaterSensorLogsQuery,
    WaterSensorLogFilters,
    WaterSensorStatusCounts,
    WaterSensorThresholdRead,
)
from .services import WATER_SENSOR_LOG_ERRORS, WATER_SENSOR_LOG_OUTCOMES

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired token"}

router = APIRouter(prefix="/water-sensors", tags=["Water Sensors"], dependencies=[Depends(get_current_user)])

raise_for = RaiseFor(WATER_SENSOR_LOG_OUTCOMES, WATER_SENSOR_LOG_ERRORS)


@router.get(
    "/stream",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "water_sensor.stream"},
    responses={
        status.HTTP_200_OK: {
            "content": {"text/event-stream": {}},
            "description": "SSE stream of `water_sensor.reading` events (data: WaterSensorReadingEvent), `: ping` every 15 s",
        },
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "Broker off or unreachable"},
    },
)
async def stream_water_sensor_readings(
    request: Request,
    services: WaterSensorStreamDep,
    until: TokenExpiry,
) -> StreamingResponse:
    return StreamingResponse(services.stream(request, until), media_type="text/event-stream", headers=SSE_HEADERS)


@router.get(
    "/thresholds",
    response_model=Response[list[WaterSensorThresholdRead]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "water_sensor.thresholds"},
    responses={status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED},
)
def list_water_sensor_thresholds(actor: AnyRole, services: WaterSensorThresholdServicesDep):
    return services.list()


@router.get(
    "/logs",
    response_model=Response[Page[WaterSensorLogs]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "water_sensor_log.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid filters, page or sort"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing sensor logs"},
    },
)
def list_water_sensor_logs(
    filters: Annotated[ListWaterSensorLogsQuery, Query()],
    request: Request,
    actor: AnyRole,
    services: WaterSensorLogServicesDep,
):
    result = services.list(filters, actor, request)
    raise_for(result, "water_sensor_log.list")
    return result


@router.get(
    "/logs/status-counts",
    response_model=Response[WaterSensorStatusCounts],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "water_sensor_log.status_counts"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid filters"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error counting sensor logs"},
    },
)
def count_water_sensor_logs(
    filters: Annotated[WaterSensorLogFilters, Query()],
    actor: AnyRole,
    services: WaterSensorLogServicesDep,
):
    result = services.count_by_status(filters)
    raise_for(result, "water_sensor_log.status_counts")
    return result
