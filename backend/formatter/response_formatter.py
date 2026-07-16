"""Enterprise Unified Response Formatter for SIEM API responses.

This module implements :class:`ResponseFormatter`, which converts raw
Elasticsearch/Wazuh JSON payloads into a single, unified, frontend-ready
response object. It automatically detects the shape of the underlying data
(single metric, event list, aggregation, timeline, category distribution,
top-N rankings), and enriches the response with summaries, tables, severity
badges, charts, and investigation reports.

Typical usage example:

    formatter = ResponseFormatter()
    response = await formatter.format_response(raw_es_payload)
"""

from __future__ import annotations

import logging
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Union

from pydantic import BaseModel, ConfigDict, Field

from backend.ai.report_generator import (
    InvestigationReport,
    ReportGenerator,
    ReportGeneratorError,
)
from backend.formatter.chart_builder import (
    ChartBuilder,
    ChartBuilderError,
    ChartBuildResult,
    ChartType,
)

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

class ResponseFormatterConstants:
    """Centralized configuration constants for :class:`ResponseFormatter`.

    Attributes:
        DEFAULT_PAGE_SIZE: Default number of rows returned per page.
        MAX_PAGE_SIZE: Hard cap on rows returned per page.
        TOP_N_KEYS: Field names checked to detect "top N" style aggregations.
        TIMELINE_KEYS: Field names checked to detect time-bucketed data.
        REPORT_TRIGGER_MIN_EVENTS: Minimum event count required before an
            embedded :class:`~backend.ai.report_generator.InvestigationReport`
            is automatically generated for an event-list response.
    """

    DEFAULT_PAGE_SIZE: int = 25
    MAX_PAGE_SIZE: int = 500
    TOP_N_KEYS: Sequence[str] = ("source_ip", "user", "host", "country")
    TIMELINE_KEYS: Sequence[str] = ("timestamp", "@timestamp", "date")
    REPORT_TRIGGER_MIN_EVENTS: int = 5


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ResponseFormatterError(Exception):
    """Base exception for all :class:`ResponseFormatter` related errors."""


class SchemaDetectionError(ResponseFormatterError):
    """Raised when the shape of the raw input data cannot be classified."""


class InvalidPaginationError(ResponseFormatterError):
    """Raised when pagination parameters are out of valid bounds."""


class ResponseValidationError(ResponseFormatterError):
    """Raised when the final unified response fails structural validation."""


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ResponseSchemaType(str, Enum):
    """Classification of the detected shape of the raw input data."""

    SINGLE_METRIC = "single_metric"
    EVENT_LIST = "event_list"
    AGGREGATION = "aggregation"
    TIMELINE = "timeline"
    CATEGORY_DISTRIBUTION = "category_distribution"
    TOP_IPS = "top_ips"
    TOP_USERS = "top_users"
    TOP_HOSTS = "top_hosts"
    EMPTY = "empty"
    ERROR = "error"
    UNKNOWN = "unknown"


class SeverityBadge(str, Enum):
    """Severity badge levels surfaced to the frontend for quick triage."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class SortDirection(str, Enum):
    """Sort direction for tabular data."""

    ASC = "asc"
    DESC = "desc"


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class PaginationParams(BaseModel):
    """Pagination configuration applied to tabular response data.

    Attributes:
        page: 1-indexed page number to return.
        page_size: Number of rows per page.
    """

    page: int = Field(default=1, ge=1)
    page_size: int = Field(
        default=ResponseFormatterConstants.DEFAULT_PAGE_SIZE,
        ge=1,
        le=ResponseFormatterConstants.MAX_PAGE_SIZE,
    )


class SortParams(BaseModel):
    """Sorting configuration applied to tabular response data.

    Attributes:
        field: The field name to sort by.
        direction: The :class:`SortDirection` to apply.
    """

    field: str
    direction: SortDirection = SortDirection.DESC


class FilterParams(BaseModel):
    """Simple equality/range filters applied to raw event data prior to
    formatting.

    Attributes:
        equals: Mapping of field name to required exact value.
        contains: Mapping of field name to a required substring.
    """

    model_config = ConfigDict(extra="forbid")

    equals: Dict[str, Any] = Field(default_factory=dict)
    contains: Dict[str, str] = Field(default_factory=dict)


class TableColumn(BaseModel):
    """Definition of a single column within a formatted table.

    Attributes:
        key: The underlying data field key.
        label: The human-readable column header.
    """

    key: str
    label: str


class FormattedTable(BaseModel):
    """A paginated, sorted table ready for frontend rendering.

    Attributes:
        columns: Ordered list of :class:`TableColumn` definitions.
        rows: The current page of row data, each row a dict keyed by
            column key.
        total_rows: Total number of rows across all pages.
        page: The current page number.
        page_size: The number of rows per page.
    """

    columns: List[TableColumn] = Field(default_factory=list)
    rows: List[Dict[str, Any]] = Field(default_factory=list)
    total_rows: int = 0
    page: int = 1
    page_size: int = ResponseFormatterConstants.DEFAULT_PAGE_SIZE


class ResponseMetrics(BaseModel):
    """Key-value summary metrics surfaced alongside the main response body.

    Attributes:
        values: Arbitrary named metric values (counts, scores, rates).
    """

    values: Dict[str, Union[int, float, str]] = Field(default_factory=dict)


class UnifiedResponse(BaseModel):
    """The single unified response object returned to the frontend.

    Attributes:
        schema_type: The detected :class:`ResponseSchemaType`.
        summary: A short human-readable summary of the response contents.
        metrics: Computed :class:`ResponseMetrics`.
        table: An optional :class:`FormattedTable` of the underlying data.
        charts: Rendered :class:`~backend.formatter.chart_builder.ChartBuildResult`
            objects, keyed by section name.
        severity_badges: Distinct :class:`SeverityBadge` values present in
            the response.
        recommendations: Actionable recommendations, if applicable.
        warnings: Non-fatal warnings surfaced to the analyst.
        next_investigation_suggestions: Suggested follow-up investigative
            actions or queries.
        report: An optional embedded
            :class:`~backend.ai.report_generator.InvestigationReport`.
        error: Optional error message if ``schema_type`` is
            :attr:`ResponseSchemaType.ERROR`.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    schema_type: ResponseSchemaType
    summary: str = ""
    metrics: ResponseMetrics = Field(default_factory=ResponseMetrics)
    table: Optional[FormattedTable] = None
    charts: Dict[str, ChartBuildResult] = Field(default_factory=dict)
    severity_badges: List[SeverityBadge] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    next_investigation_suggestions: List[str] = Field(default_factory=list)
    report: Optional[InvestigationReport] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# ResponseFormatter
# ---------------------------------------------------------------------------

class ResponseFormatter:
    """Enterprise unified response formatter for SIEM API payloads.

    Detects the structural shape of raw Elasticsearch/Wazuh data and
    produces a single :class:`UnifiedResponse` enriched with summaries,
    metrics, tables, charts, severity badges, recommendations, warnings,
    and next-step investigation suggestions suitable for direct consumption
    by a React frontend.

    Attributes:
        chart_builder: The injected
            :class:`~backend.formatter.chart_builder.ChartBuilder`.
        report_generator: The injected
            :class:`~backend.ai.report_generator.ReportGenerator`.
    """

    def __init__(
        self,
        chart_builder: Optional[ChartBuilder] = None,
        report_generator: Optional[ReportGenerator] = None,
    ) -> None:
        """Initializes the formatter with its collaborators.

        Args:
            chart_builder: An optional
                :class:`~backend.formatter.chart_builder.ChartBuilder`
                instance. A default instance is created if omitted.
            report_generator: An optional
                :class:`~backend.ai.report_generator.ReportGenerator`
                instance. A default instance is created if omitted.
        """
        self.chart_builder = chart_builder or ChartBuilder()
        self.report_generator = report_generator or ReportGenerator(chart_builder=self.chart_builder)
        logger.info("ResponseFormatter initialized")

    # ------------------------------------------------------------------
    # Schema detection
    # ------------------------------------------------------------------

    def _detect_schema(self, data: Any) -> ResponseSchemaType:
        """Classifies the structural shape of the raw input data.

        Args:
            data: The raw Elasticsearch/Wazuh payload, which may be a dict,
                list, scalar, or ``None``.

        Returns:
            The detected :class:`ResponseSchemaType`.
        """
        if data is None:
            return ResponseSchemaType.EMPTY

        if isinstance(data, dict) and "error" in data:
            return ResponseSchemaType.ERROR

        if isinstance(data, (int, float, str)):
            return ResponseSchemaType.SINGLE_METRIC

        if isinstance(data, dict) and "value" in data and len(data) <= 3:
            return ResponseSchemaType.SINGLE_METRIC

        if isinstance(data, list):
            if not data:
                return ResponseSchemaType.EMPTY
            if not isinstance(data[0], dict):
                return ResponseSchemaType.CATEGORY_DISTRIBUTION

            sample_keys = set(data[0].keys())

            if any(key in sample_keys for key in ResponseFormatterConstants.TIMELINE_KEYS):
                return ResponseSchemaType.TIMELINE

            if {"source_ip", "count"}.issubset(sample_keys) or sample_keys == {"source_ip", "count"}:
                return ResponseSchemaType.TOP_IPS
            if {"user", "count"}.issubset(sample_keys):
                return ResponseSchemaType.TOP_USERS
            if {"host", "count"}.issubset(sample_keys):
                return ResponseSchemaType.TOP_HOSTS

            if {"category", "count"}.issubset(sample_keys) or {"label", "value"}.issubset(sample_keys):
                return ResponseSchemaType.CATEGORY_DISTRIBUTION

            if any(key in sample_keys for key in ("event_type", "message", "rule", "risk_score")):
                return ResponseSchemaType.EVENT_LIST

            if "count" in sample_keys or "value" in sample_keys:
                return ResponseSchemaType.AGGREGATION

            return ResponseSchemaType.EVENT_LIST

        logger.warning("Unable to classify response schema for data of type %s", type(data))
        return ResponseSchemaType.UNKNOWN

    # ------------------------------------------------------------------
    # Filtering, sorting, pagination
    # ------------------------------------------------------------------

    @staticmethod
    def _apply_filters(rows: List[Dict[str, Any]], filters: Optional[FilterParams]) -> List[Dict[str, Any]]:
        """Applies equality and substring filters to a list of row dicts.

        Args:
            rows: The raw row dictionaries.
            filters: Optional :class:`FilterParams` to apply.

        Returns:
            The filtered list of rows.
        """
        if filters is None:
            return rows

        filtered = rows
        for field_name, expected_value in filters.equals.items():
            filtered = [row for row in filtered if row.get(field_name) == expected_value]
        for field_name, substring in filters.contains.items():
            filtered = [row for row in filtered if substring.lower() in str(row.get(field_name, "")).lower()]
        return filtered

    @staticmethod
    def _apply_sort(rows: List[Dict[str, Any]], sort: Optional[SortParams]) -> List[Dict[str, Any]]:
        """Sorts a list of row dicts by a given field and direction.

        Args:
            rows: The row dictionaries to sort.
            sort: Optional :class:`SortParams` describing the sort field
                and direction.

        Returns:
            The sorted list of rows. Rows missing the sort field are
            ordered last.
        """
        if sort is None:
            return rows

        def _sort_key(row: Dict[str, Any]) -> tuple:
            value = row.get(sort.field)
            return (value is None, value if value is not None else "")

        return sorted(rows, key=_sort_key, reverse=(sort.direction == SortDirection.DESC))

    @staticmethod
    def _apply_pagination(rows: List[Dict[str, Any]], pagination: Optional[PaginationParams]) -> FormattedTable:
        """Paginates a list of row dicts into a :class:`FormattedTable`.

        Args:
            rows: The full (filtered, sorted) list of row dictionaries.
            pagination: Optional :class:`PaginationParams`; defaults applied
                if omitted.

        Returns:
            A :class:`FormattedTable` containing only the current page of
            rows alongside pagination metadata.

        Raises:
            InvalidPaginationError: If the requested page is out of range
                for a non-empty dataset.
        """
        pagination = pagination or PaginationParams()
        total_rows = len(rows)
        start = (pagination.page - 1) * pagination.page_size
        end = start + pagination.page_size

        if total_rows > 0 and start >= total_rows:
            raise InvalidPaginationError(
                f"Page {pagination.page} is out of range for {total_rows} total rows "
                f"with page_size={pagination.page_size}"
            )

        page_rows = rows[start:end]
        columns = (
            [TableColumn(key=key, label=key.replace("_", " ").title()) for key in rows[0].keys()]
            if rows
            else []
        )

        return FormattedTable(
            columns=columns,
            rows=page_rows,
            total_rows=total_rows,
            page=pagination.page,
            page_size=pagination.page_size,
        )

    # ------------------------------------------------------------------
    # Severity & recommendations
    # ------------------------------------------------------------------

    @staticmethod
    def _severity_badge_from_score(score: float) -> SeverityBadge:
        """Maps a numeric risk score to a :class:`SeverityBadge`.

        Args:
            score: The numeric risk score (0-100).

        Returns:
            The corresponding :class:`SeverityBadge`.
        """
        if score >= 90:
            return SeverityBadge.CRITICAL
        if score >= 70:
            return SeverityBadge.HIGH
        if score >= 40:
            return SeverityBadge.MEDIUM
        if score > 0:
            return SeverityBadge.LOW
        return SeverityBadge.INFORMATIONAL

    def _derive_severity_badges(self, rows: Sequence[Dict[str, Any]]) -> List[SeverityBadge]:
        """Derives the distinct set of severity badges present in the data.

        Args:
            rows: Row dictionaries, optionally containing a ``risk_score``
                key.

        Returns:
            A list of distinct :class:`SeverityBadge` values, ordered from
            most to least severe.
        """
        scores = [float(row["risk_score"]) for row in rows if isinstance(row, dict) and row.get("risk_score") is not None]
        if not scores:
            return []

        badges = {self._severity_badge_from_score(score) for score in scores}
        ordering = [
            SeverityBadge.CRITICAL,
            SeverityBadge.HIGH,
            SeverityBadge.MEDIUM,
            SeverityBadge.LOW,
            SeverityBadge.INFORMATIONAL,
        ]
        return [badge for badge in ordering if badge in badges]

    def _derive_next_investigation_suggestions(
        self, schema_type: ResponseSchemaType, rows: Sequence[Dict[str, Any]]
    ) -> List[str]:
        """Suggests plausible next investigative steps based on response shape.

        Args:
            schema_type: The detected :class:`ResponseSchemaType`.
            rows: The underlying row data.

        Returns:
            A list of suggested follow-up actions or queries.
        """
        suggestions: List[str] = []

        if schema_type == ResponseSchemaType.TOP_IPS and rows:
            top_ip = rows[0].get("source_ip")
            if top_ip:
                suggestions.append(f"Investigate all activity originating from {top_ip} over the last 24 hours.")
        if schema_type == ResponseSchemaType.TOP_USERS and rows:
            top_user = rows[0].get("user")
            if top_user:
                suggestions.append(f"Review authentication history and privilege changes for user '{top_user}'.")
        if schema_type == ResponseSchemaType.TOP_HOSTS and rows:
            top_host = rows[0].get("host")
            if top_host:
                suggestions.append(f"Check endpoint protection status and running processes on host '{top_host}'.")
        if schema_type == ResponseSchemaType.EVENT_LIST:
            suggestions.append("Correlate these events against known MITRE ATT&CK techniques for pattern confirmation.")
            suggestions.append("Generate a full investigation report to consolidate findings and timeline.")
        if schema_type == ResponseSchemaType.TIMELINE:
            suggestions.append("Overlay this timeline with authentication logs to identify the initial access vector.")

        return suggestions

    # ------------------------------------------------------------------
    # Metrics & summary
    # ------------------------------------------------------------------

    def _build_metrics(self, schema_type: ResponseSchemaType, data: Any, rows: Sequence[Dict[str, Any]]) -> ResponseMetrics:
        """Computes summary metrics appropriate to the detected schema type.

        Args:
            schema_type: The detected :class:`ResponseSchemaType`.
            data: The original raw input data.
            rows: The normalized row representation of the data.

        Returns:
            A populated :class:`ResponseMetrics` instance.
        """
        values: Dict[str, Union[int, float, str]] = {}

        if schema_type == ResponseSchemaType.SINGLE_METRIC:
            values["value"] = data if not isinstance(data, dict) else data.get("value", "")
        else:
            values["total_records"] = len(rows)
            risk_scores = [float(row["risk_score"]) for row in rows if isinstance(row, dict) and row.get("risk_score") is not None]
            if risk_scores:
                values["average_risk_score"] = round(sum(risk_scores) / len(risk_scores), 2)
                values["max_risk_score"] = max(risk_scores)

        return ResponseMetrics(values=values)

    def _build_summary(self, schema_type: ResponseSchemaType, rows: Sequence[Dict[str, Any]]) -> str:
        """Builds a short human-readable summary of the response contents.

        Args:
            schema_type: The detected :class:`ResponseSchemaType`.
            rows: The normalized row representation of the data.

        Returns:
            A one-sentence summary string.
        """
        count = len(rows)
        summaries = {
            ResponseSchemaType.SINGLE_METRIC: "A single metric value was returned.",
            ResponseSchemaType.EVENT_LIST: f"{count} matching security events were found.",
            ResponseSchemaType.AGGREGATION: f"{count} aggregated buckets were returned.",
            ResponseSchemaType.TIMELINE: f"{count} time-bucketed data points were returned.",
            ResponseSchemaType.CATEGORY_DISTRIBUTION: f"{count} categories were identified in the distribution.",
            ResponseSchemaType.TOP_IPS: f"Top {count} source IP addresses ranked by event count.",
            ResponseSchemaType.TOP_USERS: f"Top {count} user accounts ranked by event count.",
            ResponseSchemaType.TOP_HOSTS: f"Top {count} hosts ranked by event count.",
            ResponseSchemaType.EMPTY: "No data was returned for this query.",
            ResponseSchemaType.ERROR: "The query resulted in an error.",
            ResponseSchemaType.UNKNOWN: "The response schema could not be automatically classified.",
        }
        return summaries.get(schema_type, "Response formatted successfully.")

    # ------------------------------------------------------------------
    # Chart integration
    # ------------------------------------------------------------------

    def _build_charts(self, schema_type: ResponseSchemaType, rows: Sequence[Dict[str, Any]]) -> Dict[str, ChartBuildResult]:
        """Automatically builds charts appropriate to the detected schema type.

        Args:
            schema_type: The detected :class:`ResponseSchemaType`.
            rows: The normalized row representation of the data.

        Returns:
            A dictionary of section-name to :class:`ChartBuildResult`. Empty
            if no chart is applicable or chart generation fails.
        """
        if not rows or schema_type in (ResponseSchemaType.SINGLE_METRIC, ResponseSchemaType.EMPTY, ResponseSchemaType.ERROR):
            return {}

        chart_hint_map = {
            ResponseSchemaType.TOP_IPS: ("top source ips", "source_ip"),
            ResponseSchemaType.TOP_USERS: ("top users", "user"),
            ResponseSchemaType.TOP_HOSTS: ("top hosts", "host"),
            ResponseSchemaType.CATEGORY_DISTRIBUTION: ("distribution", "category"),
            ResponseSchemaType.TIMELINE: ("trend over time", "timestamp"),
        }

        if schema_type not in chart_hint_map:
            return {}

        hint, label_key = chart_hint_map[schema_type]
        count_key = "count" if any("count" in row for row in rows) else "value"
        label_key = label_key if any(label_key in row for row in rows) else next(iter(rows[0].keys()))

        try:
            chart_data = [{"label": row.get(label_key), "value": row.get(count_key, 0)} for row in rows]
            figure = self.chart_builder.auto_chart(chart_data, hint=hint)
            inferred_chart_type = ChartType.TIMELINE if schema_type == ResponseSchemaType.TIMELINE else (
                ChartType.PIE if schema_type == ResponseSchemaType.CATEGORY_DISTRIBUTION else ChartType.HORIZONTAL_BAR
            )
            result = self.chart_builder.build_result(
                figure,
                chart_type=inferred_chart_type,
                title=hint.title(),
            )
            return {"primary": result}
        except ChartBuilderError as exc:
            logger.warning("Chart generation skipped due to error: %s", exc)
            return {}

    # ------------------------------------------------------------------
    # Normalization
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_to_rows(data: Any, schema_type: ResponseSchemaType) -> List[Dict[str, Any]]:
        """Normalizes heterogeneous raw input data into a uniform row list.

        Args:
            data: The raw Elasticsearch/Wazuh payload.
            schema_type: The previously detected :class:`ResponseSchemaType`.

        Returns:
            A list of dictionaries representing tabular rows. Empty for
            schema types that are not row-oriented.
        """
        if schema_type in (ResponseSchemaType.EMPTY, ResponseSchemaType.ERROR, ResponseSchemaType.SINGLE_METRIC):
            return []
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        return []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def format_response(
        self,
        raw_data: Any,
        filters: Optional[FilterParams] = None,
        sort: Optional[SortParams] = None,
        pagination: Optional[PaginationParams] = None,
        include_report: bool = True,
    ) -> UnifiedResponse:
        """Formats raw Elasticsearch/Wazuh JSON into a unified frontend response.

        Args:
            raw_data: The raw payload returned by Elasticsearch or Wazuh.
            filters: Optional :class:`FilterParams` to apply prior to
                sorting and pagination.
            sort: Optional :class:`SortParams` describing how to order rows.
            pagination: Optional :class:`PaginationParams` controlling page
                size and offset.
            include_report: Whether to automatically attach a full
                :class:`~backend.ai.report_generator.InvestigationReport`
                when the response is a sufficiently large event list.

        Returns:
            A fully populated :class:`UnifiedResponse`.

        Raises:
            InvalidPaginationError: If pagination parameters are out of
                range for the resulting dataset.
        """
        schema_type = self._detect_schema(raw_data)
        logger.info("Detected response schema type: %s", schema_type.value)

        if schema_type == ResponseSchemaType.ERROR:
            error_message = raw_data.get("error", "Unknown error") if isinstance(raw_data, dict) else str(raw_data)
            return UnifiedResponse(
                schema_type=schema_type,
                summary="The upstream query returned an error.",
                error=str(error_message),
                warnings=[f"Upstream error encountered: {error_message}"],
            )

        if schema_type == ResponseSchemaType.EMPTY:
            return UnifiedResponse(
                schema_type=schema_type,
                summary="No data was returned for this query.",
                warnings=["The query returned zero results. Consider broadening the time range or filters."],
            )

        rows = self._normalize_to_rows(raw_data, schema_type)
        rows = self._apply_filters(rows, filters)
        rows = self._apply_sort(rows, sort)

        table: Optional[FormattedTable] = None
        if rows:
            table = self._apply_pagination(rows, pagination)

        metrics = self._build_metrics(schema_type, raw_data, rows)
        summary = self._build_summary(schema_type, rows)
        severity_badges = self._derive_severity_badges(rows)
        suggestions = self._derive_next_investigation_suggestions(schema_type, rows)
        charts = self._build_charts(schema_type, rows)

        recommendations: List[str] = []
        report: Optional[InvestigationReport] = None
        if (
            include_report
            and schema_type == ResponseSchemaType.EVENT_LIST
            and len(rows) >= ResponseFormatterConstants.REPORT_TRIGGER_MIN_EVENTS
        ):
            try:
                report = await self.report_generator.generate_report(rows)
                recommendations = report.recommendations
            except ReportGeneratorError as exc:
                logger.warning("Automatic report generation skipped due to error: %s", exc)

        return UnifiedResponse(
            schema_type=schema_type,
            summary=summary,
            metrics=metrics,
            table=table,
            charts=charts,
            severity_badges=severity_badges,
            recommendations=recommendations,
            warnings=[],
            next_investigation_suggestions=suggestions,
            report=report,
        )