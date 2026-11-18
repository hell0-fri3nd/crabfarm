from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Query,
    Request,
    status,
)

from app.core import (
    AnyRole,
    DeveloperOrAdmin,
    ErrorResponse,
    Page,
    RaiseFor,
    Response,
    ValidationErrorResponse,
    get_current_user,
)
from app.core.exceptions import AUDIT_ACTION_KEY
from ..dependencies import ScheduleServicesDep
from ..schemas import (
    CreateScheduleRequest,
    ListSchedulesQuery,
    ScheduleRead,
    UpdateScheduleRequest,
)
from ..services import SCHEDULE_ERRORS, SCHEDULE_OUTCOMES

router = APIRouter(prefix="/schedules", tags=["Feeding Schedules"], dependencies=[Depends(get_current_user)])

UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired access token"}
ROLE_DENIED = {"model": ErrorResponse, "description": "Only DEVELOPER and ADMIN roles"}
NOT_FOUND = {"model": ValidationErrorResponse, "description": "Schedule not found"}

raise_for = RaiseFor(SCHEDULE_OUTCOMES, SCHEDULE_ERRORS)


@router.get(
    "",
    response_model=Response[Page[ScheduleRead]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "schedule.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid page or size"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing schedules"},
    },
)
def list_schedules(
    query: Annotated[ListSchedulesQuery, Query()],
    request: Request,
    actor: AnyRole,
    services: ScheduleServicesDep,
):
    result = services.list(query, actor, request)
    raise_for(result, "schedule.list")
    return result


@router.post(
    "",
    response_model=Response[ScheduleRead],
    status_code=status.HTTP_201_CREATED,
    openapi_extra={AUDIT_ACTION_KEY: "schedule.create"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ROLE_DENIED,
        status.HTTP_404_NOT_FOUND: {"model": ValidationErrorResponse, "description": "A group has no cages"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid schedule fields"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error creating the schedule"},
    },
)
def create_schedule(
    payload: CreateScheduleRequest,
    request: Request,
    actor: DeveloperOrAdmin,
    services: ScheduleServicesDep,
):
    result = services.create(payload, actor, request)
    raise_for(result, "schedule.create")
    return result


@router.patch(
    "/{schedule_id}",
    response_model=Response[ScheduleRead],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "schedule.update"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: {"model": ValidationErrorResponse, "description": "STAFF may only send is_enabled"},
        status.HTTP_404_NOT_FOUND: {"model": ValidationErrorResponse, "description": "Schedule not found, or a group has no cages"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid schedule fields"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error updating the schedule"},
    },
)
def update_schedule(
    schedule_id: UUID,
    payload: UpdateScheduleRequest,
    request: Request,
    actor: AnyRole,
    services: ScheduleServicesDep,
):
    result = services.update(schedule_id, payload, actor, request)
    raise_for(result, "schedule.update")
    return result


@router.delete(
    "/{schedule_id}",
    response_model=Response[None],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "schedule.delete"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ROLE_DENIED,
        status.HTTP_404_NOT_FOUND: NOT_FOUND,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error deleting the schedule"},
    },
)
def delete_schedule(
    schedule_id: UUID,
    request: Request,
    actor: DeveloperOrAdmin,
    services: ScheduleServicesDep,
):
    result = services.delete(schedule_id, actor, request)
    raise_for(result, "schedule.delete")
    return result


@router.post(
    "/{schedule_id}/restore",
    response_model=Response[ScheduleRead],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "schedule.restore"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ROLE_DENIED,
        status.HTTP_404_NOT_FOUND: NOT_FOUND,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error restoring the schedule"},
    },
)
def restore_schedule(
    schedule_id: UUID,
    request: Request,
    actor: DeveloperOrAdmin,
    services: ScheduleServicesDep,
):
    result = services.restore(schedule_id, actor, request)
    raise_for(result, "schedule.restore")
    return result
