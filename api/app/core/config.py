
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

    auth_rate_limit: int = Field(default=10, ge=1)
    auth_rate_limit_window_seconds: int = Field(default=60, ge=1)

    # Off until a feature needs the broker (live SSE streams); detection doesn't use it
    rabbitmq_enabled: bool = False
    rabbitmq_host: str = "localhost"
    rabbitmq_port: int = 5672
    rabbitmq_user: str = "guest"
    rabbitmq_password: str = "guest"
    rabbitmq_vhost: str = "/"

    sse_heartbeat_seconds: int = Field(default=15, ge=1)
    sse_client_queue_size: int = Field(default=100, ge=1)

    # Built-in Ultralytics name (downloaded into yolo_weights_dir) or a path to custom weights
    yolo_weights: str = "yolo11s.pt"
    yolo_weights_dir: str = "ml/models"
    yolo_classes: list[str] | None = None
    yolo_image_size: int = Field(default=640, ge=32)
    yolo_confidence: float = Field(default=0.3, gt=0, lt=1)
    yolo_device: str = "cpu"
    yolo_threads: int = Field(default=2, ge=1)

    detection_ticket_seconds: int = Field(default=30, ge=5)
    detection_auth_timeout_seconds: int = Field(default=5, ge=1)
    detection_max_frame_bytes: int = Field(default=600_000, ge=10_000)
    detection_max_sessions: int = Field(default=4, ge=1)
    detection_ticket_rate_limit: int = Field(default=2, ge=1)
    detection_allowed_origins: list[str] = ["http://localhost:3000"]
    # Width in mm: the crab's sticker (its QR is 0.62 of the sticker's width) is the scale when its QR is in view;
    # otherwise the fixed stand and the camera's field of view across its long side
    detection_sticker_mm: float = Field(default=30.0, gt=0, le=500)
    # Lens to the TOP of the measured object (the crab's shell), not the tray: a closer surface reads bigger
    detection_camera_distance_mm: float = Field(default=304.8, gt=0, le=5000)
    # Calibrated on the farm's stand camera: a phone ~164.1 mm long (162.2-166) read 180 mm at 55.7 deg
    # -> 2*atan(tan(27.85)*164.1/180); recalibrate with the "How this width was computed" panel if the camera changes
    detection_camera_fov_deg: float = Field(default=51.4, gt=1, lt=179)
    # Fixed correction added to every width after scaling (negative trims); -5 matched the stand test phone
    detection_width_offset_mm: float = Field(default=-5.0, ge=-100, le=100)

    # Versioned growth checkpoints + current.json (the served one), relative to api/ unless absolute (ADR-0004)
    forecast_model_dir: str = "ml/models/growth"
    forecast_history_days: int = Field(default=7, ge=2)
    forecast_horizon_days: int = Field(default=7, ge=1, le=7)
    forecast_min_logged_days: int = Field(default=7, ge=2)
    forecast_reload_seconds: float = Field(default=60, ge=0)
    forecast_keep_models: int = Field(default=5, ge=1)
    # A lock older than this belongs to a training that died, so the next one may take it over
    forecast_training_timeout_minutes: int = Field(default=30, ge=1)

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