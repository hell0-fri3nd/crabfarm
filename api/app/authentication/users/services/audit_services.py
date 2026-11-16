from fastapi import Request, status

from app.core import AuthUser
from app.core.audit import AuditServices, Outcome
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
    "DEVELOPER_ROLE_REQUIRED":       (Outcome.DENIED,  status.HTTP_403_FORBIDDEN),
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
    "SAME_PIN":                ("new_pin",  "New pin must be different from current pin"),
    "CHANGE_PIN_FAILED":       ("server",   "Unable to change pin right now"),
    "ALREADY_ONBOARDED":       ("server",   "This account is already set up"),
    "DEFAULT_PASSWORD":        ("new_password", "Pick a password other than the one you were given"),
    "DEFAULT_PIN":             ("new_pin",  "Pick a pin other than the one you were given"),
    "ONBOARDING_FAILED":       ("server",   "Unable to finish setting up your account right now"),
    "USER_INACTIVE":           ("email",    "This account is deactivated"),
    "USER_NOT_FOUND":          ("path.user_id", "User not found"),
    "EMAIL_ALREADY_EXISTS":    ("email",    "Email already exists"),
    "CANNOT_DEACTIVATE_SELF":  ("path.user_id", "You cannot deactivate your own account"),
    "CANNOT_RESET_OWN_CREDENTIALS": ("path.user_id", "Use change-password and change-pin for your own account"),
    "DEVELOPER_ROLE_REQUIRED":     ("role",     "Only a developer can manage developer accounts"),
}

OUTCOMES = (
    SIGN_IN_OUTCOMES
    | PIN_OUTCOMES
    | SIGN_OUT_OUTCOMES
    | CHANGE_PIN_OUTCOMES
    | CHANGE_PASSWORD_OUTCOMES
    | USER_OUTCOMES
    | ONBOARDING_OUTCOMES
)


class AuthAuditServices(AuditServices):
    """The audit events only the auth module writes; recording itself is core's AuditServices."""

    def __init__(self, **kwargs):
        super().__init__(outcomes=OUTCOMES, errors=ERRORS, **kwargs)

    def sign_in(
        self,
        request: Request | None,
        code: str,
        email: str,
        user: Users | None = None,
        access_token: str | None = None,
    ) -> None:
        self.record_code(
            "auth.sign_in",
            code,
            request=request,
            actor=user,
            actor_email=email,
            session_token=access_token,
        )

    def pin(
        self,
        request: Request | None,
        code: str,
        user: Users,
        access_token: str | None = None,
        changes: dict | None = None,
    ) -> None:
        self.record_code(
            "auth.sign_in.pin",
            code,
            request=request,
            actor=user,
            session_token=access_token,
            changes=changes,
        )

    def sign_out(self, request: Request | None, code: str, user: Users) -> None:
        self.record_code("auth.sign_out", code, request=request, actor=user)

    def change_password(
        self,
        request: Request | None,
        code: str,
        user: Users | None = None,
        access_token: str | None = None,
    ) -> None:
        self.record_code("auth.change_password", code, request=request, actor=user, session_token=access_token)

    def change_pin(
        self,
        request: Request | None,
        code: str,
        user: Users | None = None,
        access_token: str | None = None,
    ) -> None:
        self.record_code("auth.change_pin", code, request=request, actor=user, session_token=access_token)

    def onboarding(
        self,
        request: Request | None,
        code: str,
        user: Users,
        access_token: str | None = None,
    ) -> None:
        self.record_code("auth.onboarding", code, request=request, actor=user, session_token=access_token)

    def user(
        self,
        action: str,
        request: Request | None,
        code: str,
        actor: AuthUser,
        target: Users | None = None,
        changes: dict | None = None,
    ) -> None:
        self.record_target(
            action,
            code,
            request,
            actor,
            target_type="user",
            target=target,
            target_label=target.email if target else None,
            changes=changes,
        )
