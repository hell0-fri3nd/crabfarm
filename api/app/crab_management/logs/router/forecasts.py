from typing import Annotated

from fastapi import (
    APIRouter,
    Body,
    Depends,
    Request,
    status,
)

from app.core import (
    DeveloperOrAdmin,
    ErrorResponse,
    RaiseFor,
    Response,
    ValidationErrorResponse,
    get_current_user,
)
from app.core.exceptions import AUDIT_ACTION_KEY
from ..dependencies import ForecastServicesDep
from ..schemas import CreateForecastRequest, ForecastResult
from ..services import FORECAST_ERRORS, FORECAST_OUTCOMES

# The model only appears when someone trains one, so clients shouldn't retry quickly
MODEL_RETRY_AFTER_SECONDS = "3600"

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
