from typing import Optional
from uuid import UUID

from sqlmodel import Field, SQLModel


class CrabResponse(SQLModel):
    id: int
    name: str
    group_by: str


class BatchResponse(SQLModel):
    id: int
    user_id: UUID
    description: str


class CrabLogCreate(SQLModel):
    crab_id: int
    type: str
    width: float = Field(gt=0)
    weight: float = Field(gt=0)
    batch_id: Optional[int] = None


class CrabLogResponse(SQLModel):
    log_id: int
    crab_id: int
    type: str
    width: float
    weight: float
    created_at: str
    crab_name: str
    group_by: str
    batch_id: Optional[int] = None
    batch_description: Optional[str] = None
