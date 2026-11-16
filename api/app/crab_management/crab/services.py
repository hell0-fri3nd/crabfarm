import logging

from fastapi import Request, status
from sqlmodel import Session, select

from app.core import Response
from app.core.audit import Actor, AuditServices, Outcome
from .models import Crabs

logger = logging.getLogger(__name__)


CRAB_OUTCOMES = {
    "CRABS_LISTED":         (Outcome.SUCCESS, status.HTTP_200_OK),
    "CRABS_NOT_FOUND":      (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "CRABS_LIST_FAILED":    (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "CRABS_CREATE_FAILED":  (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

CRAB_ERRORS = {
    "CRABS_NOT_FOUND":   ("crabs", "No crabs found"),
    "CRABS_LIST_FAILED": ("server", "Unable to list crabs right now")
}

FAILURE_MESSAGES = {code: message for code, (_, message) in CRAB_ERRORS.items()}


class CrabServices:
    def __init__(self, db: Session, audit: AuditServices | None = None):
        self.db = db
        self.audit = audit or AuditServices(outcomes=CRAB_OUTCOMES, errors=CRAB_ERRORS)

    def __fail(self, action: str, code: str, actor: Actor, request: Request | None) -> Response:
        self.audit.record_target(action, code, request, actor, target_type="crab")
        return Response(success=False, message=FAILURE_MESSAGES[code], code=code)

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
