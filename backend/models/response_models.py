from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class ChatResponse(BaseModel):
    """Response payload returned after processing a chat message."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "status": "success",
                    "session_id": "sess_8f3a1c2d",
                    "summary": "Detected 3 anomalous login attempts in the last 24 hours.",
                    "table_data": [
                        {"user": "jdoe", "ip": "192.168.1.10", "risk_score": 87},
                        {"user": "asmith", "ip": "10.0.0.5", "risk_score": 92},
                    ],
                    "chart_data": {
                        "type": "bar",
                        "labels": ["jdoe", "asmith"],
                        "values": [87, 92],
                    },
                }
            ]
        }
    )

    status: Literal["success", "error", "processing"] = Field(
        ...,
        description="Outcome status of the chat processing request.",
    )
    session_id: str = Field(
        ...,
        description="Unique identifier for the chat session.",
    )
    summary: str = Field(
        ...,
        description="Natural-language summary of the assistant's response.",
    )
    table_data: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Structured tabular data supporting the summary (e.g., events, records).",
    )
    chart_data: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured chart/visualization data (type, labels, values, etc.).",
    )


class ReportResponse(BaseModel):
    """Response payload returned after generating a report."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "status": "success",
                    "report_id": "rpt_9c4e2b7a",
                    "report_url": "https://sentinelai.example.com/reports/rpt_9c4e2b7a.pdf",
                }
            ]
        }
    )

    status: Literal["success", "error", "processing"] = Field(
        ...,
        description="Outcome status of the report generation request.",
    )
    report_id: str = Field(
        ...,
        description="Unique identifier assigned to the generated report.",
    )
    report_url: str = Field(
        ...,
        description="Downloadable URL for the generated report.",
    )


class HistoryMessage(BaseModel):
    """A single message entry within a chat session's history."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "role": "user",
                    "content": "Show me suspicious login attempts from the last 24 hours.",
                    "timestamp": "2025-01-01T12:00:00Z",
                }
            ]
        }
    )

    role: Literal["user", "assistant", "system"] = Field(
        ...,
        description="Role of the message sender.",
    )
    content: str = Field(
        ...,
        description="Text content of the message.",
    )
    timestamp: str = Field(
        ...,
        description="ISO 8601 timestamp indicating when the message was created.",
    )


class HistoryResponse(BaseModel):
    """Response payload containing the message history for a chat session."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "session_id": "sess_8f3a1c2d",
                    "messages": [
                        {
                            "role": "user",
                            "content": "Show me suspicious login attempts.",
                            "timestamp": "2025-01-01T12:00:00Z",
                        },
                        {
                            "role": "assistant",
                            "content": "Found 3 anomalous login attempts.",
                            "timestamp": "2025-01-01T12:00:02Z",
                        },
                    ],
                }
            ]
        }
    )

    session_id: str = Field(
        ...,
        description="Unique identifier for the chat session.",
    )
    messages: list[HistoryMessage] = Field(
        default_factory=list,
        description="Chronological list of messages exchanged in the session.",
    )


class LoginResponse(BaseModel):
    """Response payload returned after successful authentication."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                }
            ]
        }
    )

    access_token: str = Field(
        ...,
        description="JWT access token issued upon successful authentication.",
    )
    token_type: Literal["bearer"] = Field(
        default="bearer",
        description="Type of the issued token.",
    )