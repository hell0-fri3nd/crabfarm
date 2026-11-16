from fastapi import (
    FastAPI,
    HTTPException,
    Request,
    status,
)
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .audit import (
    AuditServices,
    Outcome,
    Severity,
)
from .schemas import Response


audit = AuditServices()

# Routes name their audit action with openapi_extra={AUDIT_ACTION_KEY: "auth.sign_in"}
AUDIT_ACTION_KEY = "x-audit-action"
DEFAULT_VALIDATION_ACTION = "request.validation_failed"


def __audit_action(request: Request) -> str:
    route = request.scope.get("route")
    extra = getattr(route, "openapi_extra", None) or {}
    return extra.get(AUDIT_ACTION_KEY, DEFAULT_VALIDATION_ACTION)


class FieldError(BaseModel):
    field: str
    message: str
    type: str


class ValidationErrorResponse(BaseModel):
    detail: str
    errors: list[FieldError]


class FieldException(Exception):

    def __init__(
        self,
        status_code: int,
        field: str,
        message: str,
        type: str,
        detail: str = "Authentication failed",
        action: str | None = None,
    ):
        self.status_code = status_code
        self.detail = detail
        self.error = FieldError(field=field, message=message, type=type)
        self.action = action


class RaiseFor:
    """Raises the HTTP error a failed service result maps to (02 §6), read from the service's own maps:
    the status from `outcomes`, the field from `errors`. Routers call it instead of matching codes.
    A code with no input to blame (a 5xx, the field "server", or no error entry) answers a plain detail."""

    def __init__(self, outcomes: dict[str, tuple[Outcome, int]], errors: dict[str, tuple[str, str]]):
        self.outcomes = outcomes
        self.errors = errors

    def __call__(self, result: Response, action: str) -> None:
        if result:
            return None

        _, http_status = self.outcomes.get(result.code, (Outcome.ERROR, status.HTTP_500_INTERNAL_SERVER_ERROR))
        field, _ = self.errors.get(result.code, ("server", None))
        if http_status >= status.HTTP_500_INTERNAL_SERVER_ERROR or field == "server":
            raise HTTPException(http_status, detail=result.message)

        raise FieldException(http_status, field, result.message, result.code.lower(), detail=result.message, action=action)


def __field_name(loc: tuple) -> str:
    parts = [str(p) for p in loc[1:]] if len(loc) > 1 else [str(p) for p in loc]
    return ".".join(parts) or "body"


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [
        FieldError(
            field="body" if err["type"] == "json_invalid" else __field_name(err["loc"]),
            message=err["msg"].removeprefix("Value error, "),
            type=err["type"],
        )
        for err in exc.errors()
    ]

    # Set by TokenAuth when the route's token was valid, so a 422 still names the user;
    # access_token is only set for access tokens (session_hash never hashes a refresh token)
    audit.record(
        action=__audit_action(request),
        outcome=Outcome.FAILURE,
        severity=Severity.INFO,
        request=request,
        actor=getattr(request.state, "user", None),
        session_token=getattr(request.state, "access_token", None),
        http_status=status.HTTP_422_UNPROCESSABLE_CONTENT,
        reason=f"VALIDATION_FAILED: {', '.join(sorted({e.field for e in errors}))}",
        changes={"errors": [e.model_dump() for e in errors]},
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=jsonable_encoder(
            ValidationErrorResponse(detail="Validation failed", errors=errors)
        ),
    )


async def field_exception_handler(request: Request, exc: FieldException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(
            ValidationErrorResponse(detail=exc.detail, errors=[exc.error])
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(FieldException, field_exception_handler)
