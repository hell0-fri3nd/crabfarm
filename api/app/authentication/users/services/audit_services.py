from fastapi import Request, status

from app.core.audit import AuditService as CoreAuditServices, Outcome
from ..models import Users

# result code -> (audit outcome, HTTP status the router sends for it)
SIGN_IN_OUTCOMES = {
    "LOGIN_SUCCESS":      (Outcome.SUCCESS, status.HTTP_200_OK),
    "EMAIL_NOT_FOUND":    (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "INCORRECT_PASSWORD": (Outcome.FAILURE, status.HTTP_401_UNAUTHORIZED),
    "SIGN_IN_FAILED":     (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

PIN_OUTCOMES = {
    "PIN_VERIFIED":            (Outcome.SUCCESS, status.HTTP_200_OK),
    "INVALID_PIN":             (Outcome.FAILURE, status.HTTP_401_UNAUTHORIZED),
    "PIN_VERIFICATION_FAILED": (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

# failure code -> (field, message) as the client sees it; "server" marks errors not tied to an input
ERRORS = {
    "EMAIL_NOT_FOUND":         ("email",    "Email not found"),
    "INCORRECT_PASSWORD":      ("password", "Incorrect password"),
    "SIGN_IN_FAILED":          ("server",   "Unable to sign in right now"),
    "INVALID_PIN":             ("pin",      "Invalid pin"),
    "PIN_VERIFICATION_FAILED": ("server",   "Unable to verify pin right now"),
}


def _errors(*errors: tuple[str, str, str]) -> dict:
    """changes payload in the same shape as 422 rows: {"errors": [{field, message, type}]}."""
    return {"errors": [{"field": f, "message": m, "type": t} for f, m, t in errors]}


def _code_errors(code: str) -> dict | None:
    if code not in ERRORS:
        return None
    field, message = ERRORS[code]
    return _errors((field, message, code.lower()))


class AuditServices:
    """Every audit event the auth module writes, in one place."""

    def __init__(self, audit: CoreAuditServices | None = None):
        self.audit = audit or CoreAuditServices()

    def sign_in(
        self,
        request: Request | None,
        code: str,
        email: str,
        user: Users | None = None,
        access_token: str | None = None,
    ) -> None:
        outcome, http_status = SIGN_IN_OUTCOMES[code]
        self.audit.record(
            action="auth.sign_in",
            outcome=outcome,
            request=request,
            actor=user,
            actor_email=email,
            session_token=access_token,
            http_status=http_status,
            reason=None if outcome == Outcome.SUCCESS else code,
            changes=_code_errors(code),
        )

    def pin(
        self,
        request: Request | None,
        code: str,
        user: Users,
        access_token: str | None = None,
        changes: dict | None = None,
    ) -> None:
        outcome, http_status = PIN_OUTCOMES[code]
        self.audit.record(
            action="auth.sign_in.pin",
            outcome=outcome,
            request=request,
            actor=user,
            # The access token the PIN sign-in issued; None on failure, since none was issued
            session_token=access_token,
            http_status=http_status,
            reason=None if outcome == Outcome.SUCCESS else code,
            changes=changes or _code_errors(code),
        )

    def token_rejected(
        self,
        request: Request | None,
        token_type: str,
        reason: str,
        message: str,
        access_token: str | None = None,
    ) -> None:
        self.audit.record(
            action=f"auth.{token_type}_token_rejected",
            outcome=Outcome.FAILURE,
            request=request,
            session_token=access_token,
            http_status=status.HTTP_401_UNAUTHORIZED,
            reason=reason,
            changes=_errors(("authorization", message, reason.lower())),
        )

    def permission_denied(
        self,
        request: Request | None,
        user: Users,
        missing: list[str],
        access_token: str | None = None,
    ) -> None:
        self.audit.record(
            action="auth.permission_denied",
            outcome=Outcome.DENIED,
            request=request,
            actor=user,
            session_token=access_token,
            http_status=status.HTTP_403_FORBIDDEN,
            reason=f"Missing permission(s): {', '.join(missing)}",
            changes=_errors(*[
                ("permission", f"Missing permission: {p}", "permission_denied") for p in missing
            ]),
        )
