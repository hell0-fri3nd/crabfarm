
from pathlib import Path

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
    jwt_token_location: str
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 1
    
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
settings = Settings()