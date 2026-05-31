from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    storage_dir: str = str(Path(__file__).resolve().parent.parent / "storage")
    storage_max_age_hours: int = 24
    playwright_headless: bool = True
    playwright_browser: str = "chromium"
    viewport_width: int = 1280
    viewport_height: int = 720
    navigation_timeout_ms: int = 30000
    cleanup_interval_minutes: int = 60
    max_comparison_runtime_sec: int = 120
    max_concurrent_browsers: int = 2
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]
    rate_limit_per_minute: int = 10
    allowed_domains: list[str] = []

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
