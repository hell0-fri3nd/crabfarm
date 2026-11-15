import jwt
from datetime import (
    datetime,
    timedelta,
    timezone,
)

from ..config import Settings, settings


class JwtManager:
    def __init__(self, config: Settings = settings):
        self.secret_key = config.jwt_secret_key
        self.algorithm = config.jwt_algorithm
        self.access_token_expire_minutes = config.jwt_access_token_expire_minutes
        self.refresh_token_expire_days = config.jwt_refresh_token_expire_days
        self.refresh_token_remember_me_days = config.jwt_refresh_token_remember_me_days

    def create_access_token(self, data: dict) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        return self.__encode({**data, "type": "access", "exp": expire})

    def refresh_expiry(self, remember_me: bool = False) -> datetime:
        days = self.refresh_token_remember_me_days if remember_me else self.refresh_token_expire_days
        return datetime.now(timezone.utc) + timedelta(days=days)

    def create_refresh_token(self, data: dict, session_id: str, expires_at: datetime) -> str:
        return self.__encode({**data, "type": "refresh", "jti": session_id, "exp": expires_at})

    def decode_token(self, token: str) -> dict:
        return jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

    def __encode(self, payload: dict) -> str:
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
