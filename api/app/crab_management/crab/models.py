from sqlmodel import Field, SQLModel


class Crabs(SQLModel, table=True):
    __tablename__ = "crabs"
    __table_args__ = {"schema": "crab_management"}

    id: int | None = Field(default=None, primary_key=True)
    name: str      = Field(max_length=50, unique=True)
    group_by: str  = Field(max_length=10)
