from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Path,
    Query,
    Request,
    status,
)

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
from ..dependencies import LogServicesDep
from ..models import Logs
from ..schemas import (
    CreateLogRequest,
    DailyLogSummary,
    ListCrabLogsQuery,
    ListLogsQuery,
)
from ..services import LOG_ERRORS, LOG_OUTCOMES


router = APIRouter(
    prefix="/logs",
    tags=["Crab Logs"],
    dependencies=[Depends(get_current_user)],
)

UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired access token"}

raise_for = RaiseFor(LOG_OUTCOMES, LOG_ERRORS)


@router.get(
    "",
    response_model=Response[Page[Logs]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "log.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid filters, page or sort"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing logs"},
    },
)
def list_logs(
    filters: Annotated[ListLogsQuery, Query()],
    request: Request,
    actor: AnyRole,
    services: LogServicesDep,
):
    result = services.list(filters, actor, request)
    raise_for(result, "log.list")
    return result


# Declared before /{crab_id}, which would otherwise capture these paths
@router.get(
    "/daily-summary",
    response_model=Response[list[DailyLogSummary]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "log.daily_summary"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid filters"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error summarizing logs"},
    },
)
def get_daily_log_summary(
    filters: Annotated[ListLogsQuery, Query()],
    actor: AnyRole,
    services: LogServicesDep,
):
    result = services.daily_summary(filters)
    raise_for(result, "log.daily_summary")
    return result


@router.get(
    "/crab-ids",
    response_model=Response[list[int]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "log.crab_ids"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid filters"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing logged crabs"},
    },
)
def list_logged_crab_ids(
    filters: Annotated[ListLogsQuery, Query()],
    actor: AnyRole,
    services: LogServicesDep,
):
    result = services.list_crab_ids(filters)
    raise_for(result, "log.crab_ids")
    return result


@router.get(
    "/{crab_id}",
    response_model=Response[Page[Logs]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "log.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid filters, page or sort"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing logs"},
    },
)
def list_crab_logs(
    crab_id: Annotated[int, Path(gt=0)],
    filters: Annotated[ListCrabLogsQuery, Query()],
    request: Request,
    actor: AnyRole,
    services: LogServicesDep,
):
    result = services.list_for_crab(crab_id, filters, actor, request)
    raise_for(result, "log.list")
    return result


@router.post(
    "",
    response_model=Response[Logs],
    status_code=status.HTTP_201_CREATED,
    openapi_extra={AUDIT_ACTION_KEY: "log.create"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_404_NOT_FOUND: {"model": ValidationErrorResponse, "description": "Crab or batch not found"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid log fields"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error creating the log"},
    },
)
def create_log(
    payload: CreateLogRequest,
    request: Request,
    actor: AnyRole,
    services: LogServicesDep,
):
    result = services.create(payload, actor, request)
    raise_for(result, "log.create")
    return result
