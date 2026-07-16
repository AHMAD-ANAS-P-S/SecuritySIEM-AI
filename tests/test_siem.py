"""Enterprise unit tests for the SIEM integration layer.

Covers backend.siem.elastic, backend.siem.wazuh, backend.siem.connector,
and backend.siem.validator. All external network calls are mocked; no
test requires a live Elasticsearch or Wazuh instance.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.siem.connector import (
    SIEMConnector,
    SIEMProvider,
    SIEMResponse,
    UnsupportedProviderError,
)
from backend.siem.elastic import (
    ElasticAuthenticationError,
    ElasticConfigurationError,
    ElasticResponse,
    ElasticSettings,
    ElasticSIEMClient,
    ElasticTimeoutError,
)
from backend.siem.validator import (
    QueryValidator,
    ValidatorLimits,
)
from backend.siem.wazuh import (
    WazuhAuthenticationError,
    WazuhClient,
    WazuhConfigurationError,
    WazuhResponse,
    WazuhSettings,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def elastic_settings() -> ElasticSettings:
    return ElasticSettings(
        url="https://es.internal:9200",
        api_key="test-api-key",
        request_timeout=5.0,
        max_retries=2,
    )


@pytest.fixture
def wazuh_settings() -> WazuhSettings:
    return WazuhSettings(
        url="https://wazuh.internal:55000",
        username="wazuh-user",
        password="wazuh-pass",
        request_timeout=5.0,
        max_retries=2,
        token_ttl=900.0,
        token_refresh_margin=30.0,
    )


@pytest.fixture
def validator() -> QueryValidator:
    return QueryValidator()


# ---------------------------------------------------------------------------
# ElasticSIEMClient tests
# ---------------------------------------------------------------------------


class TestElasticClient:
    def test_settings_from_env_missing_url_raises(self, monkeypatch):
        monkeypatch.delenv("ELASTICSEARCH_URL", raising=False)
        with pytest.raises(ElasticConfigurationError):
            ElasticSettings.from_env()

    def test_settings_from_env_success(self, monkeypatch):
        monkeypatch.setenv("ELASTICSEARCH_URL", "https://es:9200")
        monkeypatch.setenv("ELASTICSEARCH_API_KEY", "key123")
        settings = ElasticSettings.from_env()
        assert settings.url == "https://es:9200"
        assert settings.api_key == "key123"

    @pytest.mark.asyncio
    async def test_connect_success(self, elastic_settings):
        client = ElasticSIEMClient(settings=elastic_settings)
        with patch("backend.siem.elastic.AsyncElasticsearch") as mock_es:
            mock_es.return_value = MagicMock()
            await client.connect()
            assert client._client is not None
            mock_es.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_missing_credentials_raises(self):
        settings = ElasticSettings(url="https://es:9200")
        client = ElasticSIEMClient(settings=settings)
        with pytest.raises(ElasticConfigurationError):
            await client.connect()

    @pytest.mark.asyncio
    async def test_execute_search_success(self, elastic_settings):
        client = ElasticSIEMClient(settings=elastic_settings)
        mock_es_instance = MagicMock()
        mock_es_instance.search = AsyncMock(
            return_value={
                "took": 12,
                "hits": {
                    "total": {"value": 2},
                    "hits": [
                        {"_source": {"user": "jsmith"}},
                        {"_source": {"user": "amartin"}},
                    ],
                },
            }
        )
        client._client = mock_es_instance
        result = await client.execute_search(
            index="logs-*", body={"query": {"match_all": {}}}
        )
        assert result.success is True
        assert result.total_hits == 2
        assert len(result.hits) == 2
        assert result.took_ms == 12

    @pytest.mark.asyncio
    async def test_execute_count_success(self, elastic_settings):
        client = ElasticSIEMClient(settings=elastic_settings)
        mock_es_instance = MagicMock()
        mock_es_instance.count = AsyncMock(return_value={"count": 42})
        client._client = mock_es_instance
        result = await client.execute_count(index="logs-*")
        assert result.success is True
        assert result.total_hits == 42

    @pytest.mark.asyncio
    async def test_execute_aggregation_success(self, elastic_settings):
        client = ElasticSIEMClient(settings=elastic_settings)
        mock_es_instance = MagicMock()
        mock_es_instance.search = AsyncMock(
            return_value={
                "took": 5,
                "aggregations": {"by_severity": {"buckets": []}},
            }
        )
        client._client = mock_es_instance
        result = await client.execute_aggregation(
            index="logs-*", aggregations={"by_severity": {"terms": {"field": "severity"}}}
        )
        assert result.success is True
        assert "by_severity" in result.aggregations

    @pytest.mark.asyncio
    async def test_execute_search_retries_on_timeout_then_fails(self, elastic_settings):
        client = ElasticSIEMClient(settings=elastic_settings)
        mock_es_instance = MagicMock()

        async def _slow(*args, **kwargs):
            await asyncio.sleep(10)

        mock_es_instance.search = _slow
        client._client = mock_es_instance
        client.settings = ElasticSettings(
            url=elastic_settings.url,
            api_key=elastic_settings.api_key,
            request_timeout=0.01,
            max_retries=2,
        )
        result = await client.execute_search(
            index="logs-*", body={"query": {"match_all": {}}}
        )
        assert result.success is False
        assert result.error is not None

    @pytest.mark.asyncio
    async def test_health_check_authentication_error(self, elastic_settings):
        client = ElasticSIEMClient(settings=elastic_settings)
        mock_es_instance = MagicMock()

        async def _raise_auth(*args, **kwargs):
            raise ElasticAuthenticationError("bad creds")

        client._client = mock_es_instance
        with patch.object(
            client, "_with_retry", side_effect=ElasticAuthenticationError("bad creds")
        ):
            result = await client.health_check()
        assert result.success is False

    @pytest.mark.asyncio
    async def test_close_releases_client(self, elastic_settings):
        client = ElasticSIEMClient(settings=elastic_settings)
        mock_es_instance = MagicMock()
        mock_es_instance.close = AsyncMock()
        client._client = mock_es_instance
        await client.close()
        assert client._client is None
        mock_es_instance.close.assert_awaited_once()


# ---------------------------------------------------------------------------
# WazuhClient tests
# ---------------------------------------------------------------------------


class TestWazuhClient:
    def test_settings_from_env_missing_raises(self, monkeypatch):
        monkeypatch.delenv("WAZUH_URL", raising=False)
        monkeypatch.delenv("WAZUH_USERNAME", raising=False)
        monkeypatch.delenv("WAZUH_PASSWORD", raising=False)
        with pytest.raises(WazuhConfigurationError):
            WazuhSettings.from_env()

    @pytest.mark.asyncio
    async def test_authenticate_success(self, wazuh_settings):
        client = WazuhClient(settings=wazuh_settings)
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": {"token": "jwt-token-abc"}}

        with patch.object(
            client, "_get_session"
        ) as mock_get_session:
            mock_session = MagicMock()
            mock_session.post = AsyncMock(return_value=mock_response)
            mock_get_session.return_value = mock_session
            token = await client.authenticate()
            assert token == "jwt-token-abc"
            assert client._token == "jwt-token-abc"

    @pytest.mark.asyncio
    async def test_authenticate_invalid_credentials(self, wazuh_settings):
        client = WazuhClient(settings=wazuh_settings)
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        with patch.object(client, "_get_session") as mock_get_session:
            mock_session = MagicMock()
            mock_session.post = AsyncMock(return_value=mock_response)
            mock_get_session.return_value = mock_session
            with pytest.raises(WazuhAuthenticationError):
                await client.authenticate()

    @pytest.mark.asyncio
    async def test_token_refresh_reuses_valid_token(self, wazuh_settings):
        client = WazuhClient(settings=wazuh_settings)
        client._token = "existing-token"
        import time

        client._token_issued_at = time.monotonic()
        token = await client.refresh_token()
        assert token == "existing-token"

    @pytest.mark.asyncio
    async def test_token_refresh_reauthenticates_when_expired(self, wazuh_settings):
        client = WazuhClient(settings=wazuh_settings)
        client._token = "old-token"
        client._token_issued_at = 0.0  # far in the past -> expired
        with patch.object(
            client, "authenticate", new=AsyncMock(return_value="new-token")
        ) as mock_auth:
            token = await client.refresh_token()
            assert token == "new-token"
            mock_auth.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_get_alerts_success(self, wazuh_settings):
        client = WazuhClient(settings=wazuh_settings)
        client._token = "token"
        import time

        client._token_issued_at = time.monotonic()

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "affected_items": [{"rule": {"level": 10}}],
                "total_affected_items": 1,
            }
        }

        with patch.object(client, "_get_session") as mock_get_session:
            mock_session = MagicMock()
            mock_session.request = AsyncMock(return_value=mock_response)
            mock_get_session.return_value = mock_session
            result = await client.get_alerts(limit=10)
            assert result.success is True
            assert result.total_items == 1
            assert len(result.items) == 1

    @pytest.mark.asyncio
    async def test_get_vulnerabilities_success(self, wazuh_settings):
        client = WazuhClient(settings=wazuh_settings)
        client._token = "token"
        import time

        client._token_issued_at = time.monotonic()

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {"affected_items": [{"cve": "CVE-2024-0001"}], "total_affected_items": 1}
        }

        with patch.object(client, "_get_session") as mock_get_session:
            mock_session = MagicMock()
            mock_session.request = AsyncMock(return_value=mock_response)
            mock_get_session.return_value = mock_session
            result = await client.get_vulnerabilities(agent_id="001")
            assert result.success is True
            assert result.items[0]["cve"] == "CVE-2024-0001"

    @pytest.mark.asyncio
    async def test_health_check_server_error_returns_failure_response(
        self, wazuh_settings
    ):
        client = WazuhClient(settings=wazuh_settings)
        client._token = "token"
        import time

        client._token_issued_at = time.monotonic()

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        with patch.object(client, "_get_session") as mock_get_session:
            mock_session = MagicMock()
            mock_session.request = AsyncMock(return_value=mock_response)
            mock_get_session.return_value = mock_session
            result = await client.health_check()
            assert result.success is False

    @pytest.mark.asyncio
    async def test_close_clears_session_and_token(self, wazuh_settings):
        client = WazuhClient(settings=wazuh_settings)
        mock_session = MagicMock()
        mock_session.aclose = AsyncMock()
        client._session = mock_session
        client._token = "token"
        await client.close()
        assert client._session is None
        assert client._token is None


# ---------------------------------------------------------------------------
# SIEMConnector tests
# ---------------------------------------------------------------------------


class TestSIEMConnector:
    @pytest.mark.asyncio
    async def test_query_routes_to_elasticsearch(self):
        mock_elastic = MagicMock(spec=ElasticSIEMClient)
        mock_elastic.execute_query = AsyncMock(
            return_value=ElasticResponse(success=True, total_hits=5, hits=[{}] * 5)
        )
        connector = SIEMConnector(elastic_client=mock_elastic)
        result = await connector.query("logs-*", {"match_all": {}})
        assert result.success is True
        assert result.provider == SIEMProvider.ELASTICSEARCH
        assert result.total == 5

    @pytest.mark.asyncio
    async def test_query_routes_to_wazuh(self):
        mock_wazuh = MagicMock(spec=WazuhClient)
        mock_wazuh.query = AsyncMock(
            return_value=WazuhResponse(success=True, total_items=3, items=[{}] * 3)
        )
        connector = SIEMConnector(wazuh_client=mock_wazuh)
        result = await connector.query(
            "/alerts", {}, provider=SIEMProvider.WAZUH
        )
        assert result.success is True
        assert result.provider == SIEMProvider.WAZUH
        assert result.total == 3

    def test_switch_provider_updates_active(self):
        connector = SIEMConnector()
        connector.switch_provider(SIEMProvider.WAZUH)
        assert connector.active_provider == SIEMProvider.WAZUH

    def test_switch_provider_invalid_raises(self):
        connector = SIEMConnector()
        with pytest.raises(UnsupportedProviderError):
            connector.switch_provider("not-a-provider")

    @pytest.mark.asyncio
    async def test_alerts_routes_to_wazuh(self):
        mock_wazuh = MagicMock(spec=WazuhClient)
        mock_wazuh.get_alerts = AsyncMock(
            return_value=WazuhResponse(success=True, total_items=1, items=[{"id": 1}])
        )
        connector = SIEMConnector(wazuh_client=mock_wazuh)
        result = await connector.alerts(limit=10)
        assert result.success is True
        assert result.items[0]["id"] == 1

    @pytest.mark.asyncio
    async def test_vulnerabilities_routes_to_wazuh(self):
        mock_wazuh = MagicMock(spec=WazuhClient)
        mock_wazuh.get_vulnerabilities = AsyncMock(
            return_value=WazuhResponse(success=True, total_items=1, items=[{"cve": "X"}])
        )
        connector = SIEMConnector(wazuh_client=mock_wazuh)
        result = await connector.vulnerabilities(agent_id="001")
        assert result.success is True

    @pytest.mark.asyncio
    async def test_health_check_aggregates_both_providers(self):
        mock_elastic = MagicMock(spec=ElasticSIEMClient)
        mock_elastic.health_check = AsyncMock(
            return_value=ElasticResponse(success=True, raw={"status": "green"})
        )
        mock_wazuh = MagicMock(spec=WazuhClient)
        mock_wazuh.health_check = AsyncMock(
            return_value=WazuhResponse(success=True, items=[{"status": "running"}])
        )
        connector = SIEMConnector(elastic_client=mock_elastic, wazuh_client=mock_wazuh)
        results = await connector.health_check()
        assert results["elasticsearch"].success is True
        assert results["wazuh"].success is True

    @pytest.mark.asyncio
    async def test_search_failure_returns_normalized_error(self):
        mock_elastic = MagicMock(spec=ElasticSIEMClient)
        mock_elastic.execute_search = AsyncMock(
            return_value=ElasticResponse(success=False, error="cluster unreachable")
        )
        connector = SIEMConnector(elastic_client=mock_elastic)
        result = await connector.search("logs-*", {"query": {"match_all": {}}})
        assert result.success is False
        assert result.error == "cluster unreachable"

    @pytest.mark.asyncio
    async def test_close_closes_both_clients(self):
        mock_elastic = MagicMock(spec=ElasticSIEMClient)
        mock_elastic.close = AsyncMock()
        mock_wazuh = MagicMock(spec=WazuhClient)
        mock_wazuh.close = AsyncMock()
        connector = SIEMConnector(elastic_client=mock_elastic, wazuh_client=mock_wazuh)
        await connector.close()
        mock_elastic.close.assert_awaited_once()
        mock_wazuh.close.assert_awaited_once()


# ---------------------------------------------------------------------------
# QueryValidator tests
# ---------------------------------------------------------------------------


class TestQueryValidator:
    def test_valid_simple_query_passes(self, validator):
        query: Dict[str, Any] = {
            "bool": {
                "must": [{"match": {"user": "jsmith"}}],
                "filter": [
                    {"range": {"@timestamp": {"gte": "now-1d", "lte": "now"}}}
                ],
            }
        }
        result = validator.validate_query(query, size=100)
        assert result.valid is True
        assert result.sanitized_query is not None

    def test_time_range_too_large_fails(self, validator):
        query = {
            "range": {
                "@timestamp": {"gte": "2020-01-01", "lte": "2024-01-01"}
            }
        }
        result = validator.validate_time(query)
        assert result.valid is False
        assert any(i.code == "TIME_RANGE_TOO_LARGE" for i in result.errors)

    def test_oversized_query_fails(self, validator):
        result = validator.validate_size(999_999)
        assert result.valid is False
        assert result.errors[0].code == "SIZE_TOO_LARGE"

    def test_negative_size_fails(self, validator):
        result = validator.validate_size(-5)
        assert result.valid is False

    def test_script_query_blocked(self, validator):
        query = {"script_score": {"script": {"source": "malicious"}}}
        result = validator.validate_security(query)
        assert result.valid is False
        assert any(i.code == "BLOCKED_OPERATOR" for i in result.errors)

    def test_sql_injection_detected(self, validator):
        query = {"match": {"username": "admin' OR 1=1 --"}}
        result = validator.validate_security(query)
        assert result.valid is False
        assert any(
            i.code in {"SQL_INJECTION_SUSPECTED"} for i in result.errors
        )

    def test_nosql_injection_detected(self, validator):
        query = {"match": {"filter": "{$where: function() { return true }}"}}
        result = validator.validate_security(query)
        assert result.valid is False

    def test_leading_wildcard_blocked(self, validator):
        query = {"wildcard": {"hostname": {"value": "*prod*"}}}
        result = validator.validate_wildcards(query)
        assert result.valid is False
        assert result.errors[0].code == "LEADING_WILDCARD"

    def test_trailing_wildcard_allowed(self, validator):
        query = {"wildcard": {"hostname": {"value": "web-prod*"}}}
        result = validator.validate_wildcards(query)
        assert result.valid is True

    def test_unsafe_regex_blocked(self, validator):
        query = {"regexp": {"message": {"value": "(a+)+" * 3}}}
        result = validator.validate_regex(query)
        assert result.valid is False

    def test_allowed_fields_enforced(self):
        limits = ValidatorLimits(allowed_fields=frozenset({"user", "host"}))
        validator = QueryValidator(limits=limits)
        query = {"match": {"password": "secret"}}
        result = validator.validate_fields(query)
        assert result.valid is False
        assert result.errors[0].code == "FIELD_NOT_ALLOWED"

    def test_allowed_fields_permits_whitelisted(self):
        limits = ValidatorLimits(allowed_fields=frozenset({"user", "host"}))
        validator = QueryValidator(limits=limits)
        query = {"match": {"user": "jsmith"}}
        result = validator.validate_fields(query)
        assert result.valid is True

    def test_bool_depth_exceeded(self, validator):
        # Build a deeply nested bool query beyond the default max depth.
        inner: Dict[str, Any] = {"match": {"user": "jsmith"}}
        for _ in range(10):
            inner = {"bool": {"must": [inner]}}
        result = validator.validate_query(inner)
        assert result.valid is False
        assert any(i.code == "MAX_DEPTH_EXCEEDED" for i in result.errors)

    def test_aggregation_bucket_limit_exceeded(self, validator):
        aggs = {"by_user": {"terms": {"field": "user", "size": 50000}}}
        result = validator.validate_aggregation(aggs)
        assert result.valid is False
        assert result.errors[0].code == "AGGREGATION_BUCKETS_TOO_LARGE"

    def test_aggregation_within_limits_passes(self, validator):
        aggs = {"by_user": {"terms": {"field": "user", "size": 20}}}
        result = validator.validate_aggregation(aggs)
        assert result.valid is True

    def test_missing_filters_warns_not_errors(self, validator):
        result = validator.validate_filters([])
        assert result.valid is True
        assert result.issues[0].severity == "warning"

    def test_invalid_filter_structure_fails(self, validator):
        result = validator.validate_filters([{}])
        assert result.valid is False

    def test_sanitize_strips_blocked_operators(self, validator):
        query = {
            "bool": {"must": [{"match": {"user": "jsmith"}}]},
            "script": {"source": "evil"},
        }
        sanitized = validator.sanitize(query)
        assert "script" not in sanitized
        assert "bool" in sanitized

    def test_sanitize_trims_and_truncates_strings(self, validator):
        query = {"match": {"user": "  jsmith  "}}
        sanitized = validator.sanitize(query)
        assert sanitized["match"]["user"] == "jsmith"

    def test_invalid_query_type_fails(self, validator):
        result = validator.validate_query("not-a-dict")  # type: ignore[arg-type]
        assert result.valid is False
        assert result.errors[0].code == "INVALID_TYPE"

    def test_query_string_leading_wildcard_blocked(self, validator):
        query = {"query_string": {"query": "*admin*"}}
        result = validator.validate_wildcards(query)
        assert result.valid is False