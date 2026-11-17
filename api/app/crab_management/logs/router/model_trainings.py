from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Path,
    Query,
    Request,
    status,
)

from app.core import (
    DeveloperOrAdmin,
    ErrorResponse,
    Page,
    RaiseFor,
    Response,
    Role,
    ValidationErrorResponse,
    get_current_user,
    require_roles,
)
from app.core.exceptions import AUDIT_ACTION_KEY
from app.infrastructure.ml import TrainingStatus
from ..dependencies import ModelTrainingServicesDep
from ..schemas import ListModelTrainingsQuery
from ..services import MODEL_TRAINING_ERRORS, MODEL_TRAINING_OUTCOMES


router = APIRouter(
    prefix="/forecasts/model-trainings",
    tags=["Forecasts"],
    dependencies=[Depends(get_current_user)],
)

UNAUTHORIZED = {"model": ErrorResponse, "description": "Missing, invalid or expired access token"}
FORBIDDEN = {"model": ErrorResponse, "description": "Only DEVELOPER and ADMIN can retrain the growth model"}

raise_for = RaiseFor(MODEL_TRAINING_OUTCOMES, MODEL_TRAINING_ERRORS)


@router.post(
    "",
    response_model=Response[TrainingStatus],
    status_code=status.HTTP_202_ACCEPTED,
    openapi_extra={AUDIT_ACTION_KEY: "model_training.create"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: FORBIDDEN,
        status.HTTP_409_CONFLICT: {"model": ErrorResponse, "description": "A model training is already running"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "The training process couldn't start"},
    },
)
def create_model_training(
    request: Request,
    actor: DeveloperOrAdmin,
    services: ModelTrainingServicesDep,
):
    result = services.create(actor, request)
    raise_for(result, "model_training.create")
    return result


@router.get(
    "",
    response_model=Response[Page[TrainingStatus]],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "model_training.list"},
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: FORBIDDEN,
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "Invalid page, status or sort"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse, "description": "Unexpected error listing model trainings"},
    },
)
def list_model_trainings(
    filters: Annotated[ListModelTrainingsQuery, Query()],
    request: Request,
    actor: DeveloperOrAdmin,
    services: ModelTrainingServicesDep,
):
    result = services.list(filters, actor, request)
    raise_for(result, "model_training.list")
    return result


@router.get(
    "/{training_id}",
    response_model=Response[TrainingStatus],
    status_code=status.HTTP_200_OK,
    openapi_extra={AUDIT_ACTION_KEY: "model_training.read"},
    dependencies=[Depends(require_roles(Role.DEVELOPER, Role.ADMIN))],
    responses={
        status.HTTP_401_UNAUTHORIZED: UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN: FORBIDDEN,
        status.HTTP_404_NOT_FOUND: {"model": ValidationErrorResponse, "description": "Model training not found"},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": ValidationErrorResponse, "description": "training_id isn't a UUID"},
    },
)
def get_model_training(
    training_id: Annotated[UUID, Path()],
    services: ModelTrainingServicesDep,
):
    result = services.get(training_id)
    raise_for(result, "model_training.read")
    return result
