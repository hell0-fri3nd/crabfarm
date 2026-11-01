from sqlmodel import Session, select

from app.core import PasswordService, JwtManager
from .models import Crabs

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
        query = select(Crabs)

        if crab_group is not None:
            query = query.where(Crabs.group_by == crab_group)

        return self.db.exec(query).all()
