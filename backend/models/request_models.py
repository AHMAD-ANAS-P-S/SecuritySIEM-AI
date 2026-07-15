from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


class ChatRequest(BaseModel):
    """Request payload for sending a chat message to SentinelAI."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "examples": [
                {
                    "session_id": "sess_8f3a1c2d",
                    "message": "Show me suspicious login attempts from the last 24 hours.",
                }
            ]
        },
    )

    session_id: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Unique identifier for the chat session.",
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User's chat message content.",
    )

    @field_validator("session_id", "message")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace-only.")
        return v


class ReportRequest(BaseModel):
    """Request payload for generating a security report."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "examples": [
                {
                    "session_id": "sess_8f3a1c2d",
                    "report_type": "threat_summary",
                    "start_time": "2025-01-01T00:00:00Z",
                    "end_time": "2025-01-02T00:00:00Z",
                }
            ]
        },
    )

    session_id: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Unique identifier for the chat session.",
    )
    report_type: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Type of report to generate (e.g., 'threat_summary', 'audit_log').",
    )
    start_time: str = Field(
        ...,
        min_length=1,
        description="ISO 8601 formatted start timestamp for the report window.",
    )
    end_time: str = Field(
        ...,
        min_length=1,
        description="ISO 8601 formatted end timestamp for the report window.",
    )

    @field_validator("session_id", "report_type", "start_time", "end_time")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace-only.")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def valid_iso_datetime(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(
                "Must be a valid ISO 8601 datetime string (e.g., '2025-01-01T00:00:00Z')."
            ) from exc
        return v

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v: str, info) -> str:
        start = info.data.get("start_time")
        if start:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
            if end_dt <= start_dt:
                raise ValueError("end_time must be later than start_time.")
        return v


class LoginRequest(BaseModel):
    """Request payload for user authentication."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "examples": [
                {
                    "username": "jane.doe",
                    "password": "S3curePassw0rd!",
                }
            ]
        },
    )

    username: str = Field(
        ...,
        min_length=3,
        max_length=64,
        description="Account username.",
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Account password.",
    )

    @field_validator("username", "password")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace-only.")
        return v