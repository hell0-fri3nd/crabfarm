import logging

from fastapi import Request, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import (
    Session,
    func,
    select,
)

from app.core import Page, Response
from app.core.audit import (
    Actor,
    AuditServices,
    Outcome,
)
from .models import Logs
from .schemas import (
    CreateLogRequest,
    ListCrabLogsQuery,
    ListLogsQuery,
)

logger = logging.getLogger(__name__)


LOG_OUTCOMES = {
    "LOGS_LISTED":       (Outcome.SUCCESS, status.HTTP_200_OK),
    "LOG_CREATED":       (Outcome.SUCCESS, status.HTTP_201_CREATED),
    "CRAB_NOT_FOUND":    (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "BATCH_NOT_FOUND":   (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "LOGS_LIST_FAILED":  (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "LOG_CREATE_FAILED": (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

LOG_ERRORS = {
    "CRAB_NOT_FOUND":    ("crab_id", "Crab not found"),
    "BATCH_NOT_FOUND":   ("batch_id", "Batch not found"),
    "LOGS_LIST_FAILED":  ("server", "Unable to list logs right now"),
    "LOG_CREATE_FAILED": ("server", "Unable to create the log right now"),
}

FAILURE_MESSAGES = {code: message for code, (_, message) in LOG_ERRORS.items()}

MISSING_REFERENCE_CODES = {
    "fk_logs_crab_id_crabs": "CRAB_NOT_FOUND",
    "fk_logs_batch_id_batches": "BATCH_NOT_FOUND",
}


class LogServices:
    def __init__(self, db: Session, audit: AuditServices | None = None):
        self.db = db
        self.audit = audit or AuditServices(outcomes=LOG_OUTCOMES, errors=LOG_ERRORS)

    def __fail(self, action: str, code: str, actor: Actor, request: Request | None) -> Response:
        self.audit.record_target(action, code, request, actor, target_type="log")
        return Response(success=False, message=FAILURE_MESSAGES[code], code=code)

    @staticmethod
    def __filtered(statement, query: ListLogsQuery):
        conditions = [
            column == value
            for column, value in (
                (Logs.batch_id, query.batch_id),
                (Logs.crab_id, query.crab_id),
                (Logs.log_type, query.log_type),
            )
            if value is not None
        ]
        if query.from_:
            conditions.append(Logs.created_at >= query.from_)
        if query.to:
            conditions.append(Logs.created_at < query.to)
        return statement.where(*conditions)

    @staticmethod
    def __ordering(sort: str):
        column = getattr(Logs, sort.removeprefix("-"))
        return column.desc() if sort.startswith("-") else column.asc()

    def list(self, query: ListLogsQuery, actor: Actor, request: Request | None = None) -> Response[Page[Logs]]:
        action = "log.list"
        try:
            total = self.db.exec(self.__filtered(select(func.count()).select_from(Logs), query)).one()
            logs = self.db.exec(
                self.__filtered(select(Logs), query)
                .order_by(self.__ordering(query.sort), Logs.id.desc())
                .offset(query.offset)
                .limit(query.size)
            ).all()

            self.audit.record_target(action, "LOGS_LISTED", request, actor, target_type="log")
            return Response(
                success=True,
                message="Logs retrieved",
                code="LOGS_LISTED",
                details=Page(items=list(logs), total=total, page=query.page, size=query.size),
            )

        except Exception:
            logger.exception("Log listing failed")
            return self.__fail(action, "LOGS_LIST_FAILED", actor, request)

    def list_for_crab(
        self,
        crab_id: int,
        query: ListCrabLogsQuery,
        actor: Actor,
        request: Request | None = None,
    ) -> Response[Page[Logs]]:
        return self.list(ListLogsQuery(**query.model_dump(), crab_id=crab_id), actor, request)

    def create(self, payload: CreateLogRequest, actor: Actor, request: Request | None = None) -> Response[Logs]:
        action = "log.create"
        try:
            log = Logs(user_id=actor.id, **payload.model_dump())
            self.db.add(log)
            self.db.commit()
            self.db.refresh(log)

            self.audit.record_target(
                action,
                "LOG_CREATED",
                request,
                actor,
                target_type="log",
                target=log,
                changes={"after": log.model_dump(mode="json")},
            )
            return Response(success=True, message="Log created", code="LOG_CREATED", details=log)

        except IntegrityError as error:
            self.db.rollback()
            if code := MISSING_REFERENCE_CODES.get(getattr(error.orig.diag, "constraint_name", None)):
                return self.__fail(action, code, actor, request)
            logger.exception("Log creation failed")
            return self.__fail(action, "LOG_CREATE_FAILED", actor, request)

        except Exception:
            self.db.rollback()
            logger.exception("Log creation failed")
            return self.__fail(action, "LOG_CREATE_FAILED", actor, request)
