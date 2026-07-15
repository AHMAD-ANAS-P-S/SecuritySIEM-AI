"""Unified SIEM connector for SecuritySIEM AI.

This module provides :class:`SIEMConnector`, the single entry point that
all other application layers must use to communicate with backing SIEM
providers (Elasticsearch, Wazuh). No other module should import
:mod:`backend.siem.elastic` or :mod:`backend.siem.wazuh` directly.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence

from backend.siem.elastic import (
    ElasticClientError,
    ElasticResponse,
    ElasticSIEMClient,
)
from backend.siem.wazuh import WazuhClient, WazuhClientError, WazuhResponse

logger = logging.getLogger(__name__)


class SIEMConnectorError(Exception):
    """Base exception for unified connector failures."""


class UnsupportedProviderError(SIEMConnectorError):
    """Raised when an operation is requested against an unknown provider."""


class ProviderUnavailableError(SIEMConnectorError):
    """Raised when the requested provider client is not configured."""


class SIEMProvider(str, Enum):
    """Enumerates the SIEM backends supported by the connector."""

    ELASTICSEARCH = "elasticsearch"
    WAZUH = "wazuh"


@dataclass
class SIEMResponse:
    """Common response schema returned by every :class:`SIEMConnector` method.

    Attributes:
        success: Whether the operation completed successfully.
        provider: The provider that served the request.
        total: Total number of matching items reported by the provider.
        items: Normalized list of result records.
        aggregations: Raw aggregation results, when applicable.
        error: Human-readable error message when ``success`` is ``False``.
    """

    success: bool
    provider: SIEMProvider
    total: Optional[int] = None
    items: List[Dict[str, Any]] = field(default_factory=list)
    aggregations: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    @classmethod
    def from_elastic(
        cls, provider_response: ElasticResponse
    ) -> "SIEMResponse":
        """Builds a :class:`SIEMResponse` from an Elasticsearch response.

        Args:
            provider_response: The raw :class:`ElasticResponse` to normalize.

        Returns:
            SIEMResponse: The normalized, provider-agnostic response.
        """
        return cls(
            success=provider_response.success,
            provider=SIEMProvider.ELASTICSEARCH,
            total=provider_response.total_hits,
            items=provider_response.hits,
            aggregations=provider_response.aggregations,
            error=provider_response.error,
        )

    @classmethod
    def from_wazuh(cls, provider_response: WazuhResponse) -> "SIEMResponse":
        """Builds a :class:`SIEMResponse` from a Wazuh response.

        Args:
            provider_response: The raw :class:`WazuhResponse` to normalize.

        Returns:
            SIEMResponse: The normalized, provider-agnostic response.
        """
        return cls(
            success=provider_response.success,
            provider=SIEMProvider.WAZUH,
            total=provider_response.total_items,
            items=provider_response.items,
            error=provider_response.error,
        )


class SIEMConnector:
    """Unified interface over all supported SIEM backends.

    The connector owns provider client instances (injected or lazily
    constructed), routes each operation to the currently active provider,
    and normalizes every response into :class:`SIEMResponse`.

    Attributes:
        active_provider: The provider currently used for generic
            ``query``/``search`` style operations.
    """

    def __init__(
        self,
        elastic_client: Optional[ElasticSIEMClient] = None,
        wazuh_client: Optional[WazuhClient] = None,
        default_provider: SIEMProvider = SIEMProvider.ELASTICSEARCH,
    ) -> None:
        """Initializes the connector with injected or lazily-built clients.

        Args:
            elastic_client: Optional pre-configured Elasticsearch client.
                When omitted, one is lazily constructed from environment
                variables on first use.
            wazuh_client: Optional pre-configured Wazuh client. When
                omitted, one is lazily constructed from environment
                variables on first use.
            default_provider: The provider used for generic operations
                until :meth:`switch_provider` is called.
        """
        self._elastic_client = elastic_client
        self._wazuh_client = wazuh_client
        self.active_provider = default_provider
        logger.debug(
            "SIEMConnector initialized with default_provider=%s",
            default_provider.value,
        )

    def _get_elastic(self) -> ElasticSIEMClient:
        """Lazily initializes and returns the Elasticsearch client.

        Returns:
            ElasticSIEMClient: The active Elasticsearch client instance.
        """
        if self._elastic_client is None:
            self._elastic_client = ElasticSIEMClient()
        return self._elastic_client

    def _get_wazuh(self) -> WazuhClient:
        """Lazily initializes and returns the Wazuh client.

        Returns:
            WazuhClient: The active Wazuh client instance.
        """
        if self._wazuh_client is None:
            self._wazuh_client = WazuhClient()
        return self._wazuh_client

    def switch_provider(self, provider: SIEMProvider) -> None:
        """Switches the active provider used for generic operations.

        Args:
            provider: The :class:`SIEMProvider` to activate.

        Raises:
            UnsupportedProviderError: If the provider is not recognized.
        """
        if not isinstance(provider, SIEMProvider):
            raise UnsupportedProviderError(f"Unsupported provider: {provider!r}")
        logger.info(
            "Switching active SIEM provider from %s to %s",
            self.active_provider.value,
            provider.value,
        )
        self.active_provider = provider

    async def query(
        self,
        index_or_path: str,
        query: Dict[str, Any],
        size: int = 100,
        from_: int = 0,
        provider: Optional[SIEMProvider] = None,
    ) -> SIEMResponse:
        """Executes a provider-appropriate query against the active provider.

        Args:
            index_or_path: The Elasticsearch index name, or Wazuh API path
                when routed to Wazuh.
            query: Elasticsearch Query DSL ``query`` clause. Ignored for
                Wazuh, which uses ``query`` as request parameters instead.
            size: Maximum number of results to return.
            from_: Pagination offset.
            provider: Optional provider override for this call only.

        Returns:
            SIEMResponse: The normalized query result.
        """
        target = provider or self.active_provider
        try:
            if target == SIEMProvider.ELASTICSEARCH:
                client = self._get_elastic()
                response = await client.execute_query(
                    index=index_or_path, query=query, size=size, from_=from_
                )
                return SIEMResponse.from_elastic(response)
            if target == SIEMProvider.WAZUH:
                client = self._get_wazuh()
                response = await client.query(
                    path=index_or_path,
                    params={**query, "limit": size, "offset": from_},
                )
                return SIEMResponse.from_wazuh(response)
            raise UnsupportedProviderError(f"Unsupported provider: {target!r}")
        except (ElasticClientError, WazuhClientError) as exc:
            logger.error("query() failed on provider %s: %s", target.value, exc)
            return SIEMResponse(success=False, provider=target, error=str(exc))

    async def search(
        self,
        index: str,
        body: Dict[str, Any],
        size: int = 100,
        from_: int = 0,
        sort: Optional[List[Dict[str, Any]]] = None,
        source: Optional[Sequence[str]] = None,
    ) -> SIEMResponse:
        """Executes a full search request against Elasticsearch.

        Args:
            index: Target Elasticsearch index or index pattern.
            body: Full Elasticsearch search request body.
            size: Maximum number of hits to return.
            from_: Pagination offset.
            sort: Optional sort specification.
            source: Optional list of fields to include via source filtering.

        Returns:
            SIEMResponse: The normalized search result.
        """
        try:
            client = self._get_elastic()
            response = await client.execute_search(
                index=index,
                body=body,
                size=size,
                from_=from_,
                sort=sort,
                source=source,
            )
            return SIEMResponse.from_elastic(response)
        except ElasticClientError as exc:
            logger.error("search() failed: %s", exc)
            return SIEMResponse(
                success=False, provider=SIEMProvider.ELASTICSEARCH, error=str(exc)
            )

    async def aggregation(
        self,
        index: str,
        aggregations: Dict[str, Any],
        query: Optional[Dict[str, Any]] = None,
    ) -> SIEMResponse:
        """Executes an aggregation query against Elasticsearch.

        Args:
            index: Target Elasticsearch index or index pattern.
            aggregations: Aggregation DSL body (the ``aggs`` clause).
            query: Optional Query DSL ``query`` clause to filter documents.

        Returns:
            SIEMResponse: The normalized aggregation result.
        """
        try:
            client = self._get_elastic()
            response = await client.execute_aggregation(
                index=index, aggregations=aggregations, query=query
            )
            return SIEMResponse.from_elastic(response)
        except ElasticClientError as exc:
            logger.error("aggregation() failed: %s", exc)
            return SIEMResponse(
                success=False, provider=SIEMProvider.ELASTICSEARCH, error=str(exc)
            )

    async def count(
        self, index: str, query: Optional[Dict[str, Any]] = None
    ) -> SIEMResponse:
        """Executes a count query against Elasticsearch.

        Args:
            index: Target Elasticsearch index or index pattern.
            query: Optional Query DSL ``query`` clause.

        Returns:
            SIEMResponse: The normalized count result.
        """
        try:
            client = self._get_elastic()
            response = await client.execute_count(index=index, query=query)
            return SIEMResponse.from_elastic(response)
        except ElasticClientError as exc:
            logger.error("count() failed: %s", exc)
            return SIEMResponse(
                success=False, provider=SIEMProvider.ELASTICSEARCH, error=str(exc)
            )

    async def alerts(
        self,
        limit: int = 100,
        offset: int = 0,
        query: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> SIEMResponse:
        """Retrieves security alerts from Wazuh.

        Args:
            limit: Maximum number of alerts to return.
            offset: Pagination offset.
            query: Optional additional filter parameters.
            sort: Optional sort expression.

        Returns:
            SIEMResponse: The normalized alert list.
        """
        try:
            client = self._get_wazuh()
            response = await client.get_alerts(
                limit=limit, offset=offset, query=query, sort=sort
            )
            return SIEMResponse.from_wazuh(response)
        except WazuhClientError as exc:
            logger.error("alerts() failed: %s", exc)
            return SIEMResponse(
                success=False, provider=SIEMProvider.WAZUH, error=str(exc)
            )

    async def vulnerabilities(
        self,
        agent_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        severity: Optional[str] = None,
    ) -> SIEMResponse:
        """Retrieves vulnerability findings from Wazuh.

        Args:
            agent_id: Optional Wazuh agent ID to scope the query.
            limit: Maximum number of results to return.
            offset: Pagination offset.
            severity: Optional severity filter.

        Returns:
            SIEMResponse: The normalized vulnerability list.
        """
        try:
            client = self._get_wazuh()
            response = await client.get_vulnerabilities(
                agent_id=agent_id, limit=limit, offset=offset, severity=severity
            )
            return SIEMResponse.from_wazuh(response)
        except WazuhClientError as exc:
            logger.error("vulnerabilities() failed: %s", exc)
            return SIEMResponse(
                success=False, provider=SIEMProvider.WAZUH, error=str(exc)
            )

    async def health_check(
        self, provider: Optional[SIEMProvider] = None
    ) -> Dict[str, SIEMResponse]:
        """Checks the health of one or all configured SIEM providers.

        Args:
            provider: Optional specific provider to check. When omitted,
                every configured provider is checked.

        Returns:
            Dict[str, SIEMResponse]: A mapping of provider name to its
            normalized health-check result.
        """
        results: Dict[str, SIEMResponse] = {}
        providers = [provider] if provider else list(SIEMProvider)

        for target in providers:
            try:
                if target == SIEMProvider.ELASTICSEARCH:
                    client = self._get_elastic()
                    response = await client.health_check()
                    results[target.value] = SIEMResponse.from_elastic(response)
                elif target == SIEMProvider.WAZUH:
                    client = self._get_wazuh()
                    response = await client.health_check()
                    results[target.value] = SIEMResponse.from_wazuh(response)
            except (ElasticClientError, WazuhClientError) as exc:
                logger.error("health_check() failed for %s: %s", target.value, exc)
                results[target.value] = SIEMResponse(
                    success=False, provider=target, error=str(exc)
                )
        return results

    async def close(self) -> None:
        """Closes all underlying provider client connections."""
        if self._elastic_client is not None:
            await self._elastic_client.close()
        if self._wazuh_client is not None:
            await self._wazuh_client.close()
        logger.info("SIEMConnector closed all provider connections.")

    async def __aenter__(self) -> "SIEMConnector":
        """Enters an async context without eagerly connecting providers."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Exits an async context, closing all provider connections."""
        await self.close()