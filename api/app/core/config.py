
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# api/app/core/config.py -> repo root
ROOT_DIR = Path(__file__).resolve().parents[3]

class Settings(BaseSettings):
    
    project_name: str
    api_prefix: str
    secret_key: str
    database_uri: str
    
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 1
    jwt_refresh_token_remember_me_days: int = 7

    # A refresh session is revoked after this many wrong PINs, forcing a password sign-in
    pin_max_attempts: int = Field(default=5, ge=1)
    auth_rate_limit: int = Field(default=10, ge=1)
    auth_rate_limit_window_seconds: int = Field(default=60, ge=1)

    # Given to new and reset users; onboarding forces both to be changed on first sign-in
    default_user_password: str = Field(default="@HelloFriend1234", min_length=8, max_length=128)
    default_user_pin: str = Field(default="1234", pattern=r"^\d{4}$")

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
settings = Settings()