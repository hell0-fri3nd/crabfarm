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
    ErrorResponse,
    Page,
    RaiseFor,
    Response,
    ValidationErrorResponse,
    get_current_user,
)
from app.core.exceptions import AUDIT_ACTION_KEY
from ..dependencies import CageServicesDep
from ..models import Cages
from ..schemas import ListCagesQuery, UpdateCageRequest
from ..services import CAGE_ERRORS, CAGE_OUTCOMES

router = APIRouter(prefix="/cages", tags=["Feeding Cages"], dependencies=[Depends(get_current_user)])

UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired access token"}

raise_for = RaiseFor(CAGE_OUTCOMES, CAGE_ERRORS)


@router.get(
    "",
    response_model=Response[Page[Cages]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "cage.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid page or size"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing cages"},
    },
)
def list_cages(
    query: Annotated[ListCagesQuery, Query()],
    request: Request,
    actor: AnyRole,
    services: CageServicesDep,
):
    result = services.list(query, actor, request)
    raise_for(result, "cage.list")
    return result


@router.patch(
    "/{cage_id}",
    response_model=Response[Cages],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "cage.update"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_404_NOT_FOUND: {"model": ValidationErrorResponse, "description": "Cage not found"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid cage fields"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error updating the cage"},
    },
)
def update_cage(
    cage_id: UUID,
    payload: UpdateCageRequest,
    request: Request,
    actor: AnyRole,
    services: CageServicesDep,
):
    result = services.update(cage_id, payload, actor, request)
    raise_for(result, "cage.update")
    return result
