
from pydantic_settings import BaseSettings, SettingsConfigDict

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
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
settings = Settings()