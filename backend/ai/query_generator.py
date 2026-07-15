"""
query_generator.py
-------------------
Converts a structured `IntentResult` (from intent.py) into a valid
Elasticsearch DSL query, ready for Karthika's `validator.py` -> `connector.py`.

Automatically:
    - Adds a time range filter (from time_normalizer.py)
    - Adds sorting (@timestamp desc)
    - Adds a size limit (config-driven, capped at MAX_QUERY_SIZE)
    - Adds pagination via `search_after` / `from`

Field mapping (event_type -> ES fields) is delegated to Inbavel's
`schema_mapper.py` when available; a local fallback mapping keeps this
module independently testable and functional before that module lands.

Owner: Ahmad Anas (Team Lead / AI-ML)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from backend.ai.intent import IntentResult
from backend.config import get_settings

logger = logging.getLogger("securitysiem.query_generator")

# ---------------------------------------------------------------------------
# Fallback event_type -> ES field/value mapping.
# Inbavel's schema_mapper.map_event_type() is the source of truth once
# available; this local table is only used if that import fails, so the
# module keeps working in isolation / unit tests.
# ---------------------------------------------------------------------------
_FALLBACK_EVENT_MAPPING: Dict[str, List[Dict[str, Any]]] = {
    "failed_login": [{"field": "event.outcome", "value": "failure"}],
    "successful_login": [{"field": "event.outcome", "value": "success"}],
    "malware": [{"field": "event.category", "value": "malware"}],
    "brute_force": [
        {"field": "event.outcome", "value": "failure"},
        {"field": "event.category", "value": "authentication"},
    ],
    "vpn_activity": [{"field": "event.category", "value": "network"}, {"field": "network.protocol", "value": "vpn"}],
    "mfa_event": [{"field": "event.category", "value": "authentication"}, {"field": "event.type", "value": "mfa"}],
    "privilege_escalation": [{"field": "event.category", "value": "privilege_escalation"}],
    "suspicious_traffic": [{"field": "event.category", "value": "network"}, {"field": "event.type", "value": "suspicious"}],
}

_FALLBACK_PROTOCOL_MAPPING: Dict[str, Dict[str, Any]] = {
    "ssh": {"field": "process.name", "value": "sshd"},
    "rdp": {"field": "process.name", "value": "rdp"},
    "vpn": {"field": "network.protocol", "value": "vpn"},
    "http": {"field": "network.protocol", "value": "http"},
    "https": {"field": "network.protocol", "value": "https"},
    "ftp": {"field": "network.protocol", "value": "ftp"},
    "smb": {"field": "network.protocol", "value": "smb"},
}


def _map_event_type(event_type: str) -> List[Dict[str, Any]]:
    """Try Inbavel's schema_mapper first, fall back to the local table."""
    try:
        from backend.ai.schema_mapper import map_event_type  # type: ignore

        mapped = map_event_type(event_type)
        if mapped:
            return mapped
    except ImportError:
        logger.debug("schema_mapper not available yet; using fallback event mapping")
    except Exception:  # noqa: BLE001
        logger.exception("schema_mapper.map_event_type raised; using fallback event mapping")

    return _FALLBACK_EVENT_MAPPING.get(event_type, [])


def _map_protocol(protocol: Optional[str]) -> Optional[Dict[str, Any]]:
    if not protocol:
        return None
    try:
        from backend.ai.schema_mapper import map_protocol  # type: ignore

        mapped = map_protocol(protocol)
        if mapped:
            return mapped
    except ImportError:
        pass
    except Exception:  # noqa: BLE001
        logger.exception("schema_mapper.map_protocol raised; using fallback protocol mapping")

    return _FALLBACK_PROTOCOL_MAPPING.get(protocol)


def _filter_to_clause(f: Dict[str, Any]) -> Dict[str, Any]:
    """Translate a generic {field, value, operator} filter into an ES query clause."""
    field_name = f["field"]
    value = f["value"]
    operator = f.get("operator", "eq")

    if operator == "eq":
        return {"term": {field_name: value}}
    if operator == "contains":
        return {"match": {field_name: value}}
    if operator == "gt":
        return {"range": {field_name: {"gt": value}}}
    if operator == "lt":
        return {"range": {field_name: {"lt": value}}}
    if operator == "in":
        values = value if isinstance(value, list) else [value]
        return {"terms": {field_name: values}}

    logger.warning("Unknown filter operator '%s' for field '%s'; defaulting to term", operator, field_name)
    return {"term": {field_name: value}}


def build_query(
    intent_result: IntentResult,
    page: int = 0,
    page_size: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Build a complete Elasticsearch DSL query body from an IntentResult.

    Args:
        intent_result: Output of `backend.ai.intent.analyze_intent`.
        page: Zero-indexed page number for `from`-based pagination.
        page_size: Override the default page size (config-capped at MAX_QUERY_SIZE).

    Returns:
        A dict ready to POST to `_search` (via Karthika's connector.py),
        e.g.:
        {
            "query": {"bool": {"must": [...] }},
            "sort": [{"@timestamp": "desc"}],
            "size": 100,
            "from": 0
        }
    """
    settings = get_settings()
    size = page_size or settings.DEFAULT_QUERY_SIZE
    size = min(size, settings.MAX_QUERY_SIZE)

    must_clauses: List[Dict[str, Any]] = []

    # 1. Event type mapping
    for clause in _map_event_type(intent_result.event_type):
        must_clauses.append(_filter_to_clause(clause))

    # 2. Protocol mapping
    protocol_clause = _map_protocol(intent_result.protocol)
    if protocol_clause:
        must_clauses.append(_filter_to_clause(protocol_clause))

    # 3. Explicit / session-carried filters
    for f in intent_result.filters:
        must_clauses.append(_filter_to_clause(f))

    # 4. Entity-derived filters (IPs / usernames picked up by intent.py)
    for ip in intent_result.entities.get("ip_addresses", []):
        must_clauses.append({"term": {"source.ip": ip}})
    for username in intent_result.entities.get("usernames", []):
        must_clauses.append({"term": {"user.name": username}})

    # 5. Time range (always added)
    must_clauses.append({"range": {"@timestamp": intent_result.time_range.es_range()}})

    query: Dict[str, Any] = {
        "query": {"bool": {"must": must_clauses}} if must_clauses else {"match_all": {}},
        "sort": [{"@timestamp": {"order": "desc"}}],
        "size": size,
        "from": max(page, 0) * size,
    }

    logger.info(
        "Built ES query for event_type=%s protocol=%s clauses=%d size=%d from=%d",
        intent_result.event_type, intent_result.protocol, len(must_clauses), size, query["from"],
    )
    return query


def build_query_with_search_after(
    intent_result: IntentResult,
    search_after: Optional[List[Any]] = None,
    page_size: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Deep-pagination variant using `search_after`, preferred by Karthika's
    connector for large result sets (avoids the `from + size` 10k limit).
    """
    query = build_query(intent_result, page=0, page_size=page_size)
    query.pop("from", None)
    if search_after:
        query["search_after"] = search_after
    return query


if __name__ == "__main__":
    import json
    import logging as _logging

    from backend.ai.intent import analyze_intent

    _logging.basicConfig(level=_logging.INFO)
    result = analyze_intent("Show failed SSH login attempts yesterday")
    print(json.dumps(build_query(result), indent=2))