import logging
from contextlib import suppress
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import Request, status
from sqlmodel import Session

from app.core import Page, Response
from app.core.audit import (
    Actor,
    AuditServices,
    Outcome,
)
from app.infrastructure.ml import (
    ModelRegistry,
    TrainingRunner,
    TrainingRunningError,
    TrainingStatus,
    get_model_registry,
)
from ..schemas import ListModelTrainingsQuery

logger = logging.getLogger(__name__)


MODEL_TRAINING_OUTCOMES = {
    "MODEL_TRAINING_QUEUED":       (Outcome.SUCCESS, status.HTTP_202_ACCEPTED),
    "MODEL_TRAININGS_LISTED":      (Outcome.SUCCESS, status.HTTP_200_OK),
    "MODEL_TRAINING_FOUND":        (Outcome.SUCCESS, status.HTTP_200_OK),
    "MODEL_TRAINING_RUNNING":      (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "MODEL_TRAINING_NOT_FOUND":    (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "MODEL_TRAINING_START_FAILED": (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "MODEL_TRAININGS_LIST_FAILED": (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

MODEL_TRAINING_ERRORS = {
    "MODEL_TRAINING_RUNNING":      ("server", "A model training is already running; wait for it to finish"),
    "MODEL_TRAINING_NOT_FOUND":    ("path.training_id", "Model training not found"),
    "MODEL_TRAINING_START_FAILED": ("server", "Unable to start the model training right now"),
    "MODEL_TRAININGS_LIST_FAILED": ("server", "Unable to list model trainings right now"),
}

FAILURE_MESSAGES = {code: message for code, (_, message) in MODEL_TRAINING_ERRORS.items()}


class ModelTrainingServices:
    def __init__(
        self,
        db: Session,
        registry: ModelRegistry | None = None,
        runner: TrainingRunner | None = None,
        audit: AuditServices | None = None,
    ):
        self.registry = registry or get_model_registry()
        self.runner = runner or TrainingRunner()
        self.audit = audit or AuditServices(outcomes=MODEL_TRAINING_OUTCOMES, errors=MODEL_TRAINING_ERRORS)

    @staticmethod
    def __failed(code: str) -> Response:
        return Response(success=False, message=FAILURE_MESSAGES[code], code=code)

    def __record(self, action: str, code: str, actor: Actor, request: Request | None, training_id: UUID | None = None) -> None:
        self.audit.record_target(
            action,
            code,
            request,
            actor,
            target_type="model_training",
            target_label=str(training_id) if training_id else None,
        )

    def create(self, actor: Actor, request: Request | None = None) -> Response[TrainingStatus]:
        """Takes the training lock and starts a gated retrain in its own process; poll `get()` for the result."""
        action = "model_training.create"
        training_id = uuid4()
        try:
            self.registry.acquire_lock(training_id)
        except TrainingRunningError:
            self.__record(action, "MODEL_TRAINING_RUNNING", actor, request)
            return self.__failed("MODEL_TRAINING_RUNNING")

        queued = TrainingStatus(
            training_id=training_id,
            status="queued",
            trigger="manual",
            started_by=actor.id,
            started_at=datetime.now(timezone.utc),
        )
        try:
            self.registry.record_training(queued)
            self.runner.start(training_id, started_by=actor.id)
        except Exception:
            logger.exception("Starting model training %s failed", training_id)
            with suppress(OSError):
                self.registry.record_training(
                    queued.model_copy(
                        update={"status": "failed", "finished_at": datetime.now(timezone.utc), "reason": "The training process couldn't start"}
                    )
                )
            self.registry.release_lock(training_id)
            self.__record(action, "MODEL_TRAINING_START_FAILED", actor, request, training_id)
            return self.__failed("MODEL_TRAINING_START_FAILED")

        self.__record(action, "MODEL_TRAINING_QUEUED", actor, request, training_id)
        return Response(success=True, message="Model training started", code="MODEL_TRAINING_QUEUED", details=queued)

    def list(self, query: ListModelTrainingsQuery, actor: Actor, request: Request | None = None) -> Response[Page[TrainingStatus]]:
        action = "model_training.list"
        try:
            trainings = [
                training
                for training in self.registry.list_trainings()
                if query.status is None or training.status == query.status
            ]
        except Exception:
            logger.exception("Listing model trainings failed")
            self.__record(action, "MODEL_TRAININGS_LIST_FAILED", actor, request)
            return self.__failed("MODEL_TRAININGS_LIST_FAILED")

        if query.sort == "started_at":
            trainings.reverse()
        page = Page(
            items=trainings[query.offset:query.offset + query.size],
            total=len(trainings),
            page=query.page,
            size=query.size,
        )
        self.__record(action, "MODEL_TRAININGS_LISTED", actor, request)
        return Response(success=True, message="Model trainings retrieved", code="MODEL_TRAININGS_LISTED", details=page)

    def get(self, training_id: UUID) -> Response[TrainingStatus]:
        """Not audited: the web polls it every few seconds while a training runs."""
        try:
            training = self.registry.get_training(training_id)
        except FileNotFoundError:
            return self.__failed("MODEL_TRAINING_NOT_FOUND")
        return Response(success=True, message="Model training found", code="MODEL_TRAINING_FOUND", details=training)
