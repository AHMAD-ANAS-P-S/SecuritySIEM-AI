"""Enterprise Cybersecurity Investigation Report Generator.

This module implements :class:`ReportGenerator`, which transforms raw SIEM
event data into a professional, multi-format investigation report. It
computes statistics, builds MITRE ATT&CK mappings, generates recommendations,
renders charts via :class:`~backend.formatter.chart_builder.ChartBuilder`,
and optionally delegates executive-summary drafting to an LLM abstraction.

Typical usage example:

    generator = ReportGenerator(llm_client=my_llm_client)
    report = await generator.generate_report(raw_siem_events)
    html = generator.export_html(report)
"""

from __future__ import annotations

import logging
import statistics
from abc import ABC, abstractmethod
from collections import Counter
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol, Sequence

from jinja2 import BaseLoader, Environment, TemplateError, select_autoescape
from pydantic import BaseModel, ConfigDict, Field

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

class ReportGeneratorConstants:
    """Centralized configuration constants for :class:`ReportGenerator`.

    Attributes:
        TOP_N_DEFAULT: Default number of entities included in "top N"
            sections (attackers, users, hosts, countries).
        SEVERITY_THRESHOLDS: Risk-score cutoffs mapping to
            :class:`SeverityLevel` values.
        DEFAULT_LLM_TIMEOUT_SECONDS: Timeout applied to LLM summary calls.
    """

    TOP_N_DEFAULT: int = 10
    SEVERITY_THRESHOLDS: Dict[str, int] = {
        "critical": 90,
        "high": 70,
        "medium": 40,
        "low": 0,
    }
    DEFAULT_LLM_TIMEOUT_SECONDS: float = 30.0


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ReportGeneratorError(Exception):
    """Base exception for all :class:`ReportGenerator` related errors."""


class InvalidSIEMDataError(ReportGeneratorError):
    """Raised when the raw SIEM input data is empty or structurally invalid."""


class ReportRenderingError(ReportGeneratorError):
    """Raised when Jinja2 template rendering fails."""


class ReportExportError(ReportGeneratorError):
    """Raised when exporting a report to a target format fails."""


class LLMSummaryError(ReportGeneratorError):
    """Raised when LLM-backed executive summary generation fails."""


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SeverityLevel(str, Enum):
    """Overall investigation severity classification."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ReportExportFormat(str, Enum):
    """Supported output formats for a generated report."""

    HTML = "html"
    MARKDOWN = "markdown"
    JSON = "json"
    PDF = "pdf"


# ---------------------------------------------------------------------------
# LLM Abstraction
# ---------------------------------------------------------------------------

class LLMClient(Protocol):
    """Protocol describing the minimal async LLM client interface required
    by :class:`ReportGenerator` for executive summary generation.

    Any OpenAI or Azure OpenAI SDK wrapper satisfying this interface can be
    injected into :class:`ReportGenerator` without modification.
    """

    async def complete(self, prompt: str, *, max_tokens: int = 512, temperature: float = 0.2) -> str:
        """Generates a completion for the given prompt.

        Args:
            prompt: The fully-formed prompt to send to the model.
            max_tokens: Maximum number of tokens to generate.
            temperature: Sampling temperature.

        Returns:
            The generated text completion.
        """
        ...


class NullLLMClient:
    """Fallback LLM client used when no real client is injected.

    Produces a deterministic, template-based executive summary instead of
    calling out to an external model, ensuring :class:`ReportGenerator`
    remains fully functional without an LLM dependency configured.
    """

    async def complete(self, prompt: str, *, max_tokens: int = 512, temperature: float = 0.2) -> str:
        """Returns a static placeholder acknowledging the given prompt context.

        Args:
            prompt: The prompt that would have been sent to a real model.
            max_tokens: Ignored; present to satisfy the :class:`LLMClient`
                protocol.
            temperature: Ignored; present to satisfy the :class:`LLMClient`
                protocol.

        Returns:
            A deterministic textual summary derived from the prompt length.
        """
        logger.warning("NullLLMClient in use: no LLM configured for executive summary generation")
        return (
            "Automated executive summary is unavailable because no LLM client was "
            "configured. Please review the statistics, timeline, and findings "
            "sections below for full investigation details."
        )


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class TimelineEntry(BaseModel):
    """A single chronological entry in the investigation timeline.

    Attributes:
        timestamp: ISO-8601 timestamp of the event.
        description: Human-readable description of what occurred.
        severity: The :class:`SeverityLevel` of this specific event.
        source_ip: Source IP address associated with the event, if any.
    """

    timestamp: str
    description: str
    severity: SeverityLevel = SeverityLevel.LOW
    source_ip: Optional[str] = None


class EntityCount(BaseModel):
    """A generic entity-to-frequency pairing used in top-N rankings.

    Attributes:
        entity: The entity identifier (IP, username, hostname, country).
        count: Number of occurrences observed.
    """

    entity: str
    count: int


class MitreMapping(BaseModel):
    """A single MITRE ATT&CK technique correlated to observed activity.

    Attributes:
        technique_id: The MITRE ATT&CK technique identifier (e.g. "T1110").
        technique_name: Human-readable technique name.
        occurrences: Number of events mapped to this technique.
    """

    technique_id: str
    technique_name: str = ""
    occurrences: int = 0


class ReportStatistics(BaseModel):
    """Aggregate statistics computed from the raw SIEM event set.

    Attributes:
        total_events: Total number of events analyzed.
        unique_source_ips: Count of distinct source IP addresses.
        unique_users: Count of distinct user accounts observed.
        unique_hosts: Count of distinct hosts observed.
        average_risk_score: Mean risk score across all scored events.
        max_risk_score: Highest observed risk score.
        events_per_severity: Count of events grouped by severity level.
    """

    total_events: int
    unique_source_ips: int
    unique_users: int
    unique_hosts: int
    average_risk_score: float
    max_risk_score: float
    events_per_severity: Dict[str, int] = Field(default_factory=dict)


class InvestigationReport(BaseModel):
    """The complete structured investigation report.

    Attributes:
        report_id: Unique identifier for this report instance.
        generated_at: ISO-8601 UTC timestamp of report generation.
        executive_summary: LLM- or template-generated narrative summary.
        findings: List of key investigation findings.
        timeline: Chronological list of :class:`TimelineEntry` items.
        attack_summary: Short description of the overall attack pattern.
        top_attackers: Ranked list of top attacking IPs.
        affected_users: Ranked list of most-affected user accounts.
        affected_hosts: Ranked list of most-affected hosts.
        top_countries: Ranked list of top source countries.
        risk_score: Overall computed risk score (0-100).
        severity: Overall :class:`SeverityLevel` of the investigation.
        mitre_mappings: Correlated MITRE ATT&CK technique mappings.
        recommendations: Actionable remediation recommendations.
        conclusion: Closing narrative summarizing the investigation.
        statistics: Computed :class:`ReportStatistics`.
        charts: Rendered :class:`~backend.formatter.chart_builder.ChartBuildResult`
            objects, keyed by section name.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    report_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    executive_summary: str = ""
    findings: List[str] = Field(default_factory=list)
    timeline: List[TimelineEntry] = Field(default_factory=list)
    attack_summary: str = ""
    top_attackers: List[EntityCount] = Field(default_factory=list)
    affected_users: List[EntityCount] = Field(default_factory=list)
    affected_hosts: List[EntityCount] = Field(default_factory=list)
    top_countries: List[EntityCount] = Field(default_factory=list)
    risk_score: float = 0.0
    severity: SeverityLevel = SeverityLevel.LOW
    mitre_mappings: List[MitreMapping] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    conclusion: str = ""
    statistics: Optional[ReportStatistics] = None
    charts: Dict[str, ChartBuildResult] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Jinja2 Templates (embedded, no external template files required)
# ---------------------------------------------------------------------------

_HTML_REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Security Investigation Report - {{ report.report_id }}</title>
<style>
body { font-family: 'Inter', 'Segoe UI', sans-serif; background:#0f1117; color:#e6e9ef; margin:0; padding:2rem; }
h1, h2 { color:#5B8DEF; }
.section { margin-bottom: 2rem; padding: 1rem 1.5rem; background:#161923; border-radius:8px; }
.badge { display:inline-block; padding:0.25rem 0.75rem; border-radius:12px; font-weight:600; }
.badge-critical { background:#D7263D; }
.badge-high { background:#F45B69; }
.badge-medium { background:#F7B32B; color:#111; }
.badge-low { background:#2EC4B6; color:#111; }
table { width:100%; border-collapse:collapse; margin-top:0.5rem; }
th, td { text-align:left; padding:0.4rem 0.6rem; border-bottom:1px solid #242836; }
</style>
</head>
<body>
<h1>Security Investigation Report</h1>
<p>Report ID: {{ report.report_id }} &middot; Generated: {{ report.generated_at }}</p>

<div class="section">
<h2>Executive Summary</h2>
<p>{{ report.executive_summary }}</p>
<span class="badge badge-{{ report.severity.value }}">{{ report.severity.value | upper }}</span>
<span>Risk Score: {{ "%.1f"|format(report.risk_score) }}/100</span>
</div>

<div class="section">
<h2>Attack Summary</h2>
<p>{{ report.attack_summary }}</p>
</div>

<div class="section">
<h2>Key Findings</h2>
<ul>
{% for finding in report.findings %}<li>{{ finding }}</li>{% endfor %}
</ul>
</div>

<div class="section">
<h2>Timeline</h2>
<table>
<tr><th>Timestamp</th><th>Description</th><th>Severity</th><th>Source IP</th></tr>
{% for entry in report.timeline %}
<tr><td>{{ entry.timestamp }}</td><td>{{ entry.description }}</td><td>{{ entry.severity.value }}</td><td>{{ entry.source_ip or "-" }}</td></tr>
{% endfor %}
</table>
</div>

<div class="section">
<h2>Top Attackers</h2>
<table><tr><th>Source IP</th><th>Events</th></tr>
{% for item in report.top_attackers %}<tr><td>{{ item.entity }}</td><td>{{ item.count }}</td></tr>{% endfor %}
</table>
</div>

<div class="section">
<h2>Affected Users</h2>
<table><tr><th>User</th><th>Events</th></tr>
{% for item in report.affected_users %}<tr><td>{{ item.entity }}</td><td>{{ item.count }}</td></tr>{% endfor %}
</table>
</div>

<div class="section">
<h2>Affected Hosts</h2>
<table><tr><th>Host</th><th>Events</th></tr>
{% for item in report.affected_hosts %}<tr><td>{{ item.entity }}</td><td>{{ item.count }}</td></tr>{% endfor %}
</table>
</div>

<div class="section">
<h2>Top Countries</h2>
<table><tr><th>Country</th><th>Events</th></tr>
{% for item in report.top_countries %}<tr><td>{{ item.entity }}</td><td>{{ item.count }}</td></tr>{% endfor %}
</table>
</div>

<div class="section">
<h2>MITRE ATT&amp;CK Mapping</h2>
<table><tr><th>Technique</th><th>Name</th><th>Occurrences</th></tr>
{% for mapping in report.mitre_mappings %}<tr><td>{{ mapping.technique_id }}</td><td>{{ mapping.technique_name }}</td><td>{{ mapping.occurrences }}</td></tr>{% endfor %}
</table>
</div>

<div class="section">
<h2>Statistics</h2>
{% if report.statistics %}
<ul>
<li>Total Events: {{ report.statistics.total_events }}</li>
<li>Unique Source IPs: {{ report.statistics.unique_source_ips }}</li>
<li>Unique Users: {{ report.statistics.unique_users }}</li>
<li>Unique Hosts: {{ report.statistics.unique_hosts }}</li>
<li>Average Risk Score: {{ "%.1f"|format(report.statistics.average_risk_score) }}</li>
<li>Max Risk Score: {{ "%.1f"|format(report.statistics.max_risk_score) }}</li>
</ul>
{% endif %}
</div>

<div class="section">
<h2>Recommendations</h2>
<ul>
{% for rec in report.recommendations %}<li>{{ rec }}</li>{% endfor %}
</ul>
</div>

<div class="section">
<h2>Conclusion</h2>
<p>{{ report.conclusion }}</p>
</div>

</body>
</html>
""".strip()

_MARKDOWN_REPORT_TEMPLATE = """
# Security Investigation Report

**Report ID:** {{ report.report_id }}
**Generated:** {{ report.generated_at }}
**Severity:** {{ report.severity.value | upper }}
**Risk Score:** {{ "%.1f"|format(report.risk_score) }}/100

## Executive Summary
{{ report.executive_summary }}

## Attack Summary
{{ report.attack_summary }}

## Key Findings
{% for finding in report.findings %}- {{ finding }}
{% endfor %}

## Timeline
| Timestamp | Description | Severity | Source IP |
|---|---|---|---|
{% for entry in report.timeline %}| {{ entry.timestamp }} | {{ entry.description }} | {{ entry.severity.value }} | {{ entry.source_ip or "-" }} |
{% endfor %}

## Top Attackers
| Source IP | Events |
|---|---|
{% for item in report.top_attackers %}| {{ item.entity }} | {{ item.count }} |
{% endfor %}

## Affected Users
| User | Events |
|---|---|
{% for item in report.affected_users %}| {{ item.entity }} | {{ item.count }} |
{% endfor %}

## Affected Hosts
| Host | Events |
|---|---|
{% for item in report.affected_hosts %}| {{ item.entity }} | {{ item.count }} |
{% endfor %}

## Top Countries
| Country | Events |
|---|---|
{% for item in report.top_countries %}| {{ item.entity }} | {{ item.count }} |
{% endfor %}

## MITRE ATT&CK Mapping
| Technique | Name | Occurrences |
|---|---|---|
{% for mapping in report.mitre_mappings %}| {{ mapping.technique_id }} | {{ mapping.technique_name }} | {{ mapping.occurrences }} |
{% endfor %}

## Statistics
{% if report.statistics %}
- Total Events: {{ report.statistics.total_events }}
- Unique Source IPs: {{ report.statistics.unique_source_ips }}
- Unique Users: {{ report.statistics.unique_users }}
- Unique Hosts: {{ report.statistics.unique_hosts }}
- Average Risk Score: {{ "%.1f"|format(report.statistics.average_risk_score) }}
- Max Risk Score: {{ "%.1f"|format(report.statistics.max_risk_score) }}
{% endif %}

## Recommendations
{% for rec in report.recommendations %}- {{ rec }}
{% endfor %}

## Conclusion
{{ report.conclusion }}
""".strip()


# ---------------------------------------------------------------------------
# ReportGenerator
# ---------------------------------------------------------------------------

class ReportGenerator:
    """Enterprise cybersecurity investigation report generator.

    Converts raw SIEM event data (Elasticsearch/Wazuh JSON) into a fully
    structured :class:`InvestigationReport`, with support for HTML,
    Markdown, JSON, and PDF export, embedded chart generation, and optional
    LLM-backed executive summaries.

    Attributes:
        llm_client: The injected :class:`LLMClient` used for executive
            summary generation.
        chart_builder: The injected
            :class:`~backend.formatter.chart_builder.ChartBuilder` instance.
    """

    def __init__(
        self,
        llm_client: Optional[LLMClient] = None,
        chart_builder: Optional[ChartBuilder] = None,
        top_n: int = ReportGeneratorConstants.TOP_N_DEFAULT,
    ) -> None:
        """Initializes the report generator with its collaborators.

        Args:
            llm_client: An object implementing the :class:`LLMClient`
                protocol. Falls back to :class:`NullLLMClient` if omitted.
            chart_builder: An optional
                :class:`~backend.formatter.chart_builder.ChartBuilder`
                instance. A default instance is created if omitted.
            top_n: Default number of entities included in top-N rankings.
        """
        self.llm_client: LLMClient = llm_client or NullLLMClient()
        self.chart_builder = chart_builder or ChartBuilder()
        self.top_n = top_n
        self._jinja_env = Environment(
            loader=BaseLoader(),
            autoescape=select_autoescape(enabled_extensions=("html",), default_for_string=False),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        logger.info("ReportGenerator initialized (top_n=%d)", top_n)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_events(events: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validates that the raw SIEM event list is non-empty and list-like.

        Args:
            events: The raw SIEM event records.

        Returns:
            The validated list of event dictionaries.

        Raises:
            InvalidSIEMDataError: If ``events`` is empty or not a sequence
                of dictionaries.
        """
        if not events:
            raise InvalidSIEMDataError("Raw SIEM event data must not be empty")
        if not all(isinstance(event, dict) for event in events):
            raise InvalidSIEMDataError("Every SIEM event must be a JSON object (dict)")
        return list(events)

    @staticmethod
    def _severity_from_score(score: float) -> SeverityLevel:
        """Maps a numeric risk score to a :class:`SeverityLevel`.

        Args:
            score: The numeric risk score (0-100).

        Returns:
            The corresponding :class:`SeverityLevel`.
        """
        thresholds = ReportGeneratorConstants.SEVERITY_THRESHOLDS
        if score >= thresholds["critical"]:
            return SeverityLevel.CRITICAL
        if score >= thresholds["high"]:
            return SeverityLevel.HIGH
        if score >= thresholds["medium"]:
            return SeverityLevel.MEDIUM
        return SeverityLevel.LOW

    @staticmethod
    def _top_n_counter(values: Sequence[Optional[str]], limit: int) -> List[EntityCount]:
        """Builds a ranked top-N :class:`EntityCount` list from raw values.

        Args:
            values: Raw entity values (may include ``None``, which is
                filtered out).
            limit: Maximum number of ranked entities to return.

        Returns:
            A list of :class:`EntityCount`, most frequent first.
        """
        filtered = [value for value in values if value]
        counter = Counter(filtered)
        return [EntityCount(entity=entity, count=count) for entity, count in counter.most_common(limit)]

    def generate_statistics(self, events: Sequence[Dict[str, Any]]) -> ReportStatistics:
        """Computes aggregate statistics from raw SIEM events.

        Args:
            events: Raw SIEM event records.

        Returns:
            A populated :class:`ReportStatistics` instance.

        Raises:
            InvalidSIEMDataError: If the events are empty or malformed.
        """
        validated = self._validate_events(events)

        source_ips = {event.get("source_ip") for event in validated if event.get("source_ip")}
        users = {event.get("user") for event in validated if event.get("user")}
        hosts = {event.get("host") for event in validated if event.get("host")}
        risk_scores = [float(event["risk_score"]) for event in validated if event.get("risk_score") is not None]

        severity_counts: Dict[str, int] = {}
        for event in validated:
            score = float(event.get("risk_score", 0) or 0)
            severity = self._severity_from_score(score).value
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        return ReportStatistics(
            total_events=len(validated),
            unique_source_ips=len(source_ips),
            unique_users=len(users),
            unique_hosts=len(hosts),
            average_risk_score=round(statistics.fmean(risk_scores), 2) if risk_scores else 0.0,
            max_risk_score=max(risk_scores) if risk_scores else 0.0,
            events_per_severity=severity_counts,
        )

    def generate_charts(self, events: Sequence[Dict[str, Any]]) -> Dict[str, ChartBuildResult]:
        """Generates the standard chart set for an investigation report.

        Args:
            events: Raw SIEM event records.

        Returns:
            A dictionary of section-name to :class:`ChartBuildResult`.

        Raises:
            InvalidSIEMDataError: If the events are empty or malformed.
        """
        validated = self._validate_events(events)
        charts: Dict[str, ChartBuildResult] = {}

        top_attackers = self._top_n_counter([event.get("source_ip") for event in validated], self.top_n)
        if top_attackers:
            try:
                figure = self.chart_builder.horizontal_bar_chart(
                    [{"label": item.entity, "value": item.count} for item in top_attackers],
                    title="Top Attacking IPs",
                )
                charts["top_attackers"] = self.chart_builder.build_result(
                    figure, ChartType.HORIZONTAL_BAR, "Top Attacking IPs"
                )
            except ChartBuilderError as exc:
                logger.warning("Failed to build top_attackers chart: %s", exc)

        severity_counter = Counter(
            self._severity_from_score(float(event.get("risk_score", 0) or 0)).value for event in validated
        )
        if severity_counter:
            try:
                figure = self.chart_builder.pie_chart(
                    [{"label": sev, "value": count} for sev, count in severity_counter.items()],
                    title="Severity Distribution",
                )
                charts["severity_distribution"] = self.chart_builder.build_result(
                    figure, ChartType.PIE, "Severity Distribution"
                )
            except ChartBuilderError as exc:
                logger.warning("Failed to build severity_distribution chart: %s", exc)

        timestamped = [event for event in validated if event.get("timestamp")]
        if timestamped:
            try:
                timeline_bucket = Counter(str(event["timestamp"])[:13] for event in timestamped)
                ordered = sorted(timeline_bucket.items())
                figure = self.chart_builder.line_chart(
                    [{"label": bucket, "value": count} for bucket, count in ordered],
                    title="Event Volume Over Time",
                )
                charts["event_volume_trend"] = self.chart_builder.build_result(
                    figure, ChartType.LINE, "Event Volume Over Time"
                )
            except ChartBuilderError as exc:
                logger.warning("Failed to build event_volume_trend chart: %s", exc)

        return charts

    def generate_recommendations(self, events: Sequence[Dict[str, Any]], severity: SeverityLevel) -> List[str]:
        """Derives actionable remediation recommendations from event data.

        Args:
            events: Raw SIEM event records.
            severity: The overall :class:`SeverityLevel` of the investigation.

        Returns:
            A list of recommendation strings.
        """
        validated = self._validate_events(events)
        recommendations: List[str] = []

        event_types = {str(event.get("event_type", "")).lower() for event in validated}

        if "brute_force" in event_types or "failed_login" in event_types:
            recommendations.append(
                "Enforce account lockout policies and enable multi-factor authentication for all affected accounts."
            )
        if "credential_dumping" in event_types:
            recommendations.append(
                "Isolate affected hosts immediately and rotate credentials for any accounts active on those systems."
            )
        if "lateral_movement" in event_types:
            recommendations.append(
                "Review network segmentation and restrict unnecessary east-west traffic between affected segments."
            )
        if "phishing" in event_types:
            recommendations.append(
                "Conduct targeted security awareness training and review email gateway filtering rules."
            )
        if "malware" in event_types or "ransomware" in event_types:
            recommendations.append(
                "Initiate endpoint isolation, run full antimalware scans, and validate backup integrity before restoration."
            )

        if severity in (SeverityLevel.CRITICAL, SeverityLevel.HIGH):
            recommendations.append(
                "Escalate to the incident response team and consider activating the formal incident response plan."
            )

        if not recommendations:
            recommendations.append(
                "Continue routine monitoring; no immediate remediation actions are required based on current findings."
            )

        return recommendations

    def _build_mitre_mappings(self, events: Sequence[Dict[str, Any]]) -> List[MitreMapping]:
        """Aggregates MITRE ATT&CK technique occurrences from raw events.

        Args:
            events: Raw SIEM event records, each optionally containing a
                ``mitre_technique_id`` and ``mitre_technique_name`` field.

        Returns:
            A list of :class:`MitreMapping`, most frequent first.
        """
        counter: Counter = Counter()
        names: Dict[str, str] = {}
        for event in events:
            technique_id = event.get("mitre_technique_id")
            if not technique_id:
                continue
            counter[technique_id] += 1
            if event.get("mitre_technique_name"):
                names[technique_id] = event["mitre_technique_name"]

        return [
            MitreMapping(technique_id=technique_id, technique_name=names.get(technique_id, ""), occurrences=count)
            for technique_id, count in counter.most_common()
        ]

    def _build_timeline(self, events: Sequence[Dict[str, Any]], limit: int = 50) -> List[TimelineEntry]:
        """Builds a chronological timeline from raw events.

        Args:
            events: Raw SIEM event records.
            limit: Maximum number of timeline entries to include.

        Returns:
            A list of :class:`TimelineEntry`, ordered chronologically.
        """
        timestamped = [event for event in events if event.get("timestamp")]
        ordered = sorted(timestamped, key=lambda event: str(event["timestamp"]))[:limit]

        entries: List[TimelineEntry] = []
        for event in ordered:
            score = float(event.get("risk_score", 0) or 0)
            entries.append(
                TimelineEntry(
                    timestamp=str(event["timestamp"]),
                    description=str(event.get("description") or event.get("event_type", "Unknown event")),
                    severity=self._severity_from_score(score),
                    source_ip=event.get("source_ip"),
                )
            )
        return entries

    async def generate_summary(self, events: Sequence[Dict[str, Any]], statistics_data: ReportStatistics) -> str:
        """Generates an executive summary narrative via the configured LLM.

        Args:
            events: Raw SIEM event records.
            statistics_data: Precomputed :class:`ReportStatistics`.

        Returns:
            The generated executive summary text.

        Raises:
            LLMSummaryError: If the LLM call fails.
        """
        prompt = (
            "You are a senior SOC analyst. Write a concise, professional executive "
            "summary (3-5 sentences) for a security investigation report based on "
            f"the following statistics: total_events={statistics_data.total_events}, "
            f"unique_source_ips={statistics_data.unique_source_ips}, "
            f"unique_users={statistics_data.unique_users}, "
            f"unique_hosts={statistics_data.unique_hosts}, "
            f"average_risk_score={statistics_data.average_risk_score}, "
            f"max_risk_score={statistics_data.max_risk_score}, "
            f"severity_breakdown={statistics_data.events_per_severity}. "
            "Focus on business impact and urgency, avoid raw jargon dumps."
        )
        try:
            return await self.llm_client.complete(prompt, max_tokens=400, temperature=0.2)
        except Exception as exc:  # noqa: BLE001 - normalized to domain error
            logger.error("LLM executive summary generation failed: %s", exc)
            raise LLMSummaryError(f"Failed to generate executive summary: {exc}") from exc

    # ------------------------------------------------------------------
    # Report generation orchestration
    # ------------------------------------------------------------------

    async def generate_report(self, raw_siem_data: Sequence[Dict[str, Any]], report_id: Optional[str] = None) -> InvestigationReport:
        """Generates a complete :class:`InvestigationReport` from raw SIEM data.

        Args:
            raw_siem_data: Raw Elasticsearch/Wazuh event records.
            report_id: Optional explicit report identifier; a timestamp-based
                id is generated if omitted.

        Returns:
            The fully populated :class:`InvestigationReport`.

        Raises:
            InvalidSIEMDataError: If the input data is empty or malformed.
        """
        validated = self._validate_events(raw_siem_data)
        report_id = report_id or f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

        stats = self.generate_statistics(validated)
        overall_severity = self._severity_from_score(stats.max_risk_score)
        charts = self.generate_charts(validated)
        recommendations = self.generate_recommendations(validated, overall_severity)
        mitre_mappings = self._build_mitre_mappings(validated)
        timeline = self._build_timeline(validated)

        top_attackers = self._top_n_counter([event.get("source_ip") for event in validated], self.top_n)
        affected_users = self._top_n_counter([event.get("user") for event in validated], self.top_n)
        affected_hosts = self._top_n_counter([event.get("host") for event in validated], self.top_n)
        top_countries = self._top_n_counter([event.get("country") for event in validated], self.top_n)

        try:
            executive_summary = await self.generate_summary(validated, stats)
        except LLMSummaryError:
            executive_summary = (
                f"Investigation of {stats.total_events} events across {stats.unique_hosts} hosts "
                f"and {stats.unique_users} user accounts, with an average risk score of "
                f"{stats.average_risk_score}."
            )

        event_types = Counter(str(event.get("event_type", "unknown")) for event in validated)
        attack_summary = (
            f"The investigation identified {stats.total_events} events, predominantly "
            f"classified as {', '.join(t for t, _ in event_types.most_common(3))}. "
            f"Overall severity is assessed as {overall_severity.value}."
        )

        findings = [
            f"{stats.total_events} total events analyzed across {stats.unique_hosts} hosts.",
            f"{stats.unique_source_ips} distinct source IP addresses observed.",
            f"Average risk score of {stats.average_risk_score} with a peak of {stats.max_risk_score}.",
        ]
        if mitre_mappings:
            top_technique = mitre_mappings[0]
            findings.append(
                f"Most frequently observed technique: {top_technique.technique_id} "
                f"({top_technique.technique_name or 'unnamed'}) with {top_technique.occurrences} occurrences."
            )

        conclusion = (
            f"This investigation is assessed as {overall_severity.value.upper()} severity. "
            "Recommended actions should be prioritized according to the remediation "
            "section above, and monitoring should continue for related indicators of compromise."
        )

        report = InvestigationReport(
            report_id=report_id,
            executive_summary=executive_summary,
            findings=findings,
            timeline=timeline,
            attack_summary=attack_summary,
            top_attackers=top_attackers,
            affected_users=affected_users,
            affected_hosts=affected_hosts,
            top_countries=top_countries,
            risk_score=stats.max_risk_score,
            severity=overall_severity,
            mitre_mappings=mitre_mappings,
            recommendations=recommendations,
            conclusion=conclusion,
            statistics=stats,
            charts=charts,
        )
        logger.info("Report generated: %s (severity=%s, events=%d)", report_id, overall_severity.value, stats.total_events)
        return report

    # ------------------------------------------------------------------
    # Export
    # ------------------------------------------------------------------

    def export_html(self, report: InvestigationReport) -> str:
        """Renders the report as a standalone HTML document.

        Args:
            report: The :class:`InvestigationReport` to render.

        Returns:
            The rendered HTML document as a string.

        Raises:
            ReportRenderingError: If template rendering fails.
        """
        try:
            template = self._jinja_env.from_string(_HTML_REPORT_TEMPLATE)
            return template.render(report=report)
        except TemplateError as exc:
            raise ReportRenderingError(f"Failed to render HTML report: {exc}") from exc

    def export_markdown(self, report: InvestigationReport) -> str:
        """Renders the report as a Markdown document.

        Args:
            report: The :class:`InvestigationReport` to render.

        Returns:
            The rendered Markdown document as a string.

        Raises:
            ReportRenderingError: If template rendering fails.
        """
        try:
            template = self._jinja_env.from_string(_MARKDOWN_REPORT_TEMPLATE)
            return template.render(report=report)
        except TemplateError as exc:
            raise ReportRenderingError(f"Failed to render Markdown report: {exc}") from exc

    def export_json(self, report: InvestigationReport) -> str:
        """Serializes the report to a JSON string.

        Args:
            report: The :class:`InvestigationReport` to serialize.

        Returns:
            The JSON-serialized report.

        Raises:
            ReportExportError: If serialization fails.
        """
        try:
            return report.model_dump_json(indent=2)
        except (TypeError, ValueError) as exc:
            raise ReportExportError(f"Failed to export report to JSON: {exc}") from exc

    def export_pdf(self, report: InvestigationReport) -> bytes:
        """Renders the report to PDF bytes via its HTML representation.

        Requires the optional ``weasyprint`` package to be installed.

        Args:
            report: The :class:`InvestigationReport` to render.

        Returns:
            The rendered PDF document as raw bytes.

        Raises:
            ReportExportError: If PDF rendering fails or the optional
                ``weasyprint`` dependency is not installed.
        """
        try:
            from weasyprint import HTML  # Local import: optional heavy dependency.
        except ImportError as exc:
            raise ReportExportError(
                "PDF export requires the 'weasyprint' package. Install it with `pip install weasyprint`."
            ) from exc

        try:
            html_content = self.export_html(report)
            return HTML(string=html_content).write_pdf()
        except Exception as exc:  # noqa: BLE001 - normalized to domain error
            raise ReportExportError(f"Failed to export report to PDF: {exc}") from exc