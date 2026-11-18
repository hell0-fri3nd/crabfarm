from typing import Annotated

from fastapi import (
    APIRouter,
    Body,
    Depends,
    Request,
    status,
)
from fastapi.responses import StreamingResponse

from app.core import (
    DeveloperOrAdmin,
    ErrorResponse,
    RaiseFor,
    Response,
    ValidationErrorResponse,
    get_current_user,
)
from app.core.exceptions import AUDIT_ACTION_KEY
from ..dependencies import (
    CurrentModelStatusDep,
    ForecastServicesDep,
    ModelStatusServicesDep,
    ModelStatusStreamDep,
    TokenExpiry,
)
from ..schemas import CreateForecastRequest, ForecastResult, ModelStatus
from ..services import FORECAST_ERRORS, FORECAST_OUTCOMES

# The model only appears when someone trains one, so clients shouldn't retry quickly
MODEL_RETRY_AFTER_SECONDS = "3600"

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

router = APIRouter(
    prefix="/forecasts",
    tags=["Forecasts"],
    dependencies=[Depends(get_current_user)],
)

raise_for = RaiseFor(
    FORECAST_OUTCOMES,
    FORECAST_ERRORS,
    headers={"FORECAST_MODEL_UNAVAILABLE": {"Retry-After": MODEL_RETRY_AFTER_SECONDS}},
)


@router.post(
    "",
    response_model=Response[ForecastResult],
    status_code=status.HTTP_201_CREATED,
    openapi_extra={AUDIT_ACTION_KEY: "forecast.create"},
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ValidationErrorResponse, "description": "No crab has enough logged days to forecast"},
        status.HTTP_409_CONFLICT: {"model": ValidationErrorResponse, "description": "The crab (or every eligible crab) already has a forecast covering the coming days"},
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse, "description": "Missing, invalid or expired access token"},
        status.HTTP_403_FORBIDDEN: {"model": ErrorResponse, "description": "Only DEVELOPER and ADMIN can run forecasts"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid body"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error forecasting"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "The growth model isn't trained yet (Retry-After)"},
    },
)
def create_forecast(
    request: Request,
    actor: DeveloperOrAdmin,
    services: ForecastServicesDep,
    payload: Annotated[CreateForecastRequest, Body()] = CreateForecastRequest(),
):
    result = services.create(payload, actor, request)
    raise_for(result, "forecast.create")
    return result


@router.get(
    "/model",
    response_model=Response[ModelStatus],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "forecast_model.read"},
    responses={
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse, "description": "Missing, invalid or expired access token"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error reading the model status"},
    },
)
def get_forecast_model(services: ModelStatusServicesDep):
    return services.get()


@router.get(
    "/stream",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "forecast.stream"},
    responses={
        status.HTTP_200_OK: {
            "content": {"text/event-stream": {}},
            "description": "SSE stream of `forecast.model` events (data: ModelStatus): the current status first, then each change; `: ping` every 15 s",
        },
        status.HTTP_401_UNAUTHORIZED: {"model": ErrorResponse, "description": "Missing, invalid or expired token"},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "Broker off or unreachable"},
    },
)
async def stream_forecast_model(
    request: Request,
    stream: ModelStatusStreamDep,
    first: CurrentModelStatusDep,
    until: TokenExpiry,
) -> StreamingResponse:
    return StreamingResponse(stream.stream(request, first, until), media_type="text/event-stream", headers=SSE_HEADERS)
