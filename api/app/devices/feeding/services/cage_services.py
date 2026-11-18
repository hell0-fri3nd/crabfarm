import logging
from uuid import UUID

from fastapi import Request, status
from sqlmodel import (
    Session,
    col,
    func,
    select,
)

from app.core import Page, Response
from app.core.audit import (
    Actor,
    AuditServices,
    Outcome,
)
from ..models import Cages
from ..schemas import ListCagesQuery, UpdateCageRequest

logger = logging.getLogger(__name__)


CAGE_OUTCOMES = {
    "CAGES_LISTED":       (Outcome.SUCCESS, status.HTTP_200_OK),
    "CAGE_UPDATED":       (Outcome.SUCCESS, status.HTTP_200_OK),
    "CAGE_NOT_FOUND":     (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "CAGES_LIST_FAILED":  (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "CAGE_UPDATE_FAILED": (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

CAGE_ERRORS = {
    "CAGE_NOT_FOUND":     ("path.cage_id", "Cage not found"),
    "CAGES_LIST_FAILED":  ("server", "Unable to load the cages right now"),
    "CAGE_UPDATE_FAILED": ("server", "Unable to update the cage right now"),
}

FAILURE_MESSAGES = {code: message for code, (_, message) in CAGE_ERRORS.items()}


class CageServices:
    def __init__(self, db: Session, audit: AuditServices | None = None):
        self.db = db
        self.audit = audit or AuditServices(outcomes=CAGE_OUTCOMES, errors=CAGE_ERRORS)

    def __fail(self, action: str, code: str, actor: Actor, request: Request | None) -> Response:
        self.audit.record_target(action, code, request, actor, target_type="cage")
        return Response(success=False, message=FAILURE_MESSAGES[code], code=code)

    def list(
        self,
        query: ListCagesQuery,
        actor: Actor,
        request: Request | None = None,
    ) -> Response[Page[Cages]]:
        action = "cage.list"
        try:
            total = self.db.exec(select(func.count()).select_from(Cages)).one()
            # Length first, so A2 comes before A10
            cages = self.db.exec(
                select(Cages)
                .order_by(col(Cages.group_code), func.length(Cages.cage_name), col(Cages.cage_name))
                .offset(query.offset)
                .limit(query.size)
            ).all()

            self.audit.record_target(action, "CAGES_LISTED", request, actor, target_type="cage")
            return Response(
                success=True,
                message="Cages retrieved",
                code="CAGES_LISTED",
                details=Page(items=list(cages), total=total, page=query.page, size=query.size),
            )

        except Exception:
            logger.exception("Cage listing failed")
            return self.__fail(action, "CAGES_LIST_FAILED", actor, request)

    def update(
        self,
        cage_id: UUID,
        payload: UpdateCageRequest,
        actor: Actor,
        request: Request | None = None,
    ) -> Response[Cages]:
        action = "cage.update"
        try:
            if not (cage := self.db.get(Cages, cage_id)):
                return self.__fail(action, "CAGE_NOT_FOUND", actor, request)

            was_active = cage.is_active
            cage.is_active = payload.is_active
            self.db.commit()
            self.db.refresh(cage)

            self.audit.record_target(
                action,
                "CAGE_UPDATED",
                request,
                actor,
                target_type="cage",
                target=cage,
                target_label=cage.cage_name,
                changes={"before": {"is_active": was_active}, "after": {"is_active": cage.is_active}},
            )
            message = "Cage added to schedules" if cage.is_active else "Cage removed from schedules"
            return Response(success=True, message=message, code="CAGE_UPDATED", details=cage)

        except Exception:
            self.db.rollback()
            logger.exception("Cage update failed")
            return self.__fail(action, "CAGE_UPDATE_FAILED", actor, request)
