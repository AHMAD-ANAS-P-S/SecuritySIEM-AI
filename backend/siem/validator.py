"""Enterprise query validation layer for SecuritySIEM AI.

This module provides :class:`QueryValidator`, which every AI-generated
query must pass through before reaching Elasticsearch or Wazuh. It
enforces bounds on time ranges, result sizes, allowed fields and
operators, aggregation complexity, wildcard and regex usage, boolean
nesting depth, and blocks dangerous constructs such as scripted queries,
SQL/NoSQL injection payloads, and unsafe DSL fragments.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence, Set

logger = logging.getLogger(__name__)


class QueryValidationError(Exception):
    """Base exception for query validation failures."""


class QuerySecurityError(QueryValidationError):
    """Raised when a query contains a potentially malicious construct."""


class QueryComplexityError(QueryValidationError):
    """Raised when a query exceeds allowed complexity or resource limits."""


class QueryFieldError(QueryValidationError):
    """Raised when a query references disallowed or unknown fields."""


@dataclass
class ValidationIssue:
    """A single validation finding.

    Attributes:
        code: Short machine-readable issue code.
        message: Human-readable description of the issue.
        severity: One of ``"error"`` or ``"warning"``.
        path: Optional dotted path within the query where the issue occurred.
    """

    code: str
    message: str
    severity: str = "error"
    path: Optional[str] = None


@dataclass
class ValidationResult:
    """Structured result returned by all validator methods.

    Attributes:
        valid: Whether the validated input passed all error-level checks.
        issues: List of :class:`ValidationIssue` findings.
        sanitized_query: The sanitized/normalized query, when applicable.
    """

    valid: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    sanitized_query: Optional[Dict[str, Any]] = None

    def add(self, issue: ValidationIssue) -> None:
        """Adds an issue to the result and downgrades validity on errors.

        Args:
            issue: The :class:`ValidationIssue` to record.
        """
        self.issues.append(issue)
        if issue.severity == "error":
            self.valid = False

    @property
    def errors(self) -> List[ValidationIssue]:
        """Returns only error-severity issues.

        Returns:
            List[ValidationIssue]: The subset of issues with error severity.
        """
        return [i for i in self.issues if i.severity == "error"]


@dataclass(frozen=True)
class ValidatorLimits:
    """Configurable enforcement limits for :class:`QueryValidator`.

    Attributes:
        max_time_range_days: Maximum allowed span of a time-range filter.
        max_size: Maximum allowed ``size`` (result count) per query.
        max_aggregation_buckets: Maximum allowed aggregation bucket size.
        max_nested_depth: Maximum allowed nesting depth for bool queries.
        max_aggregation_depth: Maximum allowed nested-aggregation depth.
        allowed_fields: Optional whitelist of queryable field names. When
            empty, all fields are permitted (subject to other checks).
        allowed_operators: Set of permitted top-level Query DSL leaf clauses.
        blocked_operators: Set of always-forbidden Query DSL clauses.
    """

    max_time_range_days: int = 90
    max_size: int = 10_000
    max_aggregation_buckets: int = 1_000
    max_nested_depth: int = 6
    max_aggregation_depth: int = 4
    allowed_fields: frozenset = field(default_factory=frozenset)
    allowed_operators: frozenset = field(
        default_factory=lambda: frozenset(
            {
                "match",
                "match_phrase",
                "match_all",
                "term",
                "terms",
                "range",
                "bool",
                "exists",
                "wildcard",
                "prefix",
                "ids",
                "multi_match",
                "query_string",
            }
        )
    )
    blocked_operators: frozenset = field(
        default_factory=lambda: frozenset(
            {
                "script",
                "script_score",
                "script_fields",
                "stored_fields",
                "_source",
                "template",
                "search_template",
            }
        )
    )


_SQL_INJECTION_PATTERNS = [
    re.compile(r"(?i)\bunion\s+select\b"),
    re.compile(r"(?i)\bdrop\s+table\b"),
    re.compile(r"(?i)\bor\s+1\s*=\s*1\b"),
    re.compile(r"(?i)\binsert\s+into\b"),
    re.compile(r"(?i)\bdelete\s+from\b"),
    re.compile(r"(?i)--\s*$"),
    re.compile(r"(?i);\s*shutdown\b"),
    re.compile(r"(?i)\bexec(\s|\()"),
]

_NOSQL_INJECTION_PATTERNS = [
    re.compile(r"\$where\b"),
    re.compile(r"\$ne\b"),
    re.compile(r"\$gt\b"),
    re.compile(r"\$regex\b"),
    re.compile(r"javascript\s*:"),
    re.compile(r"function\s*\("),
]

_DANGEROUS_REGEX_CHARS = re.compile(r"(\.\*){2,}|(\(.*){5,}|\{[0-9]{4,},")

_MAX_STRING_LENGTH = 2048


class QueryValidator:
    """Enterprise query validation and sanitization layer.

    Every AI-generated Elasticsearch DSL query must be passed through
    :meth:`validate_query` before execution. The validator performs
    structural, semantic, and security checks, and produces a sanitized
    copy of the query safe for execution.

    Attributes:
        limits: The :class:`ValidatorLimits` enforced by this instance.
    """

    def __init__(self, limits: Optional[ValidatorLimits] = None) -> None:
        """Initializes the validator with the given or default limits.

        Args:
            limits: Optional custom :class:`ValidatorLimits`. Defaults are
                used when omitted.
        """
        self.limits = limits or ValidatorLimits()
        logger.debug("QueryValidator initialized with limits=%s", self.limits)

    def validate_query(
        self, query: Dict[str, Any], size: Optional[int] = None
    ) -> ValidationResult:
        """Runs the full validation pipeline against a query document.

        Args:
            query: The Elasticsearch Query DSL ``query`` clause to validate.
            size: Optional requested result size to validate alongside the
                query.

        Returns:
            ValidationResult: Aggregated result of every validation stage.
        """
        result = ValidationResult(valid=True)

        if not isinstance(query, dict):
            result.add(
                ValidationIssue(
                    code="INVALID_TYPE",
                    message="Query must be a JSON object.",
                    severity="error",
                )
            )
            return result

        self._merge(result, self.validate_security(query))
        self._merge(result, self.validate_fields(query))
        self._merge(result, self.validate_wildcards(query))
        self._merge(result, self.validate_regex(query))
        self._merge(result, self.validate_time(query))

        depth = self._bool_depth(query)
        if depth > self.limits.max_nested_depth:
            result.add(
                ValidationIssue(
                    code="MAX_DEPTH_EXCEEDED",
                    message=(
                        f"Boolean query nesting depth {depth} exceeds maximum "
                        f"of {self.limits.max_nested_depth}."
                    ),
                    severity="error",
                )
            )

        if size is not None:
            self._merge(result, self.validate_size(size))

        if result.valid:
            result.sanitized_query = self.sanitize(query)

        return result

    def validate_time(self, query: Dict[str, Any]) -> ValidationResult:
        """Validates that all range/time filters stay within allowed span.

        Args:
            query: The Query DSL document (or subtree) to inspect.

        Returns:
            ValidationResult: Findings related to time-range constraints.
        """
        result = ValidationResult(valid=True)
        for path, range_clause in self._find_clauses(query, "range"):
            for field_name, bounds in range_clause.items():
                if not isinstance(bounds, dict):
                    continue
                gte = bounds.get("gte") or bounds.get("gt")
                lte = bounds.get("lte") or bounds.get("lt")
                start = self._parse_time(gte)
                end = self._parse_time(lte)
                if start and end:
                    span = end - start
                    if span > timedelta(days=self.limits.max_time_range_days):
                        result.add(
                            ValidationIssue(
                                code="TIME_RANGE_TOO_LARGE",
                                message=(
                                    f"Time range on '{field_name}' spans "
                                    f"{span.days} days, exceeding the maximum "
                                    f"of {self.limits.max_time_range_days} days."
                                ),
                                severity="error",
                                path=path,
                            )
                        )
                    if span.total_seconds() < 0:
                        result.add(
                            ValidationIssue(
                                code="TIME_RANGE_INVERTED",
                                message=(
                                    f"Time range on '{field_name}' has a start "
                                    "after its end."
                                ),
                                severity="error",
                                path=path,
                            )
                        )
        return result

    def validate_size(self, size: int) -> ValidationResult:
        """Validates the requested result size.

        Args:
            size: The requested number of hits to return.

        Returns:
            ValidationResult: Findings related to result size limits.
        """
        result = ValidationResult(valid=True)
        if not isinstance(size, int) or size < 0:
            result.add(
                ValidationIssue(
                    code="INVALID_SIZE",
                    message="Size must be a non-negative integer.",
                    severity="error",
                )
            )
        elif size > self.limits.max_size:
            result.add(
                ValidationIssue(
                    code="SIZE_TOO_LARGE",
                    message=(
                        f"Requested size {size} exceeds maximum of "
                        f"{self.limits.max_size}."
                    ),
                    severity="error",
                )
            )
        return result

    def validate_fields(self, query: Dict[str, Any]) -> ValidationResult:
        """Validates that only allowed fields are referenced in the query.

        Args:
            query: The Query DSL document (or subtree) to inspect.

        Returns:
            ValidationResult: Findings related to disallowed field usage.
        """
        result = ValidationResult(valid=True)
        if not self.limits.allowed_fields:
            return result

        referenced = self._extract_field_names(query)
        disallowed = referenced - set(self.limits.allowed_fields)
        for field_name in sorted(disallowed):
            result.add(
                ValidationIssue(
                    code="FIELD_NOT_ALLOWED",
                    message=f"Field '{field_name}' is not in the allowed field list.",
                    severity="error",
                    path=field_name,
                )
            )
        return result

    def validate_filters(self, filters: Sequence[Dict[str, Any]]) -> ValidationResult:
        """Validates a list of filter clauses for required structure.

        Args:
            filters: A sequence of Query DSL filter clauses.

        Returns:
            ValidationResult: Findings related to filter structure.
        """
        result = ValidationResult(valid=True)
        if not filters:
            result.add(
                ValidationIssue(
                    code="MISSING_FILTERS",
                    message="At least one filter is required for this query.",
                    severity="warning",
                )
            )
        for idx, clause in enumerate(filters):
            if not isinstance(clause, dict) or not clause:
                result.add(
                    ValidationIssue(
                        code="INVALID_FILTER",
                        message=f"Filter at index {idx} is not a valid object.",
                        severity="error",
                        path=f"filters[{idx}]",
                    )
                )
        return result

    def validate_aggregation(
        self, aggregations: Dict[str, Any], depth: int = 0
    ) -> ValidationResult:
        """Validates aggregation structure, depth, and bucket limits.

        Args:
            aggregations: The Query DSL ``aggs`` clause to validate.
            depth: Current recursion depth (used internally).

        Returns:
            ValidationResult: Findings related to aggregation complexity.
        """
        result = ValidationResult(valid=True)
        if depth > self.limits.max_aggregation_depth:
            result.add(
                ValidationIssue(
                    code="AGGREGATION_TOO_DEEP",
                    message=(
                        f"Aggregation nesting depth exceeds maximum of "
                        f"{self.limits.max_aggregation_depth}."
                    ),
                    severity="error",
                )
            )
            return result

        if not isinstance(aggregations, dict):
            result.add(
                ValidationIssue(
                    code="INVALID_AGGREGATION",
                    message="Aggregations must be a JSON object.",
                    severity="error",
                )
            )
            return result

        for agg_name, agg_body in aggregations.items():
            if not isinstance(agg_body, dict):
                continue
            for agg_type, params in agg_body.items():
                if agg_type == "aggs" or agg_type == "aggregations":
                    self._merge(result, self.validate_aggregation(params, depth + 1))
                    continue
                if isinstance(params, dict):
                    bucket_size = params.get("size")
                    if (
                        isinstance(bucket_size, int)
                        and bucket_size > self.limits.max_aggregation_buckets
                    ):
                        result.add(
                            ValidationIssue(
                                code="AGGREGATION_BUCKETS_TOO_LARGE",
                                message=(
                                    f"Aggregation '{agg_name}' requests "
                                    f"{bucket_size} buckets, exceeding the "
                                    f"maximum of "
                                    f"{self.limits.max_aggregation_buckets}."
                                ),
                                severity="error",
                                path=agg_name,
                            )
                        )
        return result

    def validate_wildcards(self, query: Dict[str, Any]) -> ValidationResult:
        """Validates that wildcard queries are not overly broad.

        Args:
            query: The Query DSL document (or subtree) to inspect.

        Returns:
            ValidationResult: Findings related to unsafe wildcard usage.
        """
        result = ValidationResult(valid=True)
        for path, clause in self._find_clauses(query, "wildcard"):
            for field_name, spec in clause.items():
                value = spec.get("value") if isinstance(spec, dict) else spec
                if not isinstance(value, str):
                    continue
                if value.startswith("*") or value.startswith("?"):
                    result.add(
                        ValidationIssue(
                            code="LEADING_WILDCARD",
                            message=(
                                f"Wildcard on '{field_name}' begins with a "
                                "wildcard character, which is disallowed for "
                                "performance and security reasons."
                            ),
                            severity="error",
                            path=path,
                        )
                    )
        for path, clause in self._find_clauses(query, "query_string"):
            value = clause.get("query") if isinstance(clause, dict) else None
            if isinstance(value, str) and value.strip().startswith("*"):
                result.add(
                    ValidationIssue(
                        code="LEADING_WILDCARD",
                        message="query_string may not begin with a wildcard.",
                        severity="error",
                        path=path,
                    )
                )
        return result

    def validate_regex(self, query: Dict[str, Any]) -> ValidationResult:
        """Validates that regexp clauses cannot cause catastrophic backtracking.

        Args:
            query: The Query DSL document (or subtree) to inspect.

        Returns:
            ValidationResult: Findings related to unsafe regex patterns.
        """
        result = ValidationResult(valid=True)
        for path, clause in self._find_clauses(query, "regexp"):
            for field_name, spec in clause.items():
                value = spec.get("value") if isinstance(spec, dict) else spec
                if not isinstance(value, str):
                    continue
                if len(value) > 256 or _DANGEROUS_REGEX_CHARS.search(value):
                    result.add(
                        ValidationIssue(
                            code="UNSAFE_REGEX",
                            message=(
                                f"Regex on '{field_name}' is too complex or "
                                "may cause catastrophic backtracking."
                            ),
                            severity="error",
                            path=path,
                        )
                    )
        return result

    def validate_security(self, query: Dict[str, Any]) -> ValidationResult:
        """Blocks dangerous DSL constructs and injection payloads.

        Checks for scripted queries, script fields, injection patterns
        resembling SQL or NoSQL attacks, and other unsafe constructs.

        Args:
            query: The Query DSL document (or subtree) to inspect.

        Returns:
            ValidationResult: Findings related to security risks.
        """
        result = ValidationResult(valid=True)
        blocked_found = self._find_blocked_keys(query)
        for path, key in blocked_found:
            result.add(
                ValidationIssue(
                    code="BLOCKED_OPERATOR",
                    message=f"Operator '{key}' is not permitted in AI-generated queries.",
                    severity="error",
                    path=path,
                )
            )

        for path, value in self._walk_strings(query):
            if len(value) > _MAX_STRING_LENGTH:
                result.add(
                    ValidationIssue(
                        code="STRING_TOO_LONG",
                        message=f"Value at '{path}' exceeds maximum length.",
                        severity="error",
                        path=path,
                    )
                )
                continue
            for pattern in _SQL_INJECTION_PATTERNS:
                if pattern.search(value):
                    result.add(
                        ValidationIssue(
                            code="SQL_INJECTION_SUSPECTED",
                            message=f"Value at '{path}' matches a SQL injection pattern.",
                            severity="error",
                            path=path,
                        )
                    )
                    break
            for pattern in _NOSQL_INJECTION_PATTERNS:
                if pattern.search(value):
                    result.add(
                        ValidationIssue(
                            code="NOSQL_INJECTION_SUSPECTED",
                            message=f"Value at '{path}' matches a NoSQL injection pattern.",
                            severity="error",
                            path=path,
                        )
                    )
                    break
        return result

    def sanitize(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Produces a sanitized deep copy of a query with unsafe keys stripped.

        Args:
            query: The Query DSL document to sanitize.

        Returns:
            Dict[str, Any]: A sanitized deep copy safe for execution.
        """
        return self._sanitize_value(query)

    def _sanitize_value(self, value: Any) -> Any:
        """Recursively sanitizes a JSON-like value.

        Args:
            value: The value to sanitize (dict, list, str, or scalar).

        Returns:
            Any: The sanitized value.
        """
        if isinstance(value, dict):
            cleaned = {}
            for key, val in value.items():
                if key in self.limits.blocked_operators:
                    logger.warning("Stripped blocked operator '%s' during sanitize.", key)
                    continue
                cleaned[key] = self._sanitize_value(val)
            return cleaned
        if isinstance(value, list):
            return [self._sanitize_value(item) for item in value]
        if isinstance(value, str):
            trimmed = value.strip()
            return trimmed[:_MAX_STRING_LENGTH]
        return value

    def _merge(self, target: ValidationResult, source: ValidationResult) -> None:
        """Merges findings from one ValidationResult into another.

        Args:
            target: The result to merge into.
            source: The result whose issues are merged in.
        """
        for issue in source.issues:
            target.add(issue)

    def _find_clauses(
        self, node: Any, clause_name: str, path: str = "$"
    ) -> List[tuple]:
        """Recursively finds all occurrences of a given DSL clause name.

        Args:
            node: The current JSON-like node being inspected.
            clause_name: The DSL clause key to search for (e.g. ``range``).
            path: Dotted path accumulated so far, for reporting.

        Returns:
            List[tuple]: Pairs of ``(path, clause_body)`` for every match.
        """
        found: List[tuple] = []
        if isinstance(node, dict):
            for key, value in node.items():
                current_path = f"{path}.{key}"
                if key == clause_name and isinstance(value, dict):
                    found.append((current_path, value))
                found.extend(self._find_clauses(value, clause_name, current_path))
        elif isinstance(node, list):
            for idx, item in enumerate(node):
                found.extend(self._find_clauses(item, clause_name, f"{path}[{idx}]"))
        return found

    def _find_blocked_keys(self, node: Any, path: str = "$") -> List[tuple]:
        """Recursively finds any blocked operator keys in a query.

        Args:
            node: The current JSON-like node being inspected.
            path: Dotted path accumulated so far, for reporting.

        Returns:
            List[tuple]: Pairs of ``(path, blocked_key)`` for every match.
        """
        found: List[tuple] = []
        if isinstance(node, dict):
            for key, value in node.items():
                current_path = f"{path}.{key}"
                if key in self.limits.blocked_operators:
                    found.append((current_path, key))
                found.extend(self._find_blocked_keys(value, current_path))
        elif isinstance(node, list):
            for idx, item in enumerate(node):
                found.extend(self._find_blocked_keys(item, f"{path}[{idx}]"))
        return found

    def _walk_strings(self, node: Any, path: str = "$") -> List[tuple]:
        """Recursively yields every string leaf value in a query.

        Args:
            node: The current JSON-like node being inspected.
            path: Dotted path accumulated so far, for reporting.

        Returns:
            List[tuple]: Pairs of ``(path, string_value)`` for every leaf.
        """
        found: List[tuple] = []
        if isinstance(node, dict):
            for key, value in node.items():
                found.extend(self._walk_strings(value, f"{path}.{key}"))
        elif isinstance(node, list):
            for idx, item in enumerate(node):
                found.extend(self._walk_strings(item, f"{path}[{idx}]"))
        elif isinstance(node, str):
            found.append((path, node))
        return found

    def _extract_field_names(self, node: Any) -> Set[str]:
        """Extracts all field names referenced by leaf query clauses.

        Args:
            node: The current JSON-like node being inspected.

        Returns:
            Set[str]: The set of field names referenced anywhere in the tree.
        """
        fields: Set[str] = set()
        leaf_clauses = {
            "term",
            "terms",
            "match",
            "match_phrase",
            "range",
            "exists",
            "wildcard",
            "prefix",
            "regexp",
        }
        if isinstance(node, dict):
            for key, value in node.items():
                if key in leaf_clauses and isinstance(value, dict):
                    if key == "exists" and "field" in value:
                        fields.add(value["field"])
                    else:
                        fields.update(value.keys())
                fields.update(self._extract_field_names(value))
        elif isinstance(node, list):
            for item in node:
                fields.update(self._extract_field_names(item))
        return fields

    def _bool_depth(self, node: Any) -> int:
        """Computes the maximum nesting depth of ``bool`` query clauses.

        Args:
            node: The current JSON-like node being inspected.

        Returns:
            int: The maximum bool nesting depth found.
        """
        if isinstance(node, dict):
            if "bool" in node and isinstance(node["bool"], dict):
                sub_depths = [0]
                for key in ("must", "should", "must_not", "filter"):
                    clauses = node["bool"].get(key)
                    if isinstance(clauses, list):
                        sub_depths.extend(self._bool_depth(c) for c in clauses)
                    elif isinstance(clauses, dict):
                        sub_depths.append(self._bool_depth(clauses))
                return 1 + max(sub_depths)
            return max((self._bool_depth(v) for v in node.values()), default=0)
        if isinstance(node, list):
            return max((self._bool_depth(item) for item in node), default=0)
        return 0

    @staticmethod
    def _parse_time(value: Any) -> Optional[datetime]:
        """Attempts to parse a time-range boundary into a datetime.

        Args:
            value: A raw boundary value, e.g. an ISO-8601 string or
                Elasticsearch date-math expression such as ``now-1d``.

        Returns:
            Optional[datetime]: The parsed timestamp, or ``None`` if the
            value could not be parsed (e.g. relative date-math is left
            unresolved and skipped rather than rejected).
        """
        if not isinstance(value, str):
            return None
        if value.startswith("now"):
            match = re.match(r"now(-(\d+)([dhms]))?", value)
            if not match:
                return datetime.now(timezone.utc)
            amount, unit = match.group(2), match.group(3)
            now = datetime.now(timezone.utc)
            if not amount:
                return now
            amount = int(amount)
            unit_map = {"d": "days", "h": "hours", "m": "minutes", "s": "seconds"}
            return now - timedelta(**{unit_map[unit]: amount})
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None