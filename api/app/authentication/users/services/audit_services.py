from fastapi import Request, status

from app.core.audit import AuditService as CoreAuditServices, Outcome
from ..models import Users

# result code -> (audit outcome, HTTP status the router sends for it)
SIGN_IN_OUTCOMES = {
    "LOGIN_SUCCESS":      (Outcome.SUCCESS, status.HTTP_200_OK),
    "EMAIL_NOT_FOUND":    (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "INCORRECT_PASSWORD": (Outcome.FAILURE, status.HTTP_401_UNAUTHORIZED),
    "USER_INACTIVE":      (Outcome.DENIED,  status.HTTP_403_FORBIDDEN),
    "SIGN_IN_FAILED":     (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

PIN_OUTCOMES = {
    "PIN_VERIFIED":            (Outcome.SUCCESS, status.HTTP_200_OK),
    "INVALID_PIN":             (Outcome.FAILURE, status.HTTP_401_UNAUTHORIZED),
    "PIN_VERIFICATION_FAILED": (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

SIGN_OUT_OUTCOMES = {
    "SIGNED_OUT": (Outcome.SUCCESS, status.HTTP_200_OK),
}

CHANGE_PIN_OUTCOMES = {
    "PIN_CHANGED":        (Outcome.SUCCESS, status.HTTP_200_OK),
    "INCORRECT_CURRENT_PIN": (Outcome.FAILURE, status.HTTP_400_BAD_REQUEST),
    "SAME_PIN":           (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "CHANGE_PIN_FAILED":  (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

CHANGE_PASSWORD_OUTCOMES = {
    "PASSWORD_CHANGED":        (Outcome.SUCCESS, status.HTTP_200_OK),
    "INCORRECT_CURRENT_PASSWORD": (Outcome.FAILURE, status.HTTP_400_BAD_REQUEST),
    "SAME_PASSWORD":           (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "CHANGE_PASSWORD_FAILED":  (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}

USER_OUTCOMES = {
    "USER_CREATED":              (Outcome.SUCCESS, status.HTTP_201_CREATED),
    "USERS_LISTED":              (Outcome.SUCCESS, status.HTTP_200_OK),
    "USER_FOUND":                (Outcome.SUCCESS, status.HTTP_200_OK),
    "USER_UPDATED":              (Outcome.SUCCESS, status.HTTP_200_OK),
    "USER_DEACTIVATED":          (Outcome.SUCCESS, status.HTTP_200_OK),
    "USER_REACTIVATED":          (Outcome.SUCCESS, status.HTTP_200_OK),
    "CREDENTIALS_RESET":            (Outcome.SUCCESS, status.HTTP_200_OK),
    "USER_NOT_FOUND":            (Outcome.FAILURE, status.HTTP_404_NOT_FOUND),
    "EMAIL_ALREADY_EXISTS":      (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "CANNOT_DEACTIVATE_SELF":    (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "CANNOT_RESET_OWN_CREDENTIALS": (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "ADMIN_ROLE_REQUIRED":       (Outcome.DENIED,  status.HTTP_403_FORBIDDEN),
    "USER_CREATE_FAILED":        (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "USERS_LIST_FAILED":         (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "USER_GET_FAILED":           (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "USER_UPDATE_FAILED":        (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "USER_DEACTIVATE_FAILED":    (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "USER_REACTIVATE_FAILED":    (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
    "CREDENTIALS_RESET_FAILED":     (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}
ONBOARDING_OUTCOMES = {
    "ONBOARDED":            (Outcome.SUCCESS, status.HTTP_200_OK),
    "ALREADY_ONBOARDED":    (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "DEFAULT_PASSWORD":     (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "DEFAULT_PIN":          (Outcome.FAILURE, status.HTTP_409_CONFLICT),
    "ONBOARDING_FAILED":    (Outcome.ERROR,   status.HTTP_500_INTERNAL_SERVER_ERROR),
}


# failure code -> (field, message) as the client sees it; "server" marks errors not tied to an input
ERRORS = {
    "EMAIL_NOT_FOUND":         ("email",    "Email not found"),
    "INCORRECT_PASSWORD":      ("password", "Incorrect password"),
    "INCORRECT_CURRENT_PASSWORD": ("current_password", "Incorrect current password"),
    "INCORRECT_CURRENT_PIN": ("current_pin", "Incorrect current pin"),
    "SIGN_IN_FAILED":          ("server",   "Unable to sign in right now"),
    "INVALID_PIN":             ("pin",      "Invalid pin"),
    "PIN_VERIFICATION_FAILED": ("server",   "Unable to verify pin right now"),
    "SAME_PASSWORD":           ("new_password", "New password must be different from current password"),
    "CHANGE_PASSWORD_FAILED":  ("server",   "Unable to change password right now"),
    "ALREADY_ONBOARDED":       ("server",   "This account is already set up"),
    "DEFAULT_PASSWORD":        ("new_password", "Pick a password other than the one you were given"),
    "DEFAULT_PIN":             ("new_pin",  "Pick a pin other than the one you were given"),
    "ONBOARDING_FAILED":       ("server",   "Unable to finish setting up your account right now"),
    "USER_INACTIVE":           ("email",    "This account is deactivated"),
    "USER_NOT_FOUND":          ("path.user_id", "User not found"),
    "EMAIL_ALREADY_EXISTS":    ("email",    "Email already exists"),
    "CANNOT_DEACTIVATE_SELF":  ("path.user_id", "You cannot deactivate your own account"),
    "CANNOT_RESET_OWN_CREDENTIALS": ("path.user_id", "Use change-password and change-pin for your own account"),
    "ADMIN_ROLE_REQUIRED":     ("role",     "Only an admin can manage admin accounts"),
}


class AuditServices:
    """Every audit event the auth module writes, in one place."""

    def __init__(self, audit: CoreAuditServices | None = None):
        self.audit = audit or CoreAuditServices()

    @staticmethod
    def __errors(*errors: tuple[str, str, str]) -> dict:
        """changes payload in the same shape as 422 rows: {"errors": [{field, message, type}]}."""
        return {"errors": [{"field": f, "message": m, "type": t} for f, m, t in errors]}

    @classmethod
    def __code_errors(cls, code: str) -> dict | None:
        if code not in ERRORS:
            return None
        field, message = ERRORS[code]
        return cls.__errors((field, message, code.lower()))

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
            changes=self.__code_errors(code),
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
            session_token=access_token,
            http_status=http_status,
            reason=None if outcome == Outcome.SUCCESS else code,
            changes=changes or self.__code_errors(code),
        )

    def sign_out(self, request: Request | None, code: str, user: Users) -> None:
        outcome, http_status = SIGN_OUT_OUTCOMES[code]
        self.audit.record(
            action="auth.sign_out",
            outcome=outcome,
            request=request,
            actor=user,
            http_status=http_status,
        )

    def change_password(
        self,
        request: Request | None,
        code: str,
        user: Users | None = None,
        access_token: str | None = None,
    ) -> None:
        outcome, http_status = CHANGE_PASSWORD_OUTCOMES[code]
        self.audit.record(
            action="auth.change_password",
            outcome=outcome,
            request=request,
            actor=user,
            session_token=access_token,
            http_status=http_status,
            reason=None if outcome == Outcome.SUCCESS else code,
            changes=self.__code_errors(code),
        )

    def onboarding(
        self,
        request: Request | None,
        code: str,
        user: Users,
        access_token: str | None = None,
    ) -> None:
        outcome, http_status = ONBOARDING_OUTCOMES[code]
        self.audit.record(
            action="auth.onboarding",
            outcome=outcome,
            request=request,
            actor=user,
            session_token=access_token,
            http_status=http_status,
            reason=None if outcome == Outcome.SUCCESS else code,
            changes=self.__code_errors(code),
        )

    @staticmethod
    def error_for(code: str) -> tuple[str, str]:
        return ERRORS[code]

    def change_pin(
        self,
        request: Request | None,
        code: str,
        user: Users | None = None,
        access_token: str | None = None,
    ) -> None:
        outcome, http_status = CHANGE_PIN_OUTCOMES[code]
        self.audit.record(
            action="auth.change_pin",
            outcome=outcome,
            request=request,
            actor=user,
            session_token=access_token,
            http_status=http_status,
            reason=None if outcome == Outcome.SUCCESS else code,
            changes=self.__code_errors(code),
        )

    def user(
        self,
        action: str,
        request: Request | None,
        code: str,
        actor: Users,
        target: Users | None = None,
        changes: dict | None = None,
    ) -> None:
        outcome, http_status = USER_OUTCOMES[code]
        self.audit.record(
            action=action,
            outcome=outcome,
            request=request,
            actor=actor,
            session_token=getattr(request.state, "access_token", None) if request else None,
            target_type="user" if target else None,
            target_id=target.id if target else None,
            target_label=target.email if target else None,
            http_status=http_status,
            reason=None if outcome == Outcome.SUCCESS else code,
            changes=changes or self.__code_errors(code),
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
            changes=self.__errors(("authorization", message, reason.lower())),
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
            changes=self.__errors(*[
                ("permission", f"Missing permission: {p}", "permission_denied") for p in missing
            ]),
        )
