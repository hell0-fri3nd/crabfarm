from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core import PasswordService, JwtManager
from .models import Crab

class CrabServices:
    def __init__(
        self, 
        db: Session, 
        password_service: PasswordService,
        jwt_manager: JwtManager
    ):
        self.db = db
        self.password_service = password_service
        self.jwt_manager = jwt_manager
        
    def get_crabs(self, crab_group: str | None = None):
        query = select(Crab)

        if crab_group is not None:
            query = query.where(Crab.group_by == crab_group)

        return self.db.execute(query).scalars().all()
    
