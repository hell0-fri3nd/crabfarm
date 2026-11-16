from fastapi import (
    APIRouter,
    Depends,
    Request,
    status,
)

from app.core import (
    get_current_user, 
    ErrorResponse, 
    RaiseFor, 
    Response, 
    ValidationErrorResponse,
    AnyRole,
    DeveloperOrAdmin
)
from app.core.exceptions import AUDIT_ACTION_KEY
from .dependencies import BatchServicesDep
from .models import Batches
from .services import BATCH_ERRORS, BATCH_OUTCOMES


router = APIRouter(
    prefix="/batches", 
    tags=["Crab Batches"], 
    dependencies=[Depends(get_current_user)]
)

UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired access token"}
ROLE_DENIED = {"model": ErrorResponse, "description": "Only DEVELOPER and ADMIN roles"}

raise_for = RaiseFor(BATCH_OUTCOMES, BATCH_ERRORS)

@router.get(
    "",
    response_model=Response[list[Batches]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "batch.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_404_NOT_FOUND: {"model": ValidationErrorResponse, "description": "No batches exist yet"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing batches"},
    },
)
def list_batches(request: Request, actor: AnyRole, services: BatchServicesDep):
    result = services.list(actor, request)
    raise_for(result, "batch.list")
    return result


@router.post(
    "",
    response_model=Response[Batches],
    status_code=status.HTTP_201_CREATED,
    openapi_extra={AUDIT_ACTION_KEY: "batch.create"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: ROLE_DENIED,
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error creating the batch"},
    },
)
def create_batch(request: Request, actor: DeveloperOrAdmin, services: BatchServicesDep):
    result = services.create(actor, request)
    raise_for(result, "batch.create")
    return result
