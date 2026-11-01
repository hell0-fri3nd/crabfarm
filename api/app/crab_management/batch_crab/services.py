from uuid import UUID

from sqlmodel import Session, select

from .models import BatchCrabs
from app.core import PasswordService, JwtManager

class BatchCrabServices:
    def __init__(
        self,
        db: Session,
        password_service: PasswordService,
        jwt_manager: JwtManager
    ):
        self.db = db
        self.password_service = password_service
        self.jwt_manager = jwt_manager

    def get_batches(self):
        return self.db.exec(select(BatchCrabs)).all()

    def create_batch(self, user_id: UUID, email: str):
        try:
            batch = BatchCrabs(user_id=user_id)
            self.db.add(batch)
            self.db.flush()

            return batch

        except Exception:
            self.db.rollback()
            raise
