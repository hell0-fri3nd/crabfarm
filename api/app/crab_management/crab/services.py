import logging

from fastapi import Request, status
from sqlmodel import (
    Session,
    col,
    func,
    select,
)

from app.core import Response
from app.core.audit import Actor, AuditServices, Outcome
from app.crab_management.batches import BatchServices
from .models import Crabs
from .schemas import RecordStickerDownloadRequest

logger = logging.getLogger(__name__)


CRAB_OUTCOMES = {
    "CRABS_LISTED":                (Outcome.SUCCESS, status.HTTP_200_OK),
    "STICKER_DOWNLOAD_RECORDED":   (Outcome.SUCCESS, status.HTTP_200_OK),
    "CRABS_NOT_FOUND":             (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "STICKER_CRABS_NOT_FOUND":     (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "STICKER_BATCH_NOT_FOUND":     (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "CRABS_LIST_FAILED":           (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "CRABS_CREATE_FAILED":         (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "STICKER_DOWNLOAD_FAILED":     (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

CRAB_ERRORS = {
    "CRABS_NOT_FOUND":         ("crabs", "No crabs found"),
    "STICKER_CRABS_NOT_FOUND": ("crab_ids", "One or more crabs were not found"),
    "STICKER_BATCH_NOT_FOUND": ("batch_id", "Batch not found"),
    "CRABS_LIST_FAILED":       ("server", "Unable to list crabs right now"),
    "STICKER_DOWNLOAD_FAILED": ("server", "Unable to record the sticker download right now"),
}

FAILURE_MESSAGES = {code: message for code, (_, message) in CRAB_ERRORS.items()}


class CrabServices:
    def __init__(self, db: Session, audit: AuditServices | None = None):
        self.db = db
        self.audit = audit or AuditServices(outcomes=CRAB_OUTCOMES, errors=CRAB_ERRORS)

    def __fail(self, action: str, code: str, actor: Actor, request: Request | None) -> Response:
        self.audit.record_target(action, code, request, actor, target_type="crab")
        return Response(success=False, message=FAILURE_MESSAGES[code], code=code)

    def count(self) -> int:
        return self.db.exec(select(func.count()).select_from(Crabs)).one()

    def list(self, actor: Actor, request: Request | None = None) -> Response[list[Crabs]]:
        action = "crab.list"
        try:
            crabs = list(self.db.exec(select(Crabs)).all())
            if not crabs:
                return self.__fail(action, "CRABS_NOT_FOUND", actor, request)

            self.audit.record_target(action, "CRABS_LISTED", request, actor, target_type="crab")
            return Response(success=True, message="Crabs retrieved", code="CRABS_LISTED", details=crabs)

        except Exception:
            logger.exception("Crab listing failed")
            return self.__fail(action, "CRABS_LIST_FAILED", actor, request)

    def record_sticker_download(
        self,
        payload: RecordStickerDownloadRequest,
        actor: Actor,
        request: Request | None = None,
    ) -> Response[None]:
        action = "crab.sticker_download"
        try:
            if not (batch := BatchServices(self.db).find(payload.batch_id)):
                return self.__fail(action, "STICKER_BATCH_NOT_FOUND", actor, request)

            crabs = self.db.exec(select(Crabs).where(col(Crabs.id).in_(payload.crab_ids))).all()
            if len(crabs) != len(payload.crab_ids):
                return self.__fail(action, "STICKER_CRABS_NOT_FOUND", actor, request)

            self.audit.record_target(
                action,
                "STICKER_DOWNLOAD_RECORDED",
                request,
                actor,
                target_type="batch",
                target=batch,
                changes={**payload.model_dump(mode="json"), "crab_names": sorted(crab.name for crab in crabs)},
            )
            return Response(
                success=True,
                message=f"{payload.file_type.upper()} download recorded",
                code="STICKER_DOWNLOAD_RECORDED",
            )

        except Exception:
            logger.exception("Sticker download recording failed")
            return self.__fail(action, "STICKER_DOWNLOAD_FAILED", actor, request)
