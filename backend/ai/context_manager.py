"""Enterprise Redis-backed Conversation Context Manager.

This module implements :class:`ContextManager`, an async, Redis-backed
conversation memory store for a SIEM AI assistant. It persists conversation
history, extracted entities, active filters, intent classification, and
investigation/report state per session, with automatic TTL-based expiration,
retry logic, and structured serialization via Pydantic models.

Typical usage example:

    manager = ContextManager(redis_url="redis://localhost:6379/0")
    session_id = await manager.create_session(user_id="analyst_1")
    await manager.update_context(session_id, intent="investigate_ip")
    context = await manager.get_context(session_id)
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

try:
    from redis import asyncio as redis_asyncio
    from redis.exceptions import ConnectionError as RedisConnectionError
    from redis.exceptions import RedisError, TimeoutError as RedisTimeoutError
except ImportError as exc:  # pragma: no cover - dependency guard
    raise ImportError(
        "The 'redis' package with asyncio support is required. Install it with `pip install redis>=4.2`."
    ) from exc

logger = logging.getLogger(__name__)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(
        logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")
    )
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

class ContextManagerConstants:
    """Centralized configuration constants for :class:`ContextManager`.

    Attributes:
        SESSION_TTL_SECONDS: Time-to-live for a conversation session, in
            seconds (default 30 minutes).
        KEY_PREFIX: Redis key namespace prefix for all session keys.
        MAX_HISTORY_MESSAGES: Maximum number of turns retained in the
            in-memory conversation history before older ones are trimmed.
        MAX_RETRIES: Maximum number of retry attempts for Redis operations.
        RETRY_BACKOFF_BASE_SECONDS: Base delay for exponential backoff
            between retries.
        SCAN_BATCH_SIZE: Batch size used when scanning keys for expired
            session cleanup.
    """

    SESSION_TTL_SECONDS: int = 30 * 60
    KEY_PREFIX: str = "siem:session:"
    MAX_HISTORY_MESSAGES: int = 200
    MAX_RETRIES: int = 3
    RETRY_BACKOFF_BASE_SECONDS: float = 0.25
    SCAN_BATCH_SIZE: int = 100


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ContextManagerError(Exception):
    """Base exception for all :class:`ContextManager` related errors."""


class SessionNotFoundError(ContextManagerError):
    """Raised when a requested session does not exist or has expired."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        super().__init__(f"Session not found or expired: '{session_id}'")


class ContextSerializationError(ContextManagerError):
    """Raised when serialization or deserialization of context data fails."""


class RedisOperationError(ContextManagerError):
    """Raised when a Redis operation fails after exhausting all retries."""


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class MessageRole(str, Enum):
    """Role of a participant in a conversation turn."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class InvestigationState(str, Enum):
    """Lifecycle state of an active security investigation."""

    NONE = "none"
    STARTED = "started"
    GATHERING_EVIDENCE = "gathering_evidence"
    ANALYZING = "analyzing"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    COMPLETED = "completed"


class ReportState(str, Enum):
    """Lifecycle state of an in-progress report generation workflow."""

    NONE = "none"
    REQUESTED = "requested"
    DATA_COLLECTED = "data_collected"
    DRAFTING = "drafting"
    READY = "ready"
    DELIVERED = "delivered"


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class ConversationTurn(BaseModel):
    """A single message exchanged within a conversation.

    Attributes:
        role: The :class:`MessageRole` of the message author.
        content: The textual content of the message.
        timestamp: ISO-8601 UTC timestamp of when the message occurred.
    """

    role: MessageRole
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TimeRange(BaseModel):
    """A bounded or open-ended time window used to scope SIEM queries.

    Attributes:
        start: ISO-8601 start timestamp, or ``None`` for unbounded.
        end: ISO-8601 end timestamp, or ``None`` for unbounded (now).
    """

    start: Optional[str] = None
    end: Optional[str] = None


class SelectedEntities(BaseModel):
    """Currently focused security entities within the conversation.

    Attributes:
        ip: The currently selected/investigated IP address, if any.
        user: The currently selected/investigated user account, if any.
        host: The currently selected/investigated host name, if any.
    """

    ip: Optional[str] = None
    user: Optional[str] = None
    host: Optional[str] = None


class ConversationContext(BaseModel):
    """The complete persisted state for a single conversation session.

    Attributes:
        session_id: Unique identifier for the session.
        user_id: Identifier of the human analyst owning the session.
        history: Ordered list of :class:`ConversationTurn` records.
        filters: Arbitrary active query filters (e.g. severity, source).
        entities: Extracted named entities detected across the conversation.
        intent: The most recently classified user intent.
        selected: The currently focused :class:`SelectedEntities`.
        time_range: The active :class:`TimeRange` scope for queries.
        report_state: The current :class:`ReportState`.
        investigation_state: The current :class:`InvestigationState`.
        created_at: ISO-8601 UTC creation timestamp.
        updated_at: ISO-8601 UTC timestamp of the last update.
    """

    model_config = ConfigDict(validate_assignment=True)

    session_id: str
    user_id: Optional[str] = None
    history: List[ConversationTurn] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    entities: Dict[str, List[str]] = Field(default_factory=dict)
    intent: Optional[str] = None
    selected: SelectedEntities = Field(default_factory=SelectedEntities)
    time_range: Optional[TimeRange] = None
    report_state: ReportState = ReportState.NONE
    investigation_state: InvestigationState = InvestigationState.NONE
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ContextUpdate(BaseModel):
    """Partial update payload applied to an existing context.

    All fields are optional; only provided fields overwrite the existing
    context. Use :class:`ContextManager.merge_context` for deep merges of
    dictionary-valued fields such as ``filters`` and ``entities``.

    Attributes:
        filters: Filters to overwrite or merge.
        entities: Entities to overwrite or merge.
        intent: New intent classification.
        selected: New selected-entity focus.
        time_range: New active time range.
        report_state: New report workflow state.
        investigation_state: New investigation workflow state.
    """

    filters: Optional[Dict[str, Any]] = None
    entities: Optional[Dict[str, List[str]]] = None
    intent: Optional[str] = None
    selected: Optional[SelectedEntities] = None
    time_range: Optional[TimeRange] = None
    report_state: Optional[ReportState] = None
    investigation_state: Optional[InvestigationState] = None


class ConversationSummary(BaseModel):
    """A condensed summary of a conversation session.

    Attributes:
        session_id: The session identifier being summarized.
        turn_count: Total number of conversation turns.
        last_intent: The most recent user intent, if known.
        active_entities: Currently focused entities.
        summary_text: A brief natural-language summary of recent activity.
    """

    session_id: str
    turn_count: int
    last_intent: Optional[str]
    active_entities: SelectedEntities
    summary_text: str


# ---------------------------------------------------------------------------
# ContextManager
# ---------------------------------------------------------------------------

class ContextManager:
    """Enterprise async Redis-backed conversation memory manager.

    Handles session lifecycle, context persistence, merging, summarization,
    and automatic TTL-based expiration for a SIEM AI assistant. All Redis
    operations are retried with exponential backoff to tolerate transient
    network or broker failures.

    Attributes:
        redis_url: Connection URL used to reach the Redis broker.
        ttl_seconds: Time-to-live applied to every session key.
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379/0",
        ttl_seconds: int = ContextManagerConstants.SESSION_TTL_SECONDS,
        max_retries: int = ContextManagerConstants.MAX_RETRIES,
        redis_client: Optional["redis_asyncio.Redis"] = None,
    ) -> None:
        """Initializes the context manager and its Redis connection pool.

        Args:
            redis_url: The Redis connection URL.
            ttl_seconds: Session time-to-live, in seconds.
            max_retries: Maximum retry attempts for transient Redis errors.
            redis_client: An optional pre-configured async Redis client,
                primarily used for dependency injection in unit tests.
        """
        self.redis_url = redis_url
        self.ttl_seconds = ttl_seconds
        self.max_retries = max_retries
        self._redis: "redis_asyncio.Redis" = redis_client or redis_asyncio.from_url(
            redis_url, decode_responses=True
        )
        logger.info("ContextManager initialized (ttl=%ds, url=%s)", ttl_seconds, redis_url)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _key(self, session_id: str) -> str:
        """Builds the namespaced Redis key for a given session id."""
        return f"{ContextManagerConstants.KEY_PREFIX}{session_id}"

    async def _with_retry(self, coro_factory, operation_name: str):
        """Executes a Redis coroutine with exponential backoff retries.

        Args:
            coro_factory: A zero-argument callable returning a fresh
                coroutine on each invocation (coroutines cannot be reused).
            operation_name: Human-readable operation name for logging.

        Returns:
            The result of the successful coroutine execution.

        Raises:
            RedisOperationError: If all retry attempts are exhausted.
        """
        last_exc: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                return await coro_factory()
            except (RedisConnectionError, RedisTimeoutError, RedisError) as exc:
                last_exc = exc
                backoff = ContextManagerConstants.RETRY_BACKOFF_BASE_SECONDS * (2 ** (attempt - 1))
                logger.warning(
                    "Redis operation '%s' failed (attempt %d/%d): %s. Retrying in %.2fs",
                    operation_name,
                    attempt,
                    self.max_retries,
                    exc,
                    backoff,
                )
                if attempt < self.max_retries:
                    await asyncio.sleep(backoff)

        logger.error("Redis operation '%s' failed after %d attempts", operation_name, self.max_retries)
        raise RedisOperationError(
            f"Redis operation '{operation_name}' failed after {self.max_retries} attempts: {last_exc}"
        ) from last_exc

    @staticmethod
    def _serialize(context: ConversationContext) -> str:
        """Serializes a :class:`ConversationContext` to a JSON string.

        Raises:
            ContextSerializationError: If serialization fails.
        """
        try:
            return context.model_dump_json()
        except (TypeError, ValueError) as exc:
            raise ContextSerializationError(f"Failed to serialize context: {exc}") from exc

    @staticmethod
    def _deserialize(raw: str) -> ConversationContext:
        """Deserializes a JSON string into a :class:`ConversationContext`.

        Raises:
            ContextSerializationError: If deserialization fails.
        """
        try:
            return ConversationContext.model_validate_json(raw)
        except (TypeError, ValueError) as exc:
            raise ContextSerializationError(f"Failed to deserialize context: {exc}") from exc

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def create_session(self, user_id: Optional[str] = None, session_id: Optional[str] = None) -> str:
        """Creates a new conversation session with a fresh context.

        Args:
            user_id: Optional identifier of the analyst owning the session.
            session_id: Optional explicit session id; a UUID4 is generated
                if omitted.

        Returns:
            The identifier of the newly created session.

        Raises:
            RedisOperationError: If the session could not be persisted.
        """
        session_id = session_id or str(uuid.uuid4())
        context = ConversationContext(session_id=session_id, user_id=user_id)
        await self.save_context(session_id, context)
        logger.info("Session created: %s (user=%s)", session_id, user_id)
        return session_id

    async def save_context(self, session_id: str, context: ConversationContext) -> None:
        """Persists a full context object to Redis with TTL refresh.

        Args:
            session_id: The session identifier.
            context: The :class:`ConversationContext` to persist.

        Raises:
            ContextSerializationError: If serialization fails.
            RedisOperationError: If the Redis write fails after retries.
        """
        context.updated_at = datetime.now(timezone.utc).isoformat()
        if len(context.history) > ContextManagerConstants.MAX_HISTORY_MESSAGES:
            context.history = context.history[-ContextManagerConstants.MAX_HISTORY_MESSAGES:]

        payload = self._serialize(context)
        key = self._key(session_id)

        await self._with_retry(
            lambda: self._redis.set(key, payload, ex=self.ttl_seconds),
            operation_name=f"save_context:{session_id}",
        )
        logger.debug("Context saved for session %s (ttl=%ds)", session_id, self.ttl_seconds)

    async def get_context(self, session_id: str) -> ConversationContext:
        """Retrieves the current context for a session.

        Args:
            session_id: The session identifier.

        Returns:
            The current :class:`ConversationContext`.

        Raises:
            SessionNotFoundError: If the session does not exist or expired.
            RedisOperationError: If the Redis read fails after retries.
        """
        key = self._key(session_id)
        raw = await self._with_retry(
            lambda: self._redis.get(key),
            operation_name=f"get_context:{session_id}",
        )
        if raw is None:
            raise SessionNotFoundError(session_id)
        return self._deserialize(raw)

    async def update_context(self, session_id: str, update: Optional[ContextUpdate] = None, **kwargs: Any) -> ConversationContext:
        """Applies a partial update to an existing session context.

        Any field present in ``update`` (or passed as a keyword argument)
        overwrites the corresponding field in the stored context. The
        session's TTL is refreshed as part of the write.

        Args:
            session_id: The session identifier.
            update: A :class:`ContextUpdate` describing the fields to change.
            **kwargs: Alternative way to specify update fields directly.

        Returns:
            The updated :class:`ConversationContext`.

        Raises:
            SessionNotFoundError: If the session does not exist or expired.
        """
        context = await self.get_context(session_id)
        update_data: Dict[str, Any] = {}
        if update is not None:
            update_data.update(update.model_dump(exclude_none=True))
        update_data.update({k: v for k, v in kwargs.items() if v is not None})

        for field_name, value in update_data.items():
            setattr(context, field_name, value)

        await self.save_context(session_id, context)
        logger.debug("Context updated for session %s: %s", session_id, list(update_data.keys()))
        return context

    async def merge_context(self, session_id: str, update: Optional[ContextUpdate] = None, **kwargs: Any) -> ConversationContext:
        """Deep-merges partial updates into dictionary/list valued fields.

        Unlike :meth:`update_context`, this performs an additive merge for
        ``filters`` (dict union, new keys overwrite) and ``entities`` (list
        union with de-duplication) rather than a full overwrite.

        Args:
            session_id: The session identifier.
            update: A :class:`ContextUpdate` describing the fields to merge.
            **kwargs: Alternative way to specify update fields directly.

        Returns:
            The merged :class:`ConversationContext`.

        Raises:
            SessionNotFoundError: If the session does not exist or expired.
        """
        context = await self.get_context(session_id)
        update_data: Dict[str, Any] = {}
        if update is not None:
            update_data.update(update.model_dump(exclude_none=True))
        update_data.update({k: v for k, v in kwargs.items() if v is not None})

        if "filters" in update_data:
            context.filters = {**context.filters, **update_data.pop("filters")}

        if "entities" in update_data:
            incoming_entities: Dict[str, List[str]] = update_data.pop("entities")
            merged_entities = dict(context.entities)
            for entity_type, values in incoming_entities.items():
                existing = set(merged_entities.get(entity_type, []))
                existing.update(values)
                merged_entities[entity_type] = sorted(existing)
            context.entities = merged_entities

        for field_name, value in update_data.items():
            setattr(context, field_name, value)

        await self.save_context(session_id, context)
        logger.debug("Context merged for session %s", session_id)
        return context

    async def append_message(self, session_id: str, role: MessageRole, content: str) -> ConversationContext:
        """Appends a single conversation turn to the session history.

        Args:
            session_id: The session identifier.
            role: The :class:`MessageRole` of the message author.
            content: The message text content.

        Returns:
            The updated :class:`ConversationContext`.

        Raises:
            SessionNotFoundError: If the session does not exist or expired.
        """
        context = await self.get_context(session_id)
        context.history.append(ConversationTurn(role=role, content=content))
        await self.save_context(session_id, context)
        return context

    async def summarize_context(self, session_id: str, max_recent_turns: int = 5) -> ConversationSummary:
        """Produces a lightweight structural summary of a session.

        This is a deterministic, non-LLM summary intended for quick UI
        display or as a compact prompt-priming artifact; callers wanting a
        natural-language narrative summary should feed the returned
        ``summary_text`` seed data into an LLM summarization step.

        Args:
            session_id: The session identifier.
            max_recent_turns: Number of most recent turns to reference in
                the generated summary text.

        Returns:
            A :class:`ConversationSummary` describing the session state.

        Raises:
            SessionNotFoundError: If the session does not exist or expired.
        """
        context = await self.get_context(session_id)
        recent = context.history[-max_recent_turns:]
        recent_text = "; ".join(f"{turn.role.value}: {turn.content[:80]}" for turn in recent)

        focus_parts = []
        if context.selected.ip:
            focus_parts.append(f"IP={context.selected.ip}")
        if context.selected.user:
            focus_parts.append(f"user={context.selected.user}")
        if context.selected.host:
            focus_parts.append(f"host={context.selected.host}")
        focus_text = ", ".join(focus_parts) if focus_parts else "no active entity focus"

        summary_text = (
            f"Session has {len(context.history)} turns. Current intent: "
            f"{context.intent or 'unknown'}. Focus: {focus_text}. "
            f"Recent activity: {recent_text or 'none'}."
        )

        return ConversationSummary(
            session_id=session_id,
            turn_count=len(context.history),
            last_intent=context.intent,
            active_entities=context.selected,
            summary_text=summary_text,
        )

    async def clear_context(self, session_id: str) -> None:
        """Deletes a session's context entirely from Redis.

        Args:
            session_id: The session identifier to delete.

        Raises:
            RedisOperationError: If the Redis delete fails after retries.
        """
        key = self._key(session_id)
        await self._with_retry(
            lambda: self._redis.delete(key),
            operation_name=f"clear_context:{session_id}",
        )
        logger.info("Session cleared: %s", session_id)

    async def refresh_ttl(self, session_id: str) -> bool:
        """Refreshes the TTL of a session without modifying its content.

        Args:
            session_id: The session identifier.

        Returns:
            ``True`` if the key existed and the TTL was refreshed, ``False``
            otherwise.
        """
        key = self._key(session_id)
        result = await self._with_retry(
            lambda: self._redis.expire(key, self.ttl_seconds),
            operation_name=f"refresh_ttl:{session_id}",
        )
        return bool(result)

    async def delete_expired(self) -> int:
        """Scans and removes any session keys that Redis has not already
        evicted but which are logically stale (defensive cleanup pass).

        Since Redis TTL already evicts keys automatically, this method
        exists primarily to reconcile any keys created without a TTL
        (e.g. due to a prior bug or manual insertion) by applying the
        configured TTL or removing keys with no expiry set.

        Returns:
            The number of keys that were remediated or removed.
        """
        remediated = 0
        cursor = 0
        pattern = f"{ContextManagerConstants.KEY_PREFIX}*"

        while True:
            cursor, keys = await self._with_retry(
                lambda: self._redis.scan(
                    cursor=cursor, match=pattern, count=ContextManagerConstants.SCAN_BATCH_SIZE
                ),
                operation_name="delete_expired:scan",
            )
            for key in keys:
                ttl = await self._with_retry(
                    lambda: self._redis.ttl(key),
                    operation_name=f"delete_expired:ttl:{key}",
                )
                if ttl == -1:  # Key exists but has no expiry set.
                    await self._with_retry(
                        lambda: self._redis.expire(key, self.ttl_seconds),
                        operation_name=f"delete_expired:expire:{key}",
                    )
                    remediated += 1
                    logger.info("Applied missing TTL to stale key: %s", key)

            if cursor == 0:
                break

        return remediated

    async def close(self) -> None:
        """Gracefully closes the underlying Redis connection pool."""
        await self._redis.aclose()
        logger.info("ContextManager Redis connection closed")