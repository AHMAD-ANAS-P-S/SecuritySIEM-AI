"""Enterprise Elasticsearch client for SecuritySIEM AI.

This module provides :class:`ElasticSIEMClient`, a production-ready,
async-capable wrapper around the official Elasticsearch Python client.
It centralizes connection management, authentication, retry handling,
timeout enforcement, and structured error handling for all Elasticsearch
interactions performed by the SIEM integration layer.
"""

from __future__ import annotations

import asyncio
import logging
import os
import ssl
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

from elasticsearch import AsyncElasticsearch
from elasticsearch.exceptions import (
    ApiError,
    AuthenticationException,
    AuthorizationException,
    ConnectionError as ESConnectionError,
    ConnectionTimeout,
    NotFoundError,
    TransportError,
)

logger = logging.getLogger(__name__)


class ElasticClientError(Exception):
    """Base exception for all Elasticsearch client failures."""


class ElasticConnectionError(ElasticClientError):
    """Raised when the client cannot establish or maintain a connection."""


class ElasticAuthenticationError(ElasticClientError):
    """Raised when authentication with Elasticsearch fails."""


class ElasticTimeoutError(ElasticClientError):
    """Raised when a request exceeds the configured timeout."""


class ElasticQueryError(ElasticClientError):
    """Raised when a query is rejected or fails server-side execution."""


class ElasticConfigurationError(ElasticClientError):
    """Raised when required configuration values are missing or invalid."""


@dataclass(frozen=True)
class ElasticSettings:
    """Immutable configuration container for :class:`ElasticSIEMClient`.

    Attributes:
        url: Elasticsearch cluster URL(s), comma-separated for multiple nodes.
        api_key: Optional API key credential used for authentication.
        username: Optional basic-auth username.
        password: Optional basic-auth password.
        verify_certs: Whether TLS certificates should be verified.
        ca_certs: Optional filesystem path to a CA bundle.
        request_timeout: Per-request timeout, in seconds.
        max_retries: Maximum number of retry attempts for transient errors.
        retry_on_timeout: Whether to retry automatically on timeout.
        pool_maxsize: Maximum size of the underlying HTTP connection pool.
    """

    url: str
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    verify_certs: bool = True
    ca_certs: Optional[str] = None
    request_timeout: float = 30.0
    max_retries: int = 3
    retry_on_timeout: bool = True
    pool_maxsize: int = 25

    @classmethod
    def from_env(cls) -> "ElasticSettings":
        """Builds settings from environment variables.

        Returns:
            ElasticSettings: A populated, validated settings instance.

        Raises:
            ElasticConfigurationError: If ``ELASTICSEARCH_URL`` is missing.
        """
        url = os.environ.get("ELASTICSEARCH_URL", "").strip()
        if not url:
            raise ElasticConfigurationError(
                "ELASTICSEARCH_URL environment variable is required."
            )
        return cls(
            url=url,
            api_key=os.environ.get("ELASTICSEARCH_API_KEY") or None,
            username=os.environ.get("ELASTICSEARCH_USERNAME") or None,
            password=os.environ.get("ELASTICSEARCH_PASSWORD") or None,
            verify_certs=os.environ.get("ELASTICSEARCH_VERIFY_CERTS", "true").lower()
            != "false",
            ca_certs=os.environ.get("ELASTICSEARCH_CA_CERTS") or None,
            request_timeout=float(
                os.environ.get("ELASTICSEARCH_TIMEOUT", "30.0")
            ),
            max_retries=int(os.environ.get("ELASTICSEARCH_MAX_RETRIES", "3")),
            retry_on_timeout=os.environ.get(
                "ELASTICSEARCH_RETRY_ON_TIMEOUT", "true"
            ).lower()
            != "false",
            pool_maxsize=int(os.environ.get("ELASTICSEARCH_POOL_MAXSIZE", "25")),
        )


@dataclass
class ElasticResponse:
    """Standardized response envelope returned by all client operations.

    Attributes:
        success: Whether the operation completed successfully.
        took_ms: Server-reported execution time in milliseconds, if available.
        total_hits: Total number of matching documents, if applicable.
        hits: List of normalized document hits.
        aggregations: Raw aggregation results, if requested.
        raw: The unmodified raw response body from Elasticsearch.
        error: Human-readable error message when ``success`` is ``False``.
    """

    success: bool
    took_ms: Optional[int] = None
    total_hits: Optional[int] = None
    hits: List[Dict[str, Any]] = field(default_factory=list)
    aggregations: Optional[Dict[str, Any]] = None
    raw: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ElasticSIEMClient:
    """Enterprise-grade async Elasticsearch client for SIEM operations.

    The client automatically selects API-key or basic authentication based
    on available environment configuration, manages a pooled async
    connection, and wraps every network call with retry-with-backoff and
    timeout enforcement.

    Attributes:
        settings: The resolved :class:`ElasticSettings` used to connect.
    """

    def __init__(self, settings: Optional[ElasticSettings] = None) -> None:
        """Initializes the client without opening a connection.

        Args:
            settings: Optional explicit settings. When omitted, settings are
                read from environment variables via
                :meth:`ElasticSettings.from_env`.
        """
        self.settings = settings or ElasticSettings.from_env()
        self._client: Optional[AsyncElasticsearch] = None
        self._lock = asyncio.Lock()
        logger.debug("ElasticSIEMClient initialized with url=%s", self.settings.url)

    def _build_auth_kwargs(self) -> Dict[str, Any]:
        """Determines authentication kwargs based on available credentials.

        Returns:
            Dict[str, Any]: Keyword arguments to merge into the client
            constructor, selecting API-key auth over basic auth when both
            are present.

        Raises:
            ElasticConfigurationError: If no valid credentials are provided.
        """
        if self.settings.api_key:
            return {"api_key": self.settings.api_key}
        if self.settings.username and self.settings.password:
            return {"basic_auth": (self.settings.username, self.settings.password)}
        raise ElasticConfigurationError(
            "No valid Elasticsearch credentials found. Provide "
            "ELASTICSEARCH_API_KEY or both ELASTICSEARCH_USERNAME and "
            "ELASTICSEARCH_PASSWORD."
        )

    async def connect(self) -> None:
        """Establishes the underlying Elasticsearch connection pool.

        This method is idempotent; calling it multiple times reuses the
        existing client instance.

        Raises:
            ElasticConnectionError: If the client cannot be constructed or
                the cluster is unreachable.
            ElasticAuthenticationError: If authentication fails during the
                initial handshake.
        """
        async with self._lock:
            if self._client is not None:
                return
            try:
                auth_kwargs = self._build_auth_kwargs()
                ssl_context: Optional[ssl.SSLContext] = None
                if self.settings.ca_certs:
                    ssl_context = ssl.create_default_context(
                        cafile=self.settings.ca_certs
                    )

                self._client = AsyncElasticsearch(
                    self.settings.url.split(","),
                    verify_certs=self.settings.verify_certs,
                    ssl_context=ssl_context,
                    request_timeout=self.settings.request_timeout,
                    max_retries=self.settings.max_retries,
                    retry_on_timeout=self.settings.retry_on_timeout,
                    connections_per_node=self.settings.pool_maxsize,
                    **auth_kwargs,
                )
                logger.info(
                    "Connected to Elasticsearch cluster at %s", self.settings.url
                )
            except AuthenticationException as exc:
                logger.error("Elasticsearch authentication failed: %s", exc)
                raise ElasticAuthenticationError(str(exc)) from exc
            except Exception as exc:  # noqa: BLE001 - normalized below
                logger.error("Failed to connect to Elasticsearch: %s", exc)
                raise ElasticConnectionError(str(exc)) from exc

    async def _ensure_connected(self) -> AsyncElasticsearch:
        """Guarantees a connected client instance, connecting if necessary.

        Returns:
            AsyncElasticsearch: The active client instance.
        """
        if self._client is None:
            await self.connect()
        assert self._client is not None
        return self._client

    async def _with_retry(self, operation_name: str, coro_factory, retries: int = 3):
        """Executes an async operation with exponential backoff retry.

        Args:
            operation_name: Human-readable operation name used for logging.
            coro_factory: A zero-argument callable returning a fresh
                coroutine on each invocation (required since coroutines
                cannot be reused across retry attempts).
            retries: Maximum number of attempts before failing.

        Returns:
            Any: The result of the successful coroutine execution.

        Raises:
            ElasticTimeoutError: If every attempt times out.
            ElasticAuthenticationError: If authentication/authorization fails.
            ElasticQueryError: If the server rejects the query.
            ElasticConnectionError: If a connection-level failure persists.
        """
        last_exc: Optional[Exception] = None
        for attempt in range(1, retries + 1):
            try:
                return await asyncio.wait_for(
                    coro_factory(), timeout=self.settings.request_timeout
                )
            except asyncio.TimeoutError as exc:
                last_exc = exc
                logger.warning(
                    "%s timed out (attempt %d/%d)", operation_name, attempt, retries
                )
            except (AuthenticationException, AuthorizationException) as exc:
                logger.error("%s authentication/authorization error: %s", operation_name, exc)
                raise ElasticAuthenticationError(str(exc)) from exc
            except NotFoundError as exc:
                logger.error("%s target not found: %s", operation_name, exc)
                raise ElasticQueryError(str(exc)) from exc
            except ApiError as exc:
                logger.error("%s API error: %s", operation_name, exc)
                raise ElasticQueryError(str(exc)) from exc
            except (ESConnectionError, ConnectionTimeout, TransportError) as exc:
                last_exc = exc
                logger.warning(
                    "%s connection error (attempt %d/%d): %s",
                    operation_name,
                    attempt,
                    retries,
                    exc,
                )
            except Exception as exc:  # noqa: BLE001 - normalized below
                logger.error("%s unexpected error: %s", operation_name, exc)
                raise ElasticClientError(str(exc)) from exc

            if attempt < retries:
                backoff = min(2 ** attempt * 0.5, 10.0)
                await asyncio.sleep(backoff)

        if isinstance(last_exc, asyncio.TimeoutError):
            raise ElasticTimeoutError(
                f"{operation_name} timed out after {retries} attempts."
            )
        raise ElasticConnectionError(
            f"{operation_name} failed after {retries} attempts: {last_exc}"
        )

    async def health_check(self) -> ElasticResponse:
        """Checks Elasticsearch cluster health.

        Returns:
            ElasticResponse: Normalized response containing the cluster
            health status in ``raw``.
        """
        client = await self._ensure_connected()
        try:
            result = await self._with_retry(
                "health_check", lambda: client.cluster.health()
            )
            return ElasticResponse(success=True, raw=dict(result))
        except ElasticClientError as exc:
            return ElasticResponse(success=False, error=str(exc))

    async def ping(self) -> bool:
        """Pings the Elasticsearch cluster to verify basic connectivity.

        Returns:
            bool: ``True`` if the cluster responded, ``False`` otherwise.
        """
        client = await self._ensure_connected()
        try:
            return bool(await self._with_retry("ping", lambda: client.ping()))
        except ElasticClientError as exc:
            logger.warning("Ping failed: %s", exc)
            return False

    async def execute_query(
        self,
        index: str,
        query: Dict[str, Any],
        size: int = 100,
        from_: int = 0,
        sort: Optional[List[Dict[str, Any]]] = None,
        source: Optional[Sequence[str]] = None,
    ) -> ElasticResponse:
        """Executes a raw Elasticsearch DSL query.

        Args:
            index: Target index or index pattern.
            query: Elasticsearch Query DSL body (the ``query`` clause).
            size: Maximum number of hits to return.
            from_: Pagination offset.
            sort: Optional sort specification.
            source: Optional list of fields to include via source filtering.

        Returns:
            ElasticResponse: Normalized query results.
        """
        return await self.execute_search(
            index=index,
            body={"query": query},
            size=size,
            from_=from_,
            sort=sort,
            source=source,
        )

    async def execute_search(
        self,
        index: str,
        body: Dict[str, Any],
        size: int = 100,
        from_: int = 0,
        sort: Optional[List[Dict[str, Any]]] = None,
        source: Optional[Sequence[str]] = None,
    ) -> ElasticResponse:
        """Executes a full search request against an index.

        Args:
            index: Target index or index pattern.
            body: Full Elasticsearch search request body.
            size: Maximum number of hits to return.
            from_: Pagination offset.
            sort: Optional sort specification, appended if not already
                present in ``body``.
            source: Optional list of fields to include via source filtering.

        Returns:
            ElasticResponse: Normalized query results including hits,
            total count, and timing information.
        """
        client = await self._ensure_connected()
        request_body = dict(body)
        request_body.setdefault("size", size)
        request_body.setdefault("from", from_)
        if sort:
            request_body["sort"] = sort
        if source is not None:
            request_body["_source"] = list(source)

        try:
            result = await self._with_retry(
                "execute_search",
                lambda: client.search(index=index, body=request_body),
            )
            hits_section = result.get("hits", {})
            total = hits_section.get("total", {})
            total_hits = total.get("value") if isinstance(total, dict) else total
            return ElasticResponse(
                success=True,
                took_ms=result.get("took"),
                total_hits=total_hits,
                hits=[hit.get("_source", {}) for hit in hits_section.get("hits", [])],
                raw=dict(result),
            )
        except ElasticClientError as exc:
            return ElasticResponse(success=False, error=str(exc))

    async def execute_count(
        self, index: str, query: Optional[Dict[str, Any]] = None
    ) -> ElasticResponse:
        """Executes a count query against an index.

        Args:
            index: Target index or index pattern.
            query: Optional Query DSL ``query`` clause. Counts all documents
                when omitted.

        Returns:
            ElasticResponse: Normalized response with ``total_hits`` set to
            the document count.
        """
        client = await self._ensure_connected()
        body = {"query": query} if query else None
        try:
            result = await self._with_retry(
                "execute_count", lambda: client.count(index=index, body=body)
            )
            return ElasticResponse(
                success=True, total_hits=result.get("count"), raw=dict(result)
            )
        except ElasticClientError as exc:
            return ElasticResponse(success=False, error=str(exc))

    async def execute_aggregation(
        self,
        index: str,
        aggregations: Dict[str, Any],
        query: Optional[Dict[str, Any]] = None,
        size: int = 0,
    ) -> ElasticResponse:
        """Executes an aggregation query.

        Args:
            index: Target index or index pattern.
            aggregations: Aggregation DSL body (the ``aggs`` clause).
            query: Optional Query DSL ``query`` clause to filter documents
                before aggregating.
            size: Number of raw hits to also return; defaults to 0.

        Returns:
            ElasticResponse: Normalized response with ``aggregations``
            populated from the server result.
        """
        client = await self._ensure_connected()
        body: Dict[str, Any] = {"aggs": aggregations, "size": size}
        if query:
            body["query"] = query
        try:
            result = await self._with_retry(
                "execute_aggregation",
                lambda: client.search(index=index, body=body),
            )
            return ElasticResponse(
                success=True,
                took_ms=result.get("took"),
                aggregations=result.get("aggregations"),
                raw=dict(result),
            )
        except ElasticClientError as exc:
            return ElasticResponse(success=False, error=str(exc))

    async def bulk_search(
        self, requests: List[Dict[str, Any]]
    ) -> List[ElasticResponse]:
        """Executes multiple search requests using the msearch API.

        Args:
            requests: A list of dictionaries, each containing ``index`` and
                ``body`` keys describing one search request.

        Returns:
            List[ElasticResponse]: One normalized response per request, in
            the same order as the input.
        """
        client = await self._ensure_connected()
        operations: List[Dict[str, Any]] = []
        for req in requests:
            operations.append({"index": req["index"]})
            operations.append(req["body"])

        try:
            result = await self._with_retry(
                "bulk_search", lambda: client.msearch(searches=operations)
            )
            responses: List[ElasticResponse] = []
            for item in result.get("responses", []):
                if "error" in item:
                    responses.append(
                        ElasticResponse(success=False, error=str(item["error"]))
                    )
                    continue
                hits_section = item.get("hits", {})
                total = hits_section.get("total", {})
                total_hits = total.get("value") if isinstance(total, dict) else total
                responses.append(
                    ElasticResponse(
                        success=True,
                        took_ms=item.get("took"),
                        total_hits=total_hits,
                        hits=[
                            hit.get("_source", {})
                            for hit in hits_section.get("hits", [])
                        ],
                        raw=dict(item),
                    )
                )
            return responses
        except ElasticClientError as exc:
            return [ElasticResponse(success=False, error=str(exc)) for _ in requests]

    async def close(self) -> None:
        """Closes the underlying connection pool and releases resources."""
        async with self._lock:
            if self._client is not None:
                await self._client.close()
                self._client = None
                logger.info("Elasticsearch client connection closed.")

    async def __aenter__(self) -> "ElasticSIEMClient":
        """Enters an async context, ensuring the client is connected."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Exits an async context, closing the client connection."""
        await self.close()