import hashlib
import logging
from typing import Any
from uuid import UUID, uuid4

from fastapi import Request

from ..database import SessionFactory
from .models import AuditEvents
from .schemas import ActorType, Outcome, Severity

logger = logging.getLogger(__name__)


DEFAULT_SEVERITY = {
    Outcome.SUCCESS: Severity.INFO,
    Outcome.FAILURE: Severity.WARNING,
    Outcome.DENIED:  Severity.WARNING,
    Outcome.ERROR:   Severity.ERROR,
}


class AuditService:
    """Writes audit_events rows. Best-effort: a failed write is logged, never raised,
    and each row is committed in its own session so it survives a request rollback."""

    def __init__(self, service: str = "api", session_factory=SessionFactory):
        self.service = service
        self.session_factory = session_factory

    def record(
        self,
        *,
        action: str,
        outcome: Outcome,
        severity: Severity | None = None,
        request: Request | None = None,
        actor: Any = None,
        actor_type: ActorType | None = None,
        actor_email: str | None = None,
        session_token: str | None = None,
        target_type: str | None = None,
        target_id: UUID | None = None,
        target_label: str | None = None,
        http_status: int | None = None,
        reason: str | None = None,
        changes: dict[str, Any] | None = None,
    ) -> AuditEvents | None:
        """`actor` is any object with `id`, `role` and `email` (e.g. Users); pass
        `actor_email` alone when the user is unknown, such as a failed sign-in."""
        try:
            event = AuditEvents(
                actor_id=getattr(actor, "id", None),
                actor_type=(actor_type or self._actor_type(actor)).value,
                actor_role=self._role(actor),
                actor_email=getattr(actor, "email", None) or actor_email,
                session_hash=self._hash(session_token),
                service=self.service,
                action=action,
                target_type=target_type,
                target_id=target_id,
                target_label=target_label,
                outcome=outcome.value,
                severity=(severity or DEFAULT_SEVERITY[outcome]).value,
                http_status=http_status,
                reason=reason,
                changes=changes,
                **self._request_fields(request),
            )

            with self.session_factory() as db:
                db.add(event)
                db.commit()
                db.refresh(event)
            return event

        except Exception:
            logger.exception("Failed to write audit event %s", action)
            return None

    @staticmethod
    def _role(actor: Any) -> str | None:
        role = getattr(actor, "role", None)
        return getattr(role, "value", role)

    @classmethod
    def _actor_type(cls, actor: Any) -> ActorType:
        # Actor type follows the role value (e.g. Role.STAFF -> STAFF); unknown roles fall back to USER
        if actor is None:
            return ActorType.ANONYMOUS
        try:
            return ActorType(cls._role(actor))
        except ValueError:
            return ActorType.USER

    @staticmethod
    def _hash(token: str | None) -> str | None:
        return hashlib.sha256(token.encode()).hexdigest() if token else None

    @staticmethod
    def _request_fields(request: Request | None) -> dict[str, Any]:
        if request is None:
            return {}

        headers = request.headers
        # First hop of X-Forwarded-For is the original client when behind a proxy
        forwarded = headers.get("x-forwarded-for", "").split(",")[0].strip()
        source_ip = forwarded or (request.client.host if request.client else None)

        try:
            request_id = UUID(headers.get("x-correlation-id", ""))
        except ValueError:
            request_id = uuid4()

        return {
            "source_ip": source_ip,
            "user_agent": headers.get("user-agent"),
            "http_method": request.method,
            "http_path": request.url.path,
            "request_id": request_id,
            "version": getattr(request.app, "version", None),
        }
