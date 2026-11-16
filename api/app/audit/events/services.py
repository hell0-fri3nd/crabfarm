import logging
from uuid import UUID

from fastapi import Request, status
from sqlmodel import (
    Session,
    col,
    func,
    or_,
    select,
)

from app.core import (
    AuthUser,
    Page,
    Response,
    Role,
)
from app.core.audit import (
    AuditEvents,
    AuditServices,
    Outcome,
)
from .schemas import AuditEventRead, ListAuditEventsQuery

logger = logging.getLogger(__name__)


AUDIT_EVENT_OUTCOMES = {
    "AUDIT_EVENTS_LISTED":       (Outcome.SUCCESS, status.HTTP_200_OK),
    "OTHERS_ACTIVITY_FORBIDDEN": (Outcome.DENIED,  status.HTTP_403_FORBIDDEN),
    "AUDIT_EVENTS_LIST_FAILED":  (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

AUDIT_EVENT_ERRORS = {
    "OTHERS_ACTIVITY_FORBIDDEN": ("actor_id", "Staff can only view their own activity"),
    "AUDIT_EVENTS_LIST_FAILED":  ("server", "Unable to list activity right now"),
}

FAILURE_MESSAGES = {code: message for code, (_, message) in AUDIT_EVENT_ERRORS.items()}

SEARCHED_COLUMNS = (
    AuditEvents.actor_email,
    AuditEvents.action,
    AuditEvents.target_label,
    AuditEvents.http_path,
    AuditEvents.reason,
)


class AuditEventServices:
    def __init__(self, db: Session, audit: AuditServices | None = None):
        self.db = db
        self.audit = audit or AuditServices(outcomes=AUDIT_EVENT_OUTCOMES, errors=AUDIT_EVENT_ERRORS)

    def __fail(self, action: str, code: str, actor: AuthUser, request: Request | None) -> Response:
        self.audit.record_target(action, code, request, actor, target_type="audit_event")
        return Response(success=False, message=FAILURE_MESSAGES[code], code=code)

    @staticmethod
    def __filtered(statement, query: ListAuditEventsQuery, actor_id: UUID | None):
        action = col(AuditEvents.action)
        conditions = []
        if actor_id:
            conditions.append(AuditEvents.actor_id == actor_id)
        if query.actor_role:
            conditions.append(AuditEvents.actor_role == query.actor_role.value)
        if query.action:
            conditions.append(action.in_(query.action))
        if query.resource:
            conditions.append(or_(*(action.startswith(f"{resource}.") for resource in query.resource)))
        if query.outcome:
            conditions.append(col(AuditEvents.outcome).in_([outcome.value for outcome in query.outcome]))
        if query.severity:
            conditions.append(col(AuditEvents.severity).in_([severity.value for severity in query.severity]))
        if query.target_type:
            conditions.append(AuditEvents.target_type == query.target_type)
        if query.from_:
            conditions.append(col(AuditEvents.occurred_at) >= query.from_)
        if query.to:
            conditions.append(col(AuditEvents.occurred_at) < query.to)
        if query.q:
            conditions.append(or_(*(col(column).icontains(query.q, autoescape=True) for column in SEARCHED_COLUMNS)))
        return statement.where(*conditions)

    @staticmethod
    def __ordering(sort: str):
        column = col(getattr(AuditEvents, sort.removeprefix("-")))
        return column.desc() if sort.startswith("-") else column.asc()

    @staticmethod
    def __scoped_actor_id(query: ListAuditEventsQuery, actor: AuthUser) -> tuple[UUID | None, str | None]:
        """The actor_id to filter by, or a failure code when STAFF asks for someone else."""
        if query.mine:
            return actor.id, None
        if actor.role is not Role.STAFF:
            return query.actor_id, None
        if query.actor_id not in (None, actor.id):
            return None, "OTHERS_ACTIVITY_FORBIDDEN"
        return actor.id, None

    def list(
        self,
        query: ListAuditEventsQuery,
        actor: AuthUser,
        request: Request | None = None,
    ) -> Response[Page[AuditEventRead]]:
        action = "audit.list"
        actor_id, failure = self.__scoped_actor_id(query, actor)
        if failure:
            return self.__fail(action, failure, actor, request)

        try:
            total = self.db.exec(
                self.__filtered(select(func.count()).select_from(AuditEvents), query, actor_id)
            ).one()
            events = self.db.exec(
                self.__filtered(select(AuditEvents), query, actor_id)
                .order_by(self.__ordering(query.sort), col(AuditEvents.occurred_at).desc())
                .offset(query.offset)
                .limit(query.size)
            ).all()

            self.audit.record_target(action, "AUDIT_EVENTS_LISTED", request, actor, target_type="audit_event")
            return Response(
                success=True,
                message="Activity retrieved",
                code="AUDIT_EVENTS_LISTED",
                details=Page(
                    items=[AuditEventRead.model_validate(event) for event in events],
                    total=total,
                    page=query.page,
                    size=query.size,
                ),
            )

        except Exception:
            logger.exception("Audit event listing failed")
            return self.__fail(action, "AUDIT_EVENTS_LIST_FAILED", actor, request)
