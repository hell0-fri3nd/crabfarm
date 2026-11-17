import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import (
    datetime,
    timedelta,
    timezone,
)
from ..config import Settings,settings


class JwtManager:
    def __init__(self, config: Settings = settings):
        self.secret_key = settings.jwt_secret_key
        self.algorithm = settings.jwt_algorithm
        self.access_token_expire_minutes = (
            settings.jwt_access_token_expire_minutes
        )
        self.refresh_token_expire_days = (
            settings.jwt_refresh_token_expire_days
        )
        self.refresh_token_remember_me_days = (
            settings.jwt_refresh_token_remember_me_days
        )

    def create_access_token(self, data: dict) -> str:
        return self.issue_access_token(data)[0]

    def issue_access_token(self, data: dict) -> tuple[str, datetime]:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=self.access_token_expire_minutes
        )

        payload = {
            **data,
            "type": "access",
            "exp": expire,
        }

        return jwt.encode(
            payload,
            self.secret_key,
            algorithm=self.algorithm,
        ), expire

    def create_refresh_token(self, data: dict, remember_me: bool = False) -> str:
        days = (
            self.refresh_token_remember_me_days
            if remember_me
            else self.refresh_token_expire_days
        )
        expire = datetime.now(timezone.utc) + timedelta(days=days)

        payload = {
            **data,
            "type": "refresh",
            "exp": expire,
        }

        return jwt.encode(
            payload,
            self.secret_key,
            algorithm=self.algorithm,
        )

    def issue_scoped_token(self, data: dict, token_type: str, expires_in: timedelta) -> tuple[str, datetime]:
        """A short-lived token for one purpose (e.g. a detection ticket); `type` keeps it out of the access guards."""
        expire = datetime.now(timezone.utc) + expires_in
        payload = {**data, "type": token_type, "exp": expire}
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm), expire

    def decode_token(self, token: str) -> dict:
        return jwt.decode(
            token,
            self.secret_key,
            algorithms=[self.algorithm],
        )


