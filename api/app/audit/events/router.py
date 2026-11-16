from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
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
from .dependencies import AuditEventServicesDep
from .schemas import AuditEventRead, ListAuditEventsQuery
from .services import AUDIT_EVENT_ERRORS, AUDIT_EVENT_OUTCOMES


router = APIRouter(
    prefix="/audit-events",
    tags=["Audit - Events"],
    dependencies=[Depends(get_current_user)],
)

UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired access token"}

raise_for = RaiseFor(AUDIT_EVENT_OUTCOMES, AUDIT_EVENT_ERRORS)


@router.get(
    "",
    response_model=Response[Page[AuditEventRead]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "audit.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: {"model": ValidationErrorResponse, "description": "STAFF asked for another user's activity"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid filters, page or sort"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing activity"},
    },
)
def list_audit_events(
    filters: Annotated[ListAuditEventsQuery, Query()],
    request: Request,
    actor: AnyRole,
    services: AuditEventServicesDep,
):
    result = services.list(filters, actor, request)
    raise_for(result, "audit.list")
    return result
