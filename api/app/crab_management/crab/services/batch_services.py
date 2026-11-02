from uuid import UUID

from sqlmodel import Session, select

from ..models import Batches
from app.core import JwtManager

class BatchServices:
    def __init__(self, db: Session, jwt_manager: JwtManager):
        self.db = db
        self.jwt_manager = jwt_manager

    def get_batches(self) -> list[Batches]:
        return self.db.exec(select(Batches)).all()

    def create_batch(self, user_id: UUID) -> Batches:
        try:
            batch = Batches(user_id=user_id)
            self.db.add(batch)
            self.db.flush()
            return batch
        except Exception:
            self.db.rollback()
            raise
