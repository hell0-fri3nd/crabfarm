from sqlalchemy import (
    Column, 
    Integer, 
    TIMESTAMP, 
    func
)
from app.core import Base

class BatchCrabs(Base):
    __tablename__ = "batch_crabs"

    id         = Column(Integer, primary_key=True, index=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    user_id    = Column(Integer, nullable=False, index=True)
