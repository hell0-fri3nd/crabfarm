from typing import Optional
from pydantic import BaseModel, Field


class CrabResponse(BaseModel):
    id: int
    name: str
    group_by: str


class BatchResponse(BaseModel):
    id: int
    user_id: int
    description: str


class CrabLogCreate(BaseModel):
    crab_id: int
    type: str
    width: float = Field(gt=0)
    weight: float = Field(gt=0)
    batch_id: Optional[int] = None


class CrabLogResponse(BaseModel):
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