"""Enterprise Security Vocabulary Dictionary and Schema Mapping Engine.

This module provides the :class:`SchemaMapper` class, which is responsible for
translating natural language security terminology into concrete
Elasticsearch/Wazuh schema fields, queries, and values. It supports alias
resolution, synonym expansion, fuzzy matching, dynamic runtime mapping
updates, and JSON import/export for persistence and portability.

Typical usage example:

    mapper = SchemaMapper()
    result = mapper.find_best_match("failed login")
    mapping = mapper.get_mapping("ssh")
"""

from __future__ import annotations

import difflib
import json
import logging
import re
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Sequence

from pydantic import BaseModel, ConfigDict, Field, field_validator

logger = logging.getLogger(__name__)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(
        logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
        )
    )
    logger.addHandler(_handler)
    logger.setLevel(logging.INFO)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

class SchemaMapperConstants:
    """Centralized configuration constants for :class:`SchemaMapper`.

    Attributes:
        DEFAULT_FUZZY_THRESHOLD: Minimum similarity ratio (0.0 - 1.0) for a
            fuzzy match to be considered valid.
        MAX_SUGGESTIONS: Maximum number of fuzzy suggestions returned by
            :meth:`SchemaMapper.search`.
        DEFAULT_ENCODING: Default file encoding used for JSON import/export.
    """

    DEFAULT_FUZZY_THRESHOLD: float = 0.62
    MAX_SUGGESTIONS: int = 5
    DEFAULT_ENCODING: str = "utf-8"


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class SchemaMapperError(Exception):
    """Base exception for all :class:`SchemaMapper` related errors."""


class MappingNotFoundError(SchemaMapperError):
    """Raised when a requested security term has no known mapping."""

    def __init__(self, term: str) -> None:
        self.term = term
        super().__init__(f"No schema mapping found for term: '{term}'")


class InvalidMappingDefinitionError(SchemaMapperError):
    """Raised when a mapping definition fails validation."""


class MappingImportError(SchemaMapperError):
    """Raised when importing mappings from JSON fails."""


class MappingExportError(SchemaMapperError):
    """Raised when exporting mappings to JSON fails."""


class DuplicateMappingError(SchemaMapperError):
    """Raised when attempting to add a mapping that already exists."""

    def __init__(self, term: str) -> None:
        self.term = term
        super().__init__(f"Mapping already exists for term: '{term}'")


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SecurityDomain(str, Enum):
    """High-level security domain classification for a mapped term."""

    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    NETWORK = "network"
    ENDPOINT = "endpoint"
    MALWARE = "malware"
    IDENTITY = "identity"
    OS_PLATFORM = "os_platform"
    ATTACK_TECHNIQUE = "attack_technique"
    INFRASTRUCTURE = "infrastructure"


class FieldDataType(str, Enum):
    """Elasticsearch/Wazuh field data type classification."""

    KEYWORD = "keyword"
    TEXT = "text"
    IP = "ip"
    DATE = "date"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    NESTED = "nested"


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class SchemaFieldMapping(BaseModel):
    """Structured representation of a single security term mapping.

    Attributes:
        term: The canonical natural-language security term.
        aliases: Alternative phrasings that resolve to this same mapping.
        elasticsearch_fields: Elasticsearch field paths relevant to the term.
        wazuh_fields: Wazuh-specific field paths relevant to the term.
        query_values: Concrete field values used to filter on this concept
            (for example, event codes or action values).
        domain: The :class:`SecurityDomain` this term belongs to.
        data_type: The underlying :class:`FieldDataType` of the primary field.
        description: Human-readable description of the security concept.
        mitre_technique_ids: Related MITRE ATT&CK technique identifiers.
        weight: Relative importance/priority score used for ranking matches.
    """

    model_config = ConfigDict(str_strip_whitespace=True, validate_assignment=True)

    term: str = Field(..., min_length=1, max_length=128)
    aliases: List[str] = Field(default_factory=list)
    elasticsearch_fields: List[str] = Field(default_factory=list)
    wazuh_fields: List[str] = Field(default_factory=list)
    query_values: List[str] = Field(default_factory=list)
    domain: SecurityDomain = SecurityDomain.INFRASTRUCTURE
    data_type: FieldDataType = FieldDataType.KEYWORD
    description: str = ""
    mitre_technique_ids: List[str] = Field(default_factory=list)
    weight: float = Field(default=1.0, ge=0.0, le=10.0)

    @field_validator("term")
    @classmethod
    def _normalize_term(cls, value: str) -> str:
        return value.lower().strip()

    @field_validator("aliases")
    @classmethod
    def _normalize_aliases(cls, value: List[str]) -> List[str]:
        return [alias.lower().strip() for alias in value if alias.strip()]


class MatchResult(BaseModel):
    """Result of a fuzzy or exact search operation.

    Attributes:
        matched_term: The canonical term that was matched.
        score: Similarity score between 0.0 (no match) and 1.0 (exact match).
        mapping: The full :class:`SchemaFieldMapping` for the matched term.
        matched_via: Indicates whether the match came from the canonical
            term, an alias, or fuzzy similarity.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    matched_term: str
    score: float = Field(ge=0.0, le=1.0)
    mapping: SchemaFieldMapping
    matched_via: str


class SearchResponse(BaseModel):
    """Container for multiple ranked :class:`MatchResult` items.

    Attributes:
        query: The original search query string.
        results: Ranked list of matches, best first.
        total_results: Total number of results found.
    """

    query: str
    results: List[MatchResult] = Field(default_factory=list)
    total_results: int = 0


class MappingExportPayload(BaseModel):
    """Top-level structure used when exporting mappings to JSON.

    Attributes:
        version: Schema export format version.
        exported_at: ISO-8601 UTC timestamp of export.
        mappings: All exported :class:`SchemaFieldMapping` records.
    """

    version: str = "1.0"
    exported_at: str
    mappings: List[SchemaFieldMapping]


# ---------------------------------------------------------------------------
# SchemaMapper
# ---------------------------------------------------------------------------

class SchemaMapper:
    """Enterprise security vocabulary dictionary and schema mapping engine.

    The :class:`SchemaMapper` converts natural language security terminology
    (e.g. "failed login", "lateral movement") into concrete Elasticsearch and
    Wazuh schema field references. It supports exact lookups, alias
    resolution, synonym expansion, fuzzy matching, and dynamic runtime
    updates via JSON import/export.

    Thread-safety:
        All mutating operations are guarded by an internal re-entrant lock,
        making this class safe to share across async tasks or threads.

    Attributes:
        fuzzy_threshold: Minimum similarity score required for a fuzzy match.
    """

    def __init__(self, fuzzy_threshold: float = SchemaMapperConstants.DEFAULT_FUZZY_THRESHOLD) -> None:
        """Initializes the mapper with the built-in default vocabulary.

        Args:
            fuzzy_threshold: Minimum similarity ratio (0.0 - 1.0) required
                for :meth:`find_best_match` to accept a fuzzy match.
        """
        self.fuzzy_threshold = fuzzy_threshold
        self._lock = threading.RLock()
        self._mappings: Dict[str, SchemaFieldMapping] = {}
        self._alias_index: Dict[str, str] = {}
        self._load_default_vocabulary()
        logger.info("SchemaMapper initialized with %d default mappings", len(self._mappings))

    # ------------------------------------------------------------------
    # Default vocabulary bootstrap
    # ------------------------------------------------------------------

    def _load_default_vocabulary(self) -> None:
        """Populates the mapper with the built-in enterprise vocabulary."""
        defaults: List[SchemaFieldMapping] = [
            SchemaFieldMapping(
                term="failed login",
                aliases=["failed logins", "login failure", "unsuccessful login", "failed sign in"],
                elasticsearch_fields=["event.outcome", "event.action", "user.name"],
                wazuh_fields=["data.win.eventdata.status", "rule.groups"],
                query_values=["failure", "authentication_failed"],
                domain=SecurityDomain.AUTHENTICATION,
                data_type=FieldDataType.KEYWORD,
                description="An authentication attempt that did not succeed.",
                mitre_technique_ids=["T1110"],
                weight=8.0,
            ),
            SchemaFieldMapping(
                term="successful login",
                aliases=["successful logins", "login success", "successful authentication", "successful sign in"],
                elasticsearch_fields=["event.outcome", "event.action", "user.name"],
                wazuh_fields=["data.win.eventdata.status", "rule.groups"],
                query_values=["success", "authenticated"],
                domain=SecurityDomain.AUTHENTICATION,
                data_type=FieldDataType.KEYWORD,
                description="An authentication attempt that succeeded.",
                mitre_technique_ids=[],
                weight=5.0,
            ),
            SchemaFieldMapping(
                term="ssh",
                aliases=["secure shell", "ssh login", "ssh access", "ssh connection"],
                elasticsearch_fields=["network.protocol", "destination.port", "process.name"],
                wazuh_fields=["data.srcip", "data.protocol"],
                query_values=["ssh"],
                domain=SecurityDomain.NETWORK,
                data_type=FieldDataType.KEYWORD,
                description="Secure Shell remote access protocol traffic or authentication.",
                mitre_technique_ids=["T1021.004"],
                weight=6.0,
            ),
            SchemaFieldMapping(
                term="rdp",
                aliases=["remote desktop", "remote desktop protocol", "rdp session", "rdp login"],
                elasticsearch_fields=["network.protocol", "destination.port", "event.category"],
                wazuh_fields=["data.win.eventdata.logonType", "data.protocol"],
                query_values=["rdp", "3389"],
                domain=SecurityDomain.NETWORK,
                data_type=FieldDataType.KEYWORD,
                description="Remote Desktop Protocol connection or authentication event.",
                mitre_technique_ids=["T1021.001"],
                weight=6.5,
            ),
            SchemaFieldMapping(
                term="vpn",
                aliases=["virtual private network", "vpn login", "vpn connection", "vpn access"],
                elasticsearch_fields=["network.protocol", "source.ip", "event.category"],
                wazuh_fields=["data.vpn.name", "data.srcip"],
                query_values=["vpn"],
                domain=SecurityDomain.NETWORK,
                data_type=FieldDataType.KEYWORD,
                description="Virtual Private Network connection or authentication event.",
                mitre_technique_ids=["T1133"],
                weight=6.0,
            ),
            SchemaFieldMapping(
                term="dns",
                aliases=["domain name system", "dns query", "dns request", "dns lookup"],
                elasticsearch_fields=["dns.question.name", "dns.answers", "network.protocol"],
                wazuh_fields=["data.dns.question"],
                query_values=["dns"],
                domain=SecurityDomain.NETWORK,
                data_type=FieldDataType.TEXT,
                description="Domain Name System query or resolution activity.",
                mitre_technique_ids=["T1071.004"],
                weight=4.5,
            ),
            SchemaFieldMapping(
                term="malware",
                aliases=["malicious software", "virus", "trojan", "malware detection"],
                elasticsearch_fields=["event.category", "threat.indicator.type", "file.hash.sha256"],
                wazuh_fields=["rule.groups", "data.virustotal.malicious"],
                query_values=["malware"],
                domain=SecurityDomain.MALWARE,
                data_type=FieldDataType.KEYWORD,
                description="Detection of malicious software on an endpoint or network.",
                mitre_technique_ids=["T1204", "T1105"],
                weight=9.0,
            ),
            SchemaFieldMapping(
                term="ransomware",
                aliases=["ransomware attack", "crypto locker", "file encryption attack"],
                elasticsearch_fields=["event.category", "threat.indicator.type", "file.extension"],
                wazuh_fields=["rule.groups", "rule.description"],
                query_values=["ransomware"],
                domain=SecurityDomain.MALWARE,
                data_type=FieldDataType.KEYWORD,
                description="Malware variant that encrypts files and demands ransom payment.",
                mitre_technique_ids=["T1486"],
                weight=10.0,
            ),
            SchemaFieldMapping(
                term="brute force",
                aliases=["brute forcing", "password guessing", "credential stuffing", "brute force attack"],
                elasticsearch_fields=["event.action", "source.ip", "user.name"],
                wazuh_fields=["rule.groups", "rule.description"],
                query_values=["brute_force", "authentication_failures"],
                domain=SecurityDomain.AUTHENTICATION,
                data_type=FieldDataType.KEYWORD,
                description="Repeated authentication attempts intended to guess valid credentials.",
                mitre_technique_ids=["T1110"],
                weight=8.5,
            ),
            SchemaFieldMapping(
                term="mfa",
                aliases=["multi factor authentication", "two factor authentication", "2fa", "mfa bypass", "mfa fatigue"],
                elasticsearch_fields=["event.action", "user.authentication.type"],
                wazuh_fields=["data.win.eventdata.authenticationPackageName"],
                query_values=["mfa", "2fa"],
                domain=SecurityDomain.AUTHENTICATION,
                data_type=FieldDataType.KEYWORD,
                description="Multi-Factor Authentication events, bypass attempts, or fatigue attacks.",
                mitre_technique_ids=["T1621"],
                weight=7.0,
            ),
            SchemaFieldMapping(
                term="firewall",
                aliases=["firewall block", "firewall deny", "firewall rule", "firewall event"],
                elasticsearch_fields=["event.category", "rule.name", "network.direction"],
                wazuh_fields=["data.action", "data.srcip", "data.dstip"],
                query_values=["firewall"],
                domain=SecurityDomain.NETWORK,
                data_type=FieldDataType.KEYWORD,
                description="Firewall allow, block, or configuration events.",
                mitre_technique_ids=[],
                weight=5.5,
            ),
            SchemaFieldMapping(
                term="authentication",
                aliases=["auth", "authentication event", "login attempt"],
                elasticsearch_fields=["event.category", "user.name", "event.outcome"],
                wazuh_fields=["rule.groups"],
                query_values=["authentication"],
                domain=SecurityDomain.AUTHENTICATION,
                data_type=FieldDataType.KEYWORD,
                description="General authentication-related activity.",
                mitre_technique_ids=[],
                weight=5.0,
            ),
            SchemaFieldMapping(
                term="authorization",
                aliases=["access control", "permission check", "authz"],
                elasticsearch_fields=["event.category", "user.roles", "event.outcome"],
                wazuh_fields=["rule.groups"],
                query_values=["authorization"],
                domain=SecurityDomain.AUTHORIZATION,
                data_type=FieldDataType.KEYWORD,
                description="Access control and permission enforcement activity.",
                mitre_technique_ids=[],
                weight=5.0,
            ),
            SchemaFieldMapping(
                term="admin user",
                aliases=["administrator account", "admin account", "root user"],
                elasticsearch_fields=["user.name", "user.roles"],
                wazuh_fields=["data.win.eventdata.targetUserName"],
                query_values=["admin", "administrator", "root"],
                domain=SecurityDomain.IDENTITY,
                data_type=FieldDataType.KEYWORD,
                description="An account holding administrative privileges.",
                mitre_technique_ids=["T1078.003"],
                weight=7.5,
            ),
            SchemaFieldMapping(
                term="privileged account",
                aliases=["privileged user", "privileged identity", "elevated account"],
                elasticsearch_fields=["user.name", "user.roles", "event.category"],
                wazuh_fields=["data.win.eventdata.privilegeList"],
                query_values=["privileged"],
                domain=SecurityDomain.IDENTITY,
                data_type=FieldDataType.KEYWORD,
                description="An account granted elevated or privileged access rights.",
                mitre_technique_ids=["T1078"],
                weight=7.5,
            ),
            SchemaFieldMapping(
                term="linux",
                aliases=["linux host", "linux server", "unix"],
                elasticsearch_fields=["host.os.family", "host.os.name"],
                wazuh_fields=["agent.os.platform"],
                query_values=["linux"],
                domain=SecurityDomain.OS_PLATFORM,
                data_type=FieldDataType.KEYWORD,
                description="Linux operating system platform.",
                mitre_technique_ids=[],
                weight=3.0,
            ),
            SchemaFieldMapping(
                term="windows",
                aliases=["windows host", "windows server", "win32"],
                elasticsearch_fields=["host.os.family", "host.os.name"],
                wazuh_fields=["agent.os.platform"],
                query_values=["windows"],
                domain=SecurityDomain.OS_PLATFORM,
                data_type=FieldDataType.KEYWORD,
                description="Microsoft Windows operating system platform.",
                mitre_technique_ids=[],
                weight=3.0,
            ),
            SchemaFieldMapping(
                term="mac",
                aliases=["macos", "mac os", "osx", "apple"],
                elasticsearch_fields=["host.os.family", "host.os.name"],
                wazuh_fields=["agent.os.platform"],
                query_values=["macos", "darwin"],
                domain=SecurityDomain.OS_PLATFORM,
                data_type=FieldDataType.KEYWORD,
                description="Apple macOS operating system platform.",
                mitre_technique_ids=[],
                weight=3.0,
            ),
            SchemaFieldMapping(
                term="powershell",
                aliases=["powershell execution", "powershell command", "ps1"],
                elasticsearch_fields=["process.name", "process.command_line"],
                wazuh_fields=["data.win.eventdata.scriptBlockText"],
                query_values=["powershell.exe"],
                domain=SecurityDomain.ENDPOINT,
                data_type=FieldDataType.TEXT,
                description="Windows PowerShell script or command execution activity.",
                mitre_technique_ids=["T1059.001"],
                weight=7.0,
            ),
            SchemaFieldMapping(
                term="credential dumping",
                aliases=["credential dump", "mimikatz", "lsass dump", "password extraction"],
                elasticsearch_fields=["process.name", "event.category", "threat.technique.id"],
                wazuh_fields=["rule.groups", "rule.description"],
                query_values=["credential_dumping"],
                domain=SecurityDomain.ATTACK_TECHNIQUE,
                data_type=FieldDataType.KEYWORD,
                description="Extraction of credentials from memory or storage such as LSASS.",
                mitre_technique_ids=["T1003"],
                weight=9.5,
            ),
            SchemaFieldMapping(
                term="lateral movement",
                aliases=["pivoting", "internal movement", "network traversal"],
                elasticsearch_fields=["event.category", "source.ip", "destination.ip"],
                wazuh_fields=["rule.groups"],
                query_values=["lateral_movement"],
                domain=SecurityDomain.ATTACK_TECHNIQUE,
                data_type=FieldDataType.KEYWORD,
                description="Adversary movement between systems within a compromised network.",
                mitre_technique_ids=["T1021", "T1570"],
                weight=9.0,
            ),
            SchemaFieldMapping(
                term="phishing",
                aliases=["phishing email", "spear phishing", "phishing attack"],
                elasticsearch_fields=["email.from.address", "url.full", "event.category"],
                wazuh_fields=["rule.groups"],
                query_values=["phishing"],
                domain=SecurityDomain.ATTACK_TECHNIQUE,
                data_type=FieldDataType.KEYWORD,
                description="Social engineering attack delivered via deceptive email or messages.",
                mitre_technique_ids=["T1566"],
                weight=8.0,
            ),
            SchemaFieldMapping(
                term="suspicious login",
                aliases=["anomalous login", "unusual login", "impossible travel login"],
                elasticsearch_fields=["event.risk_score", "user.name", "source.geo.country_name"],
                wazuh_fields=["rule.groups"],
                query_values=["suspicious_login"],
                domain=SecurityDomain.AUTHENTICATION,
                data_type=FieldDataType.KEYWORD,
                description="A login event flagged as anomalous based on behavioral or geographic risk.",
                mitre_technique_ids=["T1078"],
                weight=8.0,
            ),
            SchemaFieldMapping(
                term="failed authentication",
                aliases=["authentication failure", "auth failure"],
                elasticsearch_fields=["event.outcome", "event.action"],
                wazuh_fields=["data.win.eventdata.status"],
                query_values=["failure"],
                domain=SecurityDomain.AUTHENTICATION,
                data_type=FieldDataType.KEYWORD,
                description="An authentication attempt that failed.",
                mitre_technique_ids=["T1110"],
                weight=7.5,
            ),
            SchemaFieldMapping(
                term="remote access",
                aliases=["remote connection", "remote session"],
                elasticsearch_fields=["network.protocol", "source.ip", "destination.port"],
                wazuh_fields=["data.protocol"],
                query_values=["remote_access"],
                domain=SecurityDomain.NETWORK,
                data_type=FieldDataType.KEYWORD,
                description="Any remote access protocol connection such as SSH, RDP, or VPN.",
                mitre_technique_ids=["T1133", "T1021"],
                weight=6.0,
            ),
            SchemaFieldMapping(
                term="privilege escalation",
                aliases=["priv esc", "privesc", "elevation of privilege"],
                elasticsearch_fields=["event.category", "process.name"],
                wazuh_fields=["rule.groups"],
                query_values=["privilege_escalation"],
                domain=SecurityDomain.ATTACK_TECHNIQUE,
                data_type=FieldDataType.KEYWORD,
                description="Technique used to gain higher-level permissions on a system.",
                mitre_technique_ids=["T1068"],
                weight=9.0,
            ),
        ]

        for mapping in defaults:
            self._register(mapping, overwrite=True)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _register(self, mapping: SchemaFieldMapping, overwrite: bool = False) -> None:
        """Registers a mapping and indexes its aliases.

        Args:
            mapping: The mapping to register.
            overwrite: Whether to overwrite an existing mapping with the
                same canonical term.

        Raises:
            DuplicateMappingError: If the term already exists and
                ``overwrite`` is ``False``.
        """
        if mapping.term in self._mappings and not overwrite:
            raise DuplicateMappingError(mapping.term)

        self._mappings[mapping.term] = mapping
        self._alias_index[mapping.term] = mapping.term
        for alias in mapping.aliases:
            self._alias_index[alias] = mapping.term

    def _resolve_canonical_term(self, term: str) -> Optional[str]:
        """Resolves a raw term or alias to its canonical mapping key."""
        normalized = term.lower().strip()
        return self._alias_index.get(normalized)

    @staticmethod
    def _similarity(a: str, b: str) -> float:
        """Computes a normalized string similarity ratio between two terms."""
        return difflib.SequenceMatcher(None, a, b).ratio()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_mapping(self, term: str) -> SchemaFieldMapping:
        """Retrieves the exact mapping for a given term or alias.

        Args:
            term: The natural language security term or known alias.

        Returns:
            The matching :class:`SchemaFieldMapping`.

        Raises:
            MappingNotFoundError: If no mapping exists for the term.
        """
        with self._lock:
            canonical = self._resolve_canonical_term(term)
            if canonical is None:
                logger.warning("Mapping lookup failed for term: '%s'", term)
                raise MappingNotFoundError(term)
            return self._mappings[canonical].model_copy(deep=True)

    def get_multiple_mappings(self, terms: Sequence[str]) -> Dict[str, Optional[SchemaFieldMapping]]:
        """Retrieves mappings for multiple terms in a single call.

        Args:
            terms: A sequence of natural language security terms.

        Returns:
            A dictionary mapping each input term to its corresponding
            :class:`SchemaFieldMapping`, or ``None`` if no mapping was found.
        """
        results: Dict[str, Optional[SchemaFieldMapping]] = {}
        for term in terms:
            try:
                results[term] = self.get_mapping(term)
            except MappingNotFoundError:
                logger.info("No mapping found for '%s' in batch lookup", term)
                results[term] = None
        return results

    def add_mapping(self, mapping: SchemaFieldMapping, overwrite: bool = False) -> None:
        """Adds a new mapping to the vocabulary, or updates dynamically.

        Args:
            mapping: The :class:`SchemaFieldMapping` to add.
            overwrite: If ``True``, replaces an existing mapping with the
                same canonical term.

        Raises:
            InvalidMappingDefinitionError: If the mapping fails structural
                validation.
            DuplicateMappingError: If the term already exists and
                ``overwrite`` is ``False``.
        """
        if not mapping.term:
            raise InvalidMappingDefinitionError("Mapping term must not be empty")

        with self._lock:
            self._register(mapping, overwrite=overwrite)
        logger.info("Mapping added/updated for term: '%s'", mapping.term)

    def remove_mapping(self, term: str) -> None:
        """Removes a mapping and all of its aliases from the vocabulary.

        Args:
            term: The canonical term or alias identifying the mapping to
                remove.

        Raises:
            MappingNotFoundError: If no mapping exists for the term.
        """
        with self._lock:
            canonical = self._resolve_canonical_term(term)
            if canonical is None:
                raise MappingNotFoundError(term)

            mapping = self._mappings.pop(canonical)
            del self._alias_index[canonical]
            for alias in mapping.aliases:
                self._alias_index.pop(alias, None)
        logger.info("Mapping removed for term: '%s'", canonical)

    def find_best_match(self, query: str) -> Optional[MatchResult]:
        """Finds the single best matching mapping for a free-text query.

        Resolution order: exact canonical term, exact alias, then fuzzy
        similarity against all known terms and aliases.

        Args:
            query: The free-text natural language query.

        Returns:
            The best :class:`MatchResult`, or ``None`` if nothing meets the
            fuzzy threshold.
        """
        normalized = query.lower().strip()
        with self._lock:
            canonical = self._alias_index.get(normalized)
            if canonical is not None:
                matched_via = "exact_term" if normalized == canonical else "exact_alias"
                return MatchResult(
                    matched_term=canonical,
                    score=1.0,
                    mapping=self._mappings[canonical].model_copy(deep=True),
                    matched_via=matched_via,
                )

            best_score = 0.0
            best_canonical: Optional[str] = None
            for indexed_term, canonical_term in self._alias_index.items():
                score = self._similarity(normalized, indexed_term)
                if score > best_score:
                    best_score = score
                    best_canonical = canonical_term

            if best_canonical is not None and best_score >= self.fuzzy_threshold:
                return MatchResult(
                    matched_term=best_canonical,
                    score=round(best_score, 4),
                    mapping=self._mappings[best_canonical].model_copy(deep=True),
                    matched_via="fuzzy",
                )

        logger.info("No fuzzy match above threshold (%.2f) for query: '%s'", self.fuzzy_threshold, query)
        return None

    def search(self, query: str, limit: int = SchemaMapperConstants.MAX_SUGGESTIONS) -> SearchResponse:
        """Performs a ranked fuzzy search across the entire vocabulary.

        Args:
            query: The free-text natural language query.
            limit: Maximum number of ranked results to return.

        Returns:
            A :class:`SearchResponse` containing ranked :class:`MatchResult`
            entries, best first.
        """
        normalized = query.lower().strip()
        scored: Dict[str, float] = {}

        with self._lock:
            for indexed_term, canonical_term in self._alias_index.items():
                score = self._similarity(normalized, indexed_term)
                if normalized in indexed_term or indexed_term in normalized:
                    score = max(score, 0.9)
                scored[canonical_term] = max(scored.get(canonical_term, 0.0), score)

            ranked_terms = sorted(scored.items(), key=lambda item: item[1], reverse=True)
            results: List[MatchResult] = []
            for canonical_term, score in ranked_terms[:limit]:
                if score < self.fuzzy_threshold:
                    continue
                results.append(
                    MatchResult(
                        matched_term=canonical_term,
                        score=round(score, 4),
                        mapping=self._mappings[canonical_term].model_copy(deep=True),
                        matched_via="search",
                    )
                )

        logger.debug("Search for '%s' returned %d results", query, len(results))
        return SearchResponse(query=query, results=results, total_results=len(results))

    def validate_mapping(self, mapping: SchemaFieldMapping) -> bool:
        """Validates structural integrity of a mapping definition.

        Args:
            mapping: The mapping to validate.

        Returns:
            ``True`` if the mapping is structurally valid.

        Raises:
            InvalidMappingDefinitionError: If validation fails.
        """
        if not mapping.term:
            raise InvalidMappingDefinitionError("Mapping term must not be empty")
        if not mapping.elasticsearch_fields and not mapping.wazuh_fields:
            raise InvalidMappingDefinitionError(
                f"Mapping '{mapping.term}' must define at least one Elasticsearch or Wazuh field"
            )
        return True

    def export_json(self, file_path: Optional[str] = None) -> str:
        """Exports the current vocabulary to a JSON string, optionally to disk.

        Args:
            file_path: Optional filesystem path to write the JSON export to.

        Returns:
            The JSON-serialized export payload as a string.

        Raises:
            MappingExportError: If serialization or file writing fails.
        """
        try:
            with self._lock:
                payload = MappingExportPayload(
                    exported_at=datetime.now(timezone.utc).isoformat(),
                    mappings=list(self._mappings.values()),
                )
            serialized = payload.model_dump_json(indent=2)

            if file_path:
                Path(file_path).write_text(serialized, encoding=SchemaMapperConstants.DEFAULT_ENCODING)
                logger.info("Exported %d mappings to %s", len(payload.mappings), file_path)

            return serialized
        except (OSError, TypeError, ValueError) as exc:
            logger.error("Failed to export mappings: %s", exc)
            raise MappingExportError(f"Failed to export mappings: {exc}") from exc

    def import_json(self, source: str, from_file: bool = False, overwrite: bool = True) -> int:
        """Imports mappings from a JSON string or file.

        Args:
            source: A JSON string, or a filesystem path if ``from_file`` is
                ``True``.
            from_file: Whether ``source`` should be treated as a file path.
            overwrite: Whether imported mappings should overwrite existing
                ones with the same canonical term.

        Returns:
            The number of mappings successfully imported.

        Raises:
            MappingImportError: If parsing or validation fails.
        """
        try:
            raw = (
                Path(source).read_text(encoding=SchemaMapperConstants.DEFAULT_ENCODING)
                if from_file
                else source
            )
            data = json.loads(raw)
            mappings_data = data.get("mappings", data if isinstance(data, list) else [])

            imported = 0
            with self._lock:
                for item in mappings_data:
                    mapping = SchemaFieldMapping.model_validate(item)
                    self.validate_mapping(mapping)
                    self._register(mapping, overwrite=overwrite)
                    imported += 1

            logger.info("Imported %d mappings from %s", imported, "file" if from_file else "string")
            return imported
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            logger.error("Failed to import mappings: %s", exc)
            raise MappingImportError(f"Failed to import mappings: {exc}") from exc

    def list_terms(self) -> List[str]:
        """Returns all canonical terms currently registered.

        Returns:
            A sorted list of canonical term strings.
        """
        with self._lock:
            return sorted(self._mappings.keys())

    def get_terms_by_domain(self, domain: SecurityDomain) -> List[SchemaFieldMapping]:
        """Retrieves all mappings belonging to a given security domain.

        Args:
            domain: The :class:`SecurityDomain` to filter by.

        Returns:
            A list of matching :class:`SchemaFieldMapping` instances.
        """
        with self._lock:
            return [
                mapping.model_copy(deep=True)
                for mapping in self._mappings.values()
                if mapping.domain == domain
            ]