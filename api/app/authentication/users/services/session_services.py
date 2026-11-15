from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Session, select

from app.core import JwtManager, settings
from ..models import (
    SessionRevokedReason,
    Sessions,
    Users,
)


class SessionServices:
    """Refresh-token sessions. Methods only stage changes; the calling service commits."""

    def __init__(self, db: Session, jwt_manager: JwtManager | None = None):
        self.db = db
        self.jwt_manager = jwt_manager or JwtManager()

    def __token_for(self, user: Users, session: Sessions) -> str:
        return self.jwt_manager.create_refresh_token(
            data={"sub": str(user.id), "role": user.role.value},
            session_id=str(session.id),
            expires_at=session.expires_at,
        )

    def __stage(self, user: Users, is_remembered: bool, expires_at: datetime) -> tuple[Sessions, str]:
        session = Sessions(user_id=user.id, is_remembered=is_remembered, expires_at=expires_at)
        self.db.add(session)
        self.db.flush()
        return session, self.__token_for(user, session)

    def create(self, user: Users, is_remembered: bool) -> tuple[Sessions, str]:
        return self.__stage(user, is_remembered, self.jwt_manager.refresh_expiry(is_remembered))

    def rotate(self, user: Users, session: Sessions) -> tuple[Sessions, str]:
        """Replaces the session with a new one that keeps the original expiry, so a PIN never extends it."""
        self.revoke(session, SessionRevokedReason.ROTATED)
        return self.__stage(user, session.is_remembered, session.expires_at)

    def resolve(self, session_id: str | None, user: Users) -> Sessions | None:
        try:
            session = self.db.get(Sessions, UUID(session_id or ""))
        except ValueError:
            return None

        if not session or session.user_id != user.id:
            return None
        if session.revoked_reason == SessionRevokedReason.ROTATED:
            # A rotated token coming back means it was copied: end every session of that user
            self.revoke_all(user.id, SessionRevokedReason.REUSE_DETECTED)
            return None
        return session if session.is_usable else None

    def record_failed_pin(self, session: Sessions) -> int:
        """Counts a wrong PIN and returns the tries left; at zero the session is revoked."""
        session.failed_pin_attempts += 1
        tries_left = max(settings.pin_max_attempts - session.failed_pin_attempts, 0)
        if tries_left == 0:
            self.revoke(session, SessionRevokedReason.PIN_LOCKED)
        self.db.add(session)
        return tries_left

    def revoke(self, session: Sessions, reason: SessionRevokedReason) -> None:
        if session.revoked_at:
            return
        session.revoked_at = datetime.now(timezone.utc)
        session.revoked_reason = reason
        self.db.add(session)

    def revoke_all(self, user_id: UUID, reason: SessionRevokedReason) -> int:
        active = self.db.exec(
            select(Sessions).where(Sessions.user_id == user_id, Sessions.revoked_at.is_(None))
        ).all()
        for session in active:
            self.revoke(session, reason)
        return len(active)
