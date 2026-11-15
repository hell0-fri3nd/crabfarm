from pydantic import BaseModel


class Response[T](BaseModel):
    success: bool
    message: str
    code: str | None
    details: T | None = None

    def __bool__(self) -> bool:
        return self.success
