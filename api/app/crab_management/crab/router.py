from fastapi import (
    APIRouter,
    Depends,
    Request,
    status,
)

from app.core import (
    get_current_user,
    RaiseFor,
    Response,
    ErrorResponse, 
    ValidationErrorResponse
)
from app.core.exceptions import AUDIT_ACTION_KEY
from .dependencies import AnyRole, CrabServicesDep
from .models import Crabs
from .services import CRAB_OUTCOMES,CRAB_ERRORS


router = APIRouter(
    prefix="/crabs",
    tags=["Crabs"],
    dependencies=[Depends(get_current_user)],
)

raise_for = RaiseFor(CRAB_OUTCOMES, CRAB_ERRORS)
UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired access token"}

@router.get(
    "",
    response_model=Response[list[Crabs]],
    openapi_extra={AUDIT_ACTION_KEY: "crab.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_404_NOT_FOUND: {"model": ValidationErrorResponse, "description": "No batches exist yet"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing batches"},
    },
)
def list_crabs(
    request: Request, 
    actor: AnyRole, 
    services: CrabServicesDep
):
    result = services.list(actor, request)
    raise_for(result, "crab.list")
    return result
