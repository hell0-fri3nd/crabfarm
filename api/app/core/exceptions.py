from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class FieldError(BaseModel):
    field: str
    message: str
    type: str


class ValidationErrorResponse(BaseModel):
    detail: str
    errors: list[FieldError]


class FieldException(Exception):
    """A business-rule error tied to one input field (e.g. wrong password), rendered
    in the same shape as request validation errors."""

    def __init__(
        self,
        status_code: int,
        field: str,
        message: str,
        type: str,
        detail: str = "Authentication failed",
    ):
        self.status_code = status_code
        self.detail = detail
        self.error = FieldError(field=field, message=message, type=type)


def _field_name(loc: tuple) -> str:
    # loc is e.g. ("body", "email") or ("body", "address", 0, "city"); drop the "body"/"query" prefix
    parts = [str(p) for p in loc[1:]] if len(loc) > 1 else [str(p) for p in loc]
    return ".".join(parts) or "body"


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [
        FieldError(
            # json_invalid locs point at a character offset, not a field
            field="body" if err["type"] == "json_invalid" else _field_name(err["loc"]),
            message=err["msg"].removeprefix("Value error, "),
            type=err["type"],
        )
        for err in exc.errors()
    ]

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
