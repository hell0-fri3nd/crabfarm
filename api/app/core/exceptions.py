from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .audit import AuditService, Outcome, Severity


audit = AuditService()

# Routes name their audit action with openapi_extra={AUDIT_ACTION_KEY: "auth.sign_in"}
AUDIT_ACTION_KEY = "x-audit-action"
DEFAULT_VALIDATION_ACTION = "request.validation_failed"


def _audit_action(request: Request) -> str:
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


def _field_name(loc: tuple) -> str:
    parts = [str(p) for p in loc[1:]] if len(loc) > 1 else [str(p) for p in loc]
    return ".".join(parts) or "body"


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [
        FieldError(
            field="body" if err["type"] == "json_invalid" else _field_name(err["loc"]),
            message=err["msg"].removeprefix("Value error, "),
            type=err["type"],
        )
        for err in exc.errors()
    ]

    # Set by TokenAuth when the route's token was valid, so a 422 still names the user;
    # access_token is only set for access tokens (session_hash never hashes a refresh token)
    audit.record(
        action=_audit_action(request),
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
