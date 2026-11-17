import hashlib
import logging
from typing import Any
from uuid import UUID, uuid4

from fastapi import Request

from ..database import SessionFactory
from ..security.rate_limit import client_ip
from .models import AuditEvents
from .schemas import (
    ActorType,
    Outcome,
    Severity,
)

logger = logging.getLogger(__name__)


DEFAULT_SEVERITY = {
    Outcome.SUCCESS: Severity.INFO,
    Outcome.FAILURE: Severity.WARNING,
    Outcome.DENIED:  Severity.WARNING,
    Outcome.ERROR:   Severity.ERROR,
}

type CodeOutcomes = dict[str, tuple[Outcome, int]]
type CodeErrors = dict[str, tuple[str, str]]


class AuditServices:
    """The one audit writer for every module. Resources with events of their own subclass it
    in `services/audit_services.py`; the rest use it directly with their code maps.

    Best-effort: a failed write is logged, never raised, and each row is committed in its
    own session so it survives a request rollback."""

    def __init__(
        self,
        outcomes: CodeOutcomes | None = None,
        errors: CodeErrors | None = None,
        service: str = "api",
        session_factory=SessionFactory,
    ):
        self.outcomes = outcomes or {}
        self.errors = errors or {}
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
            event = AuditEvents.model_validate(
                {
                    "actor_id": getattr(actor, "id", None),
                    "actor_type": (actor_type or self.__actor_type(actor)).value,
                    "actor_role": self.__role(actor),
                    "actor_email": getattr(actor, "email", None) or actor_email,
                    "session_hash": self.__hash(session_token),
                    "service": self.service,
                    "action": action,
                    "target_type": target_type,
                    "target_id": target_id,
                    "target_label": target_label,
                    "outcome": outcome.value,
                    "severity": (severity or DEFAULT_SEVERITY[outcome]).value,
                    "http_status": http_status,
                    "reason": reason,
                    "changes": changes,
                    **self.__request_fields(request),
                }
            )

            with self.session_factory() as db:
                db.add(event)
                db.commit()
                db.refresh(event)
            return event

        except Exception:
            logger.exception("Failed to write audit event %s", action)
            return None

    def record_code(
        self,
        action: str,
        code: str,
        *,
        changes: dict[str, Any] | None = None,
        **fields: Any,
    ) -> AuditEvents | None:
        """Records a service result code: outcome and HTTP status come from `outcomes`,
        and a failure code with an entry in `errors` becomes the client-facing `changes`."""
        outcome, http_status = self.outcomes[code]
        return self.record(
            action=action,
            outcome=outcome,
            http_status=http_status,
            reason=None if outcome is Outcome.SUCCESS else code,
            changes=changes or self.errors_for(code),
            **fields,
        )

    def record_target(
        self,
        action: str,
        code: str,
        request: Request | None,
        actor: Any,
        target_type: str,
        target: Any = None,
        target_label: str | None = None,
        changes: dict[str, Any] | None = None,
    ) -> AuditEvents | None:
        """Records a code against a resource row, e.g. `batch.create` on a Batches row."""
        target_id = getattr(target, "id", None)
        # crab_management still has serial ids (04 §6 #6) and target_id is a uuid column
        if target_id is not None and not isinstance(target_id, UUID):
            target_label, target_id = target_label or str(target_id), None

        return self.record_code(
            action,
            code,
            request=request,
            actor=actor,
            session_token=getattr(request.state, "access_token", None) if request else None,
            target_type=target_type if target else None,
            target_id=target_id,
            target_label=target_label,
            changes=changes,
        )

    def error_for(self, code: str) -> tuple[str, str]:
        return self.errors[code]

    def errors_for(self, code: str) -> dict | None:
        if code not in self.errors:
            return None
        field, message = self.errors[code]
        return self.build_errors((field, message, code.lower()))

    @staticmethod
    def build_errors(*errors: tuple[str, str, str]) -> dict:
        """`changes` payload in the same shape as 422 rows: {"errors": [{field, message, type}]}."""
        return {"errors": [{"field": f, "message": m, "type": t} for f, m, t in errors]}

    @staticmethod
    def __role(actor: Any) -> str | None:
        role = getattr(actor, "role", None)
        return getattr(role, "value", role)

    @classmethod
    def __actor_type(cls, actor: Any) -> ActorType:
        # Actor type follows the role value (e.g. Role.STAFF -> STAFF); unknown roles fall back to the generic USER actor type
        if actor is None:
            return ActorType.ANONYMOUS
        try:
            return ActorType(cls.__role(actor))
        except ValueError:
            return ActorType.USER

    @staticmethod
    def __hash(token: str | None) -> str | None:
        return hashlib.sha256(token.encode()).hexdigest() if token else None

    @staticmethod
    def __request_fields(request: Request | None) -> dict[str, Any]:
        if request is None:
            return {}

        headers = request.headers
        source_ip = client_ip(request)

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
