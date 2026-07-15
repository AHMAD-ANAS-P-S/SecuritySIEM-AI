"""
intent.py
---------
The "AI brain" of SecuritySIEM-AI.

Takes a raw natural-language security query from the analyst and returns a
structured `IntentResult`:

    "Show failed SSH login attempts yesterday"
    ->
    {
        "intent": "investigation",
        "event_type": "failed_login",
        "protocol": "ssh",
        "time_range": "yesterday",
        "filters": [],
        "confidence": 0.94
    }

Pipeline:
    1. LLM (LangChain + OpenAI, function-calling / structured output) extracts
       intent, event type, protocol and any explicit filters.
    2. spaCy runs a secondary pass for entities the LLM may miss (IPs,
       usernames, hostnames, CVEs) and to sanity-check/boost confidence.
    3. time_normalizer.py resolves whatever time phrase was found into a
       concrete UTC range.
    4. If the LLM is unavailable (no API key / network issue), a
       deterministic rule-based fallback keeps the system usable in dev/CI.

Owner: Ahmad Anas (Team Lead / AI-ML)
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from backend.config import get_settings
from backend.utils.time_normalizer import TimeRange, normalize_time

logger = logging.getLogger("securitysiem.intent")

# ---------------------------------------------------------------------------
# Domain vocabulary — kept here so the module works standalone; Inbavel's
# schema_mapper.py owns the authoritative ES field mapping downstream.
# ---------------------------------------------------------------------------

KNOWN_INTENTS = {"investigation", "report", "monitoring", "clarification_needed"}

KNOWN_EVENT_TYPES = {
    "failed_login",
    "successful_login",
    "malware",
    "brute_force",
    "vpn_activity",
    "mfa_event",
    "privilege_escalation",
    "suspicious_traffic",
    "unknown",
}

KNOWN_PROTOCOLS = {"ssh", "rdp", "vpn", "http", "https", "ftp", "smb", "unknown"}

_EVENT_KEYWORDS = {
    "failed_login": ["failed login", "failed logon", "login failure", "auth failure", "failed ssh"],
    "successful_login": ["successful login", "logged in", "login success"],
    "malware": ["malware", "virus", "trojan", "ransomware"],
    "brute_force": ["brute force", "brute-force", "repeated attempts", "credential stuffing"],
    "vpn_activity": ["vpn"],
    "mfa_event": ["mfa", "multi-factor", "2fa", "two factor"],
    "privilege_escalation": ["privilege escalation", "sudo", "root access", "admin access"],
    "suspicious_traffic": ["suspicious traffic", "unusual traffic", "outbound connection", "beaconing"],
}

_PROTOCOL_KEYWORDS = {
    "ssh": ["ssh"],
    "rdp": ["rdp", "remote desktop"],
    "vpn": ["vpn"],
    "http": ["http"],
    "https": ["https"],
    "ftp": ["ftp"],
    "smb": ["smb"],
}

_IP_REGEX = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_CVE_REGEX = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE)
_USERNAME_REGEX = re.compile(r"\buser[:\s]+([a-zA-Z0-9._-]+)\b", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class Filter(BaseModel):
    field: str
    value: str
    operator: str = "eq"  # eq | contains | gt | lt | in


class IntentSchema(BaseModel):
    """Structured output contract enforced on the LLM via function calling."""

    intent: str = Field(description="One of: investigation, report, monitoring, clarification_needed")
    event_type: str = Field(description="Security event category, e.g. failed_login, malware")
    protocol: Optional[str] = Field(default=None, description="Network protocol involved, if any")
    time_phrase: Optional[str] = Field(default=None, description="Raw time expression found in the message")
    filters: List[Filter] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, description="Model's confidence in this classification")

    @field_validator("intent")
    @classmethod
    def _check_intent(cls, v: str) -> str:
        v = v.lower().strip()
        return v if v in KNOWN_INTENTS else "clarification_needed"

    @field_validator("event_type")
    @classmethod
    def _check_event_type(cls, v: str) -> str:
        v = v.lower().strip().replace(" ", "_")
        return v if v in KNOWN_EVENT_TYPES else "unknown"


@dataclass
class IntentResult:
    """Final result returned to the rest of the pipeline (query_generator.py, API layer)."""

    intent: str
    event_type: str
    protocol: Optional[str]
    time_range: TimeRange
    filters: List[Dict[str, Any]] = field(default_factory=list)
    entities: Dict[str, List[str]] = field(default_factory=dict)
    confidence: float = 0.0
    source: str = "llm"  # llm | rule_based

    def to_dict(self) -> Dict[str, Any]:
        return {
            "intent": self.intent,
            "event_type": self.event_type,
            "protocol": self.protocol,
            "time_range": self.time_range.as_dict(),
            "filters": self.filters,
            "entities": self.entities,
            "confidence": round(self.confidence, 3),
            "source": self.source,
        }


# ---------------------------------------------------------------------------
# spaCy entity extraction (lazy-loaded, optional dependency)
# ---------------------------------------------------------------------------

_nlp = None


def _get_spacy_model():
    """Lazily load spaCy so the module still imports if spaCy isn't installed."""
    global _nlp
    if _nlp is not None:
        return _nlp
    try:
        import spacy

        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spaCy model 'en_core_web_sm' not found; run: python -m spacy download en_core_web_sm")
            _nlp = spacy.blank("en")
    except ImportError:
        logger.warning("spaCy not installed; entity extraction will be regex-only")
        _nlp = False  # sentinel meaning "unavailable"
    return _nlp


def extract_entities(message: str) -> Dict[str, List[str]]:
    """Pull structured entities (IPs, usernames, CVEs, org/person names) from free text."""
    entities: Dict[str, List[str]] = {
        "ip_addresses": sorted(set(_IP_REGEX.findall(message))),
        "cves": sorted(set(m.upper() for m in _CVE_REGEX.findall(message))),
        "usernames": sorted(set(_USERNAME_REGEX.findall(message))),
    }

    nlp = _get_spacy_model()
    if nlp:
        doc = nlp(message)
        entities["named_entities"] = sorted(
            {ent.text for ent in doc.ents if ent.label_ in ("ORG", "PERSON", "GPE", "PRODUCT")}
        )
    else:
        entities["named_entities"] = []

    return entities


# ---------------------------------------------------------------------------
# Rule-based fallback (used when no OPENAI_API_KEY is configured, or the LLM
# call fails). Keeps local dev / CI / offline demos functional.
# ---------------------------------------------------------------------------

def _rule_based_classify(message: str) -> IntentSchema:
    text = message.lower()

    event_type = "unknown"
    for candidate, keywords in _EVENT_KEYWORDS.items():
        if any(k in text for k in keywords):
            event_type = candidate
            break

    protocol = None
    for candidate, keywords in _PROTOCOL_KEYWORDS.items():
        if any(k in text for k in keywords):
            protocol = candidate
            break

    time_phrase = None
    for phrase in ["yesterday", "today", "last week", "this week", "last month", "this month"]:
        if phrase in text:
            time_phrase = phrase
            break
    if time_phrase is None:
        m = re.search(r"(past|last)\s+\d+\s*(hour|hours|day|days|week|weeks|month|months)", text)
        if m:
            time_phrase = m.group(0)

    intent = "investigation" if any(w in text for w in ("show", "find", "get", "list", "check")) else "report"
    confidence = 0.75 if event_type != "unknown" else 0.4
    if event_type == "unknown":
        intent = "clarification_needed"

    return IntentSchema(
        intent=intent,
        event_type=event_type,
        protocol=protocol,
        time_phrase=time_phrase,
        filters=[],
        confidence=confidence,
    )


# ---------------------------------------------------------------------------
# LLM-backed classification
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are a security-operations intent classifier for a SIEM \
natural-language search assistant. Given an analyst's message, extract:

- intent: one of investigation, report, monitoring, clarification_needed
- event_type: one of failed_login, successful_login, malware, brute_force, \
vpn_activity, mfa_event, privilege_escalation, suspicious_traffic, unknown
- protocol: ssh, rdp, vpn, http, https, ftp, smb, or null if not mentioned
- time_phrase: the raw time expression exactly as the user wrote it \
(e.g. "yesterday", "past 6 hours"), or null if none was given
- filters: any additional explicit filters as {field, value, operator} triples
- confidence: your confidence in this classification, between 0 and 1

If the request is too vague to pick a specific event_type, set intent to \
"clarification_needed" and confidence below 0.7. Never invent details the \
analyst did not provide. Respond only via the provided tool/schema."""


def _classify_with_llm(message: str) -> Optional[IntentSchema]:
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        logger.info("No OPENAI_API_KEY configured; skipping LLM classification")
        return None

    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import HumanMessage, SystemMessage
    except ImportError:
        logger.warning("langchain-openai not installed; falling back to rule-based classification")
        return None

    try:
        llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=settings.LLM_TEMPERATURE,
            timeout=settings.LLM_REQUEST_TIMEOUT,
            api_key=settings.OPENAI_API_KEY,
        )
        structured_llm = llm.with_structured_output(IntentSchema)
        result = structured_llm.invoke(
            [
                SystemMessage(content=_SYSTEM_PROMPT),
                HumanMessage(content=message),
            ]
        )
        if isinstance(result, IntentSchema):
            return result
        # Some providers return dict-like structured output
        return IntentSchema.model_validate(result)
    except Exception:  # noqa: BLE001 - any provider/network error should degrade gracefully
        logger.exception("LLM intent classification failed; falling back to rule-based")
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_intent(message: str, session_context: Optional[Dict[str, Any]] = None) -> IntentResult:
    """
    Main entry point used by `routes/chat_routes.py` (Charumithra) via
    `POST /api/chat`.

    Args:
        message: Raw analyst query, e.g. "Show failed SSH login attempts yesterday".
        session_context: Optional Redis-backed conversation context from
            Inbavel's `context_manager.py` (e.g. previously selected filters).

    Returns:
        IntentResult ready to be handed to `query_generator.py`.
    """
    if not message or not message.strip():
        raise ValueError("analyze_intent() requires a non-empty message")

    schema = _classify_with_llm(message)
    source = "llm"
    if schema is None:
        schema = _rule_based_classify(message)
        source = "rule_based"

    time_range = normalize_time(schema.time_phrase)
    entities = extract_entities(message)

    # Merge in any session context filters (e.g. user pinned a host earlier in the chat)
    filters = [f.model_dump() for f in schema.filters]
    if session_context and session_context.get("active_filters"):
        filters.extend(session_context["active_filters"])

    result = IntentResult(
        intent=schema.intent,
        event_type=schema.event_type,
        protocol=schema.protocol,
        time_range=time_range,
        filters=filters,
        entities=entities,
        confidence=schema.confidence,
        source=source,
    )

    logger.info(
        "intent=%s event_type=%s protocol=%s confidence=%.2f source=%s",
        result.intent, result.event_type, result.protocol, result.confidence, result.source,
    )
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    demo_queries = [
        "Show failed SSH login attempts yesterday",
        "Check unusual activity",
        "List brute force attempts on VPN in the past 6 hours from 10.0.0.5",
    ]
    for q in demo_queries:
        r = analyze_intent(q)
        print(q, "->", json.dumps(r.to_dict(), indent=2))