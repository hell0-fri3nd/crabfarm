import logging

from fastapi import Request, status
from sqlmodel import Session, select

from app.core import Response
from app.core.audit import Actor, AuditServices, Outcome
from .models import Batches

logger = logging.getLogger(__name__)


BATCH_OUTCOMES = {
    "BATCHES_LISTED":      (Outcome.SUCCESS, status.HTTP_200_OK),
    "BATCH_CREATED":       (Outcome.SUCCESS, status.HTTP_201_CREATED),
    "BATCHES_NOT_FOUND":   (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "BATCHES_LIST_FAILED": (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "BATCH_CREATE_FAILED": (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

BATCH_ERRORS = {
    "BATCHES_NOT_FOUND":   ("batches", "No batches found"),
    "BATCHES_LIST_FAILED": ("server", "Unable to list batches right now"),
    "BATCH_CREATE_FAILED": ("server", "Unable to create the batch right now"),
}

FAILURE_MESSAGES = {code: message for code, (_, message) in BATCH_ERRORS.items()}


class BatchServices:
    def __init__(self, db: Session, audit: AuditServices | None = None):
        self.db = db
        self.audit = audit or AuditServices(outcomes=BATCH_OUTCOMES, errors=BATCH_ERRORS)

    def __fail(self, action: str, code: str, actor: Actor, request: Request | None) -> Response:
        self.audit.record_target(action, code, request, actor, target_type="batch")
        return Response(success=False, message=FAILURE_MESSAGES[code], code=code)

    def find(self, batch_id: int) -> Batches | None:
        return self.db.get(Batches, batch_id)

    def list(self, actor: Actor, request: Request | None = None) -> Response[list[Batches]]:
        action = "batch.list"
        try:
            batches = list(self.db.exec(select(Batches).order_by(Batches.created_at.desc())).all())
            if not batches:
                return self.__fail(action, "BATCHES_NOT_FOUND", actor, request)

            self.audit.record_target(action, "BATCHES_LISTED", request, actor, target_type="batch")
            return Response(success=True, message="Batches retrieved", code="BATCHES_LISTED", details=batches)

        except Exception:
            logger.exception("Batch listing failed")
            return self.__fail(action, "BATCHES_LIST_FAILED", actor, request)

    def create(self, actor: Actor, request: Request | None = None) -> Response[Batches]:
        action = "batch.create"
        try:
            batch = Batches(user_id=actor.id)
            self.db.add(batch)
            self.db.commit()
            self.db.refresh(batch)

            self.audit.record_target(
                action,
                "BATCH_CREATED",
                request,
                actor,
                target_type="batch",
                target=batch,
                changes={"after": batch.model_dump(mode="json")},
            )
            return Response(success=True, message="Batch created", code="BATCH_CREATED", details=batch)

        except Exception:
            self.db.rollback()
            logger.exception("Batch creation failed")
            return self.__fail(action, "BATCH_CREATE_FAILED", actor, request)
