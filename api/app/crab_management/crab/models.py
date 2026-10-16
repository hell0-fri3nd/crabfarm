from sqlalchemy import (
    Column, 
    Integer, 
    String, 
    TIMESTAMP, 
    Numeric,
    Enum, 
    Index, 
    func
)
from app.core import Base


class Crabs(Base):
    __tablename__ = "crabs"

    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String(50), unique=True, nullable=False)
    group_by = Column(String(10), nullable=False)
    
    


