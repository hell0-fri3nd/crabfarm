
from collections.abc import Generator

from sqlalchemy import MetaData
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, Session, create_engine
from .config import settings


# Must be set before any table model is defined so constraints pick it up
SQLModel.metadata = MetaData(naming_convention={
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
})


class Base(SQLModel):
    pass


engine = create_engine(
    settings.database_uri,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionFactory = sessionmaker(
    bind=engine,
    class_=Session,
    autoflush=False,
    expire_on_commit=False,
)

def get_db() -> Generator[Session, None, None]:
    with SessionFactory() as db:
        yield db
