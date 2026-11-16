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
from .schemas import RecordStickerDownloadRequest
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


@router.post(
    "/sticker-downloads",
    response_model=Response[None],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "crab.sticker_download"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_404_NOT_FOUND: {"model": ValidationErrorResponse, "description": "Batch or crabs not found"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid download fields"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error recording the download"},
    },
)
def record_sticker_download(
    payload: RecordStickerDownloadRequest,
    request: Request,
    actor: AnyRole,
    services: CrabServicesDep,
):
    result = services.record_sticker_download(payload, actor, request)
    raise_for(result, "crab.sticker_download")
    return result
