"""
config.py
---------
Central configuration loader for the SecuritySIEM-AI backend.

Every module in the project should import settings from here instead of
calling `os.environ` directly. This guarantees a single source of truth,
type-validated values, and fail-fast behaviour if a required variable is
missing at startup.

Owner: Ahmad Anas (Team Lead / AI-ML)
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import List, Optional

from pydantic import AnyUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("securitysiem.config")


class Settings(BaseSettings):
    """
    Strongly-typed application settings, populated from environment
    variables / a `.env` file. See `.env.example` for the full list of
    variables every teammate needs to set locally.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ---- Core service metadata -------------------------------------------------
    APP_NAME: str = "SecuritySIEM-AI"
    APP_ENV: str = Field(default="development")  # development | staging | production
    LOG_LEVEL: str = Field(default="INFO")

    # ---- Security ---------------------------------------------------------------
    SECRET_KEY: str = Field(..., description="Used for JWT signing / session security")
    ALLOWED_ORIGINS: List[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    # ---- AI / LLM (owned by Ahmad) ----------------------------------------------
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    LLM_PROVIDER: str = Field(default="openai")  # openai | llama
    LLM_MODEL: str = Field(default="gpt-4o-mini")
    LLM_TEMPERATURE: float = Field(default=0.0)
    LLM_REQUEST_TIMEOUT: int = Field(default=20)
    INTENT_CONFIDENCE_THRESHOLD: float = Field(default=0.7)

    # ---- Data stores --------------------------------------------------------------
    REDIS_URL: AnyUrl = Field(default="redis://localhost:6379/0")
    ELASTICSEARCH_URL: AnyUrl = Field(default="http://localhost:9200")
    WAZUH_URL: Optional[AnyUrl] = Field(default=None)

    # ---- Query generation defaults (owned by Ahmad) --------------------------------
    DEFAULT_QUERY_SIZE: int = Field(default=100)
    MAX_QUERY_SIZE: int = Field(default=1000)
    DEFAULT_TIME_RANGE: str = Field(default="past_24_hours")

    @field_validator("LOG_LEVEL")
    @classmethod
    def _validate_log_level(cls, v: str) -> str:
        valid = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        v_upper = v.upper()
        if v_upper not in valid:
            raise ValueError(f"LOG_LEVEL must be one of {valid}, got {v}")
        return v_upper

    @field_validator("INTENT_CONFIDENCE_THRESHOLD")
    @classmethod
    def _validate_threshold(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("INTENT_CONFIDENCE_THRESHOLD must be between 0 and 1")
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return a cached singleton `Settings` instance.

    Using `lru_cache` means the environment is parsed once per process,
    and every module gets the exact same validated object:

        from backend.config import get_settings
        settings = get_settings()
    """
    settings = Settings()
    logging.basicConfig(level=settings.LOG_LEVEL)
    logger.info("Loaded settings for env=%s app=%s", settings.APP_ENV, settings.APP_NAME)
    return settings


if __name__ == "__main__":
    # Quick sanity check: `python -m backend.config`
    s = get_settings()
    print(s.model_dump(exclude={"OPENAI_API_KEY", "SECRET_KEY"}))