from fastapi import (
    APIRouter, 
    Depends
)

from .services import get_batches

router = APIRouter(
    prefix="/crab",
    tags=["Crab Management"],
)

@router.get("/batch")
async def get_batch():
    batchs = get_batches()
    return {"batches": batchs}