from fastapi import (
    APIRouter, 
    Depends
)

from app.authentication.users import get_current_user
from .services import get_batches

router = APIRouter(
    prefix="/crab",
    tags=["Crab Management"],
    dependencies=[Depends(get_current_user)],
)

@router.get("/batch")
async def get_batch():
    batchs = get_batches()
    return {"batches": batchs}