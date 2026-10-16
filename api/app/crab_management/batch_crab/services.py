
from sqlalchemy.orm import Session
from sqlalchemy import select

from .models import BatchCrab
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
        return self.db.execute(
            select(BatchCrab)
        ).scalars().all()
 
    def create_batch(self, user_id: int, email: str):
        try:
            batch = BatchCrab(user_id=user_id)
            self.db.add(batch)
            self.db.flush()

            return batch

        except Exception:
            self.db.rollback()
            raise