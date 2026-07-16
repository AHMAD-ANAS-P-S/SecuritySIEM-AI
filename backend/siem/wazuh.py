"""Enterprise Wazuh REST API client for SecuritySIEM AI.

This module provides :class:`WazuhClient`, a production-ready async HTTP
client for the Wazuh Manager REST API. It manages JWT authentication with
automatic token refresh, session reuse, retry-with-backoff, timeout
handling, and response normalization.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class WazuhClientError(Exception):
    """Base exception for all Wazuh client failures."""


class WazuhConnectionError(WazuhClientError):
    """Raised when the client cannot reach the Wazuh Manager API."""


class WazuhAuthenticationError(WazuhClientError):
    """Raised when authentication or token refresh fails."""


class WazuhTimeoutError(WazuhClientError):
    """Raised when a request exceeds the configured timeout."""


class WazuhQueryError(WazuhClientError):
    """Raised when the Wazuh API rejects or fails to process a request."""


class WazuhConfigurationError(WazuhClientError):
    """Raised when required configuration values are missing or invalid."""


@dataclass(frozen=True)
class WazuhSettings:
    """Immutable configuration container for :class:`WazuhClient`.

    Attributes:
        url: Base URL of the Wazuh Manager API (e.g. ``https://host:55000``).
        username: Wazuh API username.
        password: Wazuh API password.
        verify_ssl: Whether TLS certificates should be verified.
        request_timeout: Per-request timeout, in seconds.
        max_retries: Maximum number of retry attempts for transient errors.
        token_refresh_margin: Seconds before expiry to proactively refresh
            the JWT token.
        token_ttl: Assumed lifetime of a Wazuh JWT token, in seconds.
    """

    url: str
    username: str
    password: str
    verify_ssl: bool = True
    request_timeout: float = 30.0
    max_retries: int = 3
    token_refresh_margin: float = 30.0
    token_ttl: float = 900.0

    @classmethod
    def from_env(cls) -> "WazuhSettings":
        """Builds settings from environment variables.

        Returns:
            WazuhSettings: A populated, validated settings instance.

        Raises:
            WazuhConfigurationError: If required variables are missing.
        """
        url = os.environ.get("WAZUH_URL", "").strip()
        username = os.environ.get("WAZUH_USERNAME", "").strip()
        password = os.environ.get("WAZUH_PASSWORD", "").strip()
        if not url or not username or not password:
            raise WazuhConfigurationError(
                "WAZUH_URL, WAZUH_USERNAME, and WAZUH_PASSWORD environment "
                "variables are required."
            )
        return cls(
            url=url.rstrip("/"),
            username=username,
            password=password,
            verify_ssl=os.environ.get("WAZUH_VERIFY_SSL", "true").lower() != "false",
            request_timeout=float(os.environ.get("WAZUH_TIMEOUT", "30.0")),
            max_retries=int(os.environ.get("WAZUH_MAX_RETRIES", "3")),
            token_refresh_margin=float(
                os.environ.get("WAZUH_TOKEN_REFRESH_MARGIN", "30.0")
            ),
            token_ttl=float(os.environ.get("WAZUH_TOKEN_TTL", "900.0")),
        )


@dataclass
class WazuhResponse:
    """Standardized response envelope returned by all client operations.

    Attributes:
        success: Whether the operation completed successfully.
        total_items: Total number of items reported by the API, if any.
        items: Normalized list of result items.
        raw: The unmodified raw JSON response body.
        error: Human-readable error message when ``success`` is ``False``.
    """

    success: bool
    total_items: Optional[int] = None
    items: List[Dict[str, Any]] = field(default_factory=list)
    raw: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class WazuhClient:
    """Enterprise-grade async Wazuh REST API client.

    Handles JWT authentication, automatic token refresh ahead of expiry,
    persistent session reuse via a pooled ``httpx.AsyncClient``, and
    retry-with-backoff for transient network failures.

    Attributes:
        settings: The resolved :class:`WazuhSettings` used to connect.
    """

    def __init__(self, settings: Optional[WazuhSettings] = None) -> None:
        """Initializes the client without authenticating.

        Args:
            settings: Optional explicit settings. When omitted, settings are
                read from environment variables via
                :meth:`WazuhSettings.from_env`.
        """
        self.settings = settings or WazuhSettings.from_env()
        self._session: Optional[httpx.AsyncClient] = None
        self._token: Optional[str] = None
        self._token_issued_at: float = 0.0
        self._auth_lock = asyncio.Lock()
        logger.debug("WazuhClient initialized with url=%s", self.settings.url)

    def _get_session(self) -> httpx.AsyncClient:
        """Lazily creates and returns the pooled HTTP session.

        Returns:
            httpx.AsyncClient: The active HTTP session.
        """
        if self._session is None:
            self._session = httpx.AsyncClient(
                base_url=self.settings.url,
                verify=self.settings.verify_ssl,
                timeout=self.settings.request_timeout,
                limits=httpx.Limits(max_connections=25, max_keepalive_connections=10),
            )
        return self._session

    def _token_expired(self) -> bool:
        """Checks whether the current JWT token is missing or near expiry.

        Returns:
            bool: ``True`` if a fresh token must be obtained.
        """
        if not self._token:
            return True
        age = time.monotonic() - self._token_issued_at
        return age >= (self.settings.token_ttl - self.settings.token_refresh_margin)

    async def authenticate(self) -> str:
        """Authenticates against the Wazuh API and stores the JWT token.

        Returns:
            str: The newly obtained JWT token.

        Raises:
            WazuhAuthenticationError: If credentials are rejected.
            WazuhConnectionError: If the Wazuh Manager is unreachable.
        """
        async with self._auth_lock:
            session = self._get_session()
            try:
                response = await session.post(
                    "/security/user/authenticate",
                    auth=(self.settings.username, self.settings.password),
                )
            except httpx.TimeoutException as exc:
                raise WazuhTimeoutError(f"Authentication timed out: {exc}") from exc
            except httpx.HTTPError as exc:
                raise WazuhConnectionError(f"Authentication request failed: {exc}") from exc

            if response.status_code == 401:
                raise WazuhAuthenticationError("Invalid Wazuh credentials.")
            if response.status_code >= 400:
                raise WazuhAuthenticationError(
                    f"Authentication failed with status {response.status_code}: "
                    f"{response.text}"
                )

            payload = response.json()
            token = payload.get("data", {}).get("token")
            if not token:
                raise WazuhAuthenticationError(
                    "Authentication response did not contain a token."
                )
            self._token = token
            self._token_issued_at = time.monotonic()
            logger.info("Successfully authenticated with Wazuh Manager.")
            return token

    async def refresh_token(self) -> str:
        """Refreshes the JWT token if it is missing or near expiry.

        Returns:
            str: A valid JWT token, either reused or newly obtained.
        """
        if self._token_expired():
            logger.debug("Wazuh token expired or missing; re-authenticating.")
            return await self.authenticate()
        assert self._token is not None
        return self._token

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
    ) -> WazuhResponse:
        """Executes an authenticated request with retry-with-backoff.

        Args:
            method: HTTP method (``GET``, ``POST``, etc.).
            path: API path relative to the base URL.
            params: Optional query parameters.
            json_body: Optional JSON request body.

        Returns:
            WazuhResponse: Normalized response envelope.
        """
        session = self._get_session()
        last_exc: Optional[Exception] = None

        for attempt in range(1, self.settings.max_retries + 1):
            try:
                token = await self.refresh_token()
                response = await session.request(
                    method,
                    path,
                    params=params,
                    json=json_body,
                    headers={"Authorization": f"Bearer {token}"},
                )

                if response.status_code == 401:
                    logger.warning("Wazuh token rejected; forcing re-authentication.")
                    self._token = None
                    if attempt < self.settings.max_retries:
                        await asyncio.sleep(min(2 ** attempt * 0.5, 10.0))
                        continue
                    raise WazuhAuthenticationError(
                        "Authentication rejected after token refresh."
                    )

                if response.status_code >= 500:
                    raise WazuhConnectionError(
                        f"Wazuh server error {response.status_code}: {response.text}"
                    )
                if response.status_code >= 400:
                    raise WazuhQueryError(
                        f"Wazuh request rejected ({response.status_code}): "
                        f"{response.text}"
                    )

                payload = response.json()
                data_section = payload.get("data", {})
                affected_items = data_section.get("affected_items")
                if affected_items is not None:
                    return WazuhResponse(
                        success=True,
                        total_items=data_section.get("total_affected_items"),
                        items=affected_items,
                        raw=payload,
                    )
                return WazuhResponse(success=True, items=[data_section], raw=payload)

            except httpx.TimeoutException as exc:
                last_exc = exc
                logger.warning(
                    "Wazuh request timed out (attempt %d/%d): %s",
                    attempt,
                    self.settings.max_retries,
                    exc,
                )
            except httpx.HTTPError as exc:
                last_exc = exc
                logger.warning(
                    "Wazuh connection error (attempt %d/%d): %s",
                    attempt,
                    self.settings.max_retries,
                    exc,
                )
            except (WazuhAuthenticationError, WazuhQueryError) as exc:
                logger.error("Wazuh request failed: %s", exc)
                return WazuhResponse(success=False, error=str(exc))

            if attempt < self.settings.max_retries:
                await asyncio.sleep(min(2 ** attempt * 0.5, 10.0))

        if isinstance(last_exc, httpx.TimeoutException):
            error = f"Request to {path} timed out after {self.settings.max_retries} attempts."
            logger.error(error)
            return WazuhResponse(success=False, error=error)

        error = f"Request to {path} failed after {self.settings.max_retries} attempts: {last_exc}"
        logger.error(error)
        return WazuhResponse(success=False, error=error)

    async def health_check(self) -> WazuhResponse:
        """Checks Wazuh Manager availability and API responsiveness.

        Returns:
            WazuhResponse: Normalized response with manager status info.
        """
        return await self._request("GET", "/manager/status")

    async def get_alerts(
        self,
        limit: int = 100,
        offset: int = 0,
        query: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> WazuhResponse:
        """Retrieves security alerts from Wazuh.

        Args:
            limit: Maximum number of alerts to return.
            offset: Pagination offset.
            query: Optional additional filter parameters.
            sort: Optional sort expression (e.g. ``-timestamp``).

        Returns:
            WazuhResponse: Normalized list of alert items.
        """
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if sort:
            params["sort"] = sort
        if query:
            params.update(query)
        return await self._request("GET", "/alerts", params=params)

    async def get_agents(
        self,
        limit: int = 100,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> WazuhResponse:
        """Retrieves the list of registered Wazuh agents.

        Args:
            limit: Maximum number of agents to return.
            offset: Pagination offset.
            status: Optional agent status filter (e.g. ``active``).

        Returns:
            WazuhResponse: Normalized list of agent items.
        """
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        return await self._request("GET", "/agents", params=params)

    async def get_vulnerabilities(
        self,
        agent_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        severity: Optional[str] = None,
    ) -> WazuhResponse:
        """Retrieves vulnerability findings for an agent or the fleet.

        Args:
            agent_id: Optional Wazuh agent ID to scope the query.
            limit: Maximum number of results to return.
            offset: Pagination offset.
            severity: Optional severity filter (e.g. ``Critical``).

        Returns:
            WazuhResponse: Normalized list of vulnerability items.
        """
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if severity:
            params["severity"] = severity
        path = (
            f"/vulnerability/{agent_id}" if agent_id else "/vulnerability"
        )
        return await self._request("GET", path, params=params)

    async def get_groups(self, limit: int = 100, offset: int = 0) -> WazuhResponse:
        """Retrieves configured Wazuh agent groups.

        Args:
            limit: Maximum number of groups to return.
            offset: Pagination offset.

        Returns:
            WazuhResponse: Normalized list of group items.
        """
        return await self._request(
            "GET", "/groups", params={"limit": limit, "offset": offset}
        )

    async def get_mitre(
        self, technique_id: Optional[str] = None, limit: int = 100, offset: int = 0
    ) -> WazuhResponse:
        """Retrieves MITRE ATT&CK technique metadata known to Wazuh.

        Args:
            technique_id: Optional specific MITRE technique ID to look up.
            limit: Maximum number of results to return.
            offset: Pagination offset.

        Returns:
            WazuhResponse: Normalized list of MITRE technique items.
        """
        path = "/mitre/techniques"
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if technique_id:
            params["technique_id"] = technique_id
        return await self._request("GET", path, params=params)

    async def query(
        self, path: str, params: Optional[Dict[str, Any]] = None
    ) -> WazuhResponse:
        """Executes an arbitrary read-only GET query against the Wazuh API.

        Args:
            path: API path relative to the base URL, e.g. ``/syscheck/001``.
            params: Optional query parameters.

        Returns:
            WazuhResponse: Normalized response for the requested resource.
        """
        return await self._request("GET", path, params=params)

    async def close(self) -> None:
        """Closes the underlying HTTP session and releases resources."""
        if self._session is not None:
            await self._session.aclose()
            self._session = None
            self._token = None
            logger.info("Wazuh client session closed.")

    async def __aenter__(self) -> "WazuhClient":
        """Enters an async context, ensuring the client is authenticated."""
        await self.authenticate()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Exits an async context, closing the client session."""
        await self.close()