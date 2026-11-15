from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from .database import get_db


type DbSession = Annotated[Session, Depends(get_db)]


class Provide[T]:
    """Builds a service class with the request's DB session, so routers never construct services."""

    def __init__(self, service_cls: type[T]):
        self.service_cls = service_cls

    def __call__(self, db: DbSession) -> T:
        return self.service_cls(db)
