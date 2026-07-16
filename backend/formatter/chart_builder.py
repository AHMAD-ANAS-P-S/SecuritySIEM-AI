"""Enterprise Plotly Chart Engine for SIEM data visualization.

This module implements :class:`ChartBuilder`, a class responsible for
converting raw or aggregated SIEM data into frontend-ready Plotly JSON
figures. It supports automatic chart-type selection based on data shape,
a dark enterprise theme, and multiple export formats (JSON, HTML, PNG, SVG).

Typical usage example:

    builder = ChartBuilder()
    figure = builder.auto_chart(data=[{"country": "US", "count": 120}], hint="top countries")
    figure_json = builder.to_json(figure)
"""

from __future__ import annotations

import logging
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Union

import plotly.graph_objects as go
import plotly.io as pio
from pydantic import BaseModel, ConfigDict, Field

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

class ChartBuilderConstants:
    """Centralized configuration constants for :class:`ChartBuilder`.

    Attributes:
        DEFAULT_TEMPLATE: Plotly built-in template name used as the base
            theme prior to enterprise color overrides.
        DARK_BACKGROUND: Primary dark background color.
        DARK_PAPER_BACKGROUND: Secondary dark paper (outer canvas) color.
        FONT_COLOR: Default font color for dark theme charts.
        FONT_FAMILY: Default font family for all charts.
        DEFAULT_COLORWAY: Default categorical color sequence.
        SEVERITY_COLOR_MAP: Color mapping for common SIEM severity levels.
        DEFAULT_WIDTH: Default figure width in pixels.
        DEFAULT_HEIGHT: Default figure height in pixels.
        MAX_CATEGORIES_FOR_PIE: Maximum number of categories before a pie
            chart is considered unsuitable in favor of a bar chart.
    """

    DEFAULT_TEMPLATE: str = "plotly_dark"
    DARK_BACKGROUND: str = "#0f1117"
    DARK_PAPER_BACKGROUND: str = "#161923"
    FONT_COLOR: str = "#e6e9ef"
    FONT_FAMILY: str = "Inter, Segoe UI, Roboto, sans-serif"
    DEFAULT_COLORWAY: List[str] = [
        "#5B8DEF", "#F45B69", "#F7B32B", "#2EC4B6",
        "#9B5DE5", "#00BBF9", "#FF6B6B", "#43AA8B",
    ]
    SEVERITY_COLOR_MAP: Dict[str, str] = {
        "critical": "#D7263D",
        "high": "#F45B69",
        "medium": "#F7B32B",
        "low": "#2EC4B6",
        "informational": "#5B8DEF",
    }
    DEFAULT_WIDTH: int = 900
    DEFAULT_HEIGHT: int = 500
    MAX_CATEGORIES_FOR_PIE: int = 8


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ChartBuilderError(Exception):
    """Base exception for all :class:`ChartBuilder` related errors."""


class InvalidChartDataError(ChartBuilderError):
    """Raised when the input data is structurally unsuitable for charting."""


class UnsupportedChartTypeError(ChartBuilderError):
    """Raised when an unrecognized chart type is requested."""


class ChartExportError(ChartBuilderError):
    """Raised when exporting a chart to a target format fails."""


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ChartType(str, Enum):
    """Supported Plotly chart types produced by :class:`ChartBuilder`."""

    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    AREA = "area"
    HORIZONTAL_BAR = "horizontal_bar"
    SCATTER = "scatter"
    HEATMAP = "heatmap"
    HISTOGRAM = "histogram"
    STACKED_BAR = "stacked_bar"
    TIMELINE = "timeline"


class ExportFormat(str, Enum):
    """Supported export formats for a built chart."""

    JSON = "json"
    HTML = "html"
    PNG = "png"
    SVG = "svg"


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class ChartDataPoint(BaseModel):
    """A single generic data point used to build simple charts.

    Attributes:
        label: The categorical or temporal label for this point.
        value: The numeric value associated with the label.
        group: Optional secondary grouping key (used for stacked/grouped
            charts).
    """

    model_config = ConfigDict(extra="allow")

    label: Union[str, int, float]
    value: float
    group: Optional[str] = None


class TimelineEvent(BaseModel):
    """A single event used to build a timeline/Gantt-style chart.

    Attributes:
        task: The label of the timeline row (e.g. host, user, or category).
        start: ISO-8601 start timestamp.
        end: ISO-8601 end timestamp.
        description: Optional hover description for the event.
    """

    task: str
    start: str
    end: str
    description: Optional[str] = None


class ChartBuildResult(BaseModel):
    """Metadata describing a built chart, alongside its Plotly figure.

    Attributes:
        chart_type: The :class:`ChartType` that was ultimately rendered.
        title: The chart's display title.
        figure_json: The Plotly figure serialized as a JSON string.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    chart_type: ChartType
    title: str
    figure_json: str


# ---------------------------------------------------------------------------
# ChartBuilder
# ---------------------------------------------------------------------------

class ChartBuilder:
    """Enterprise Plotly chart engine for SIEM visualizations.

    Produces frontend-ready Plotly figures with a consistent dark enterprise
    theme, automatic chart-type inference, and multi-format export.

    Attributes:
        theme: The base Plotly template name applied to every figure.
        width: Default figure width in pixels.
        height: Default figure height in pixels.
    """

    def __init__(
        self,
        theme: str = ChartBuilderConstants.DEFAULT_TEMPLATE,
        width: int = ChartBuilderConstants.DEFAULT_WIDTH,
        height: int = ChartBuilderConstants.DEFAULT_HEIGHT,
    ) -> None:
        """Initializes the chart builder with theme and sizing defaults.

        Args:
            theme: Base Plotly template name (e.g. ``"plotly_dark"``).
            width: Default figure width, in pixels.
            height: Default figure height, in pixels.
        """
        self.theme = theme
        self.width = width
        self.height = height
        logger.info("ChartBuilder initialized (theme=%s, %dx%d)", theme, width, height)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _apply_layout(self, figure: go.Figure, title: str, x_title: str = "", y_title: str = "") -> go.Figure:
        """Applies the shared enterprise dark theme and layout to a figure.

        Args:
            figure: The Plotly figure to style.
            title: The figure title.
            x_title: The x-axis title.
            y_title: The y-axis title.

        Returns:
            The same figure instance, styled in place.
        """
        figure.update_layout(
            template=self.theme,
            title={"text": title, "x": 0.02, "xanchor": "left", "font": {"size": 18}},
            paper_bgcolor=ChartBuilderConstants.DARK_PAPER_BACKGROUND,
            plot_bgcolor=ChartBuilderConstants.DARK_BACKGROUND,
            font={"color": ChartBuilderConstants.FONT_COLOR, "family": ChartBuilderConstants.FONT_FAMILY},
            colorway=ChartBuilderConstants.DEFAULT_COLORWAY,
            width=self.width,
            height=self.height,
            autosize=True,
            xaxis={"title": x_title, "gridcolor": "#242836", "zerolinecolor": "#242836"},
            yaxis={"title": y_title, "gridcolor": "#242836", "zerolinecolor": "#242836"},
            legend={"bgcolor": "rgba(0,0,0,0)", "orientation": "h", "y": -0.2},
            margin={"l": 60, "r": 30, "t": 60, "b": 60},
            hoverlabel={"bgcolor": ChartBuilderConstants.DARK_PAPER_BACKGROUND, "font_size": 12},
        )
        return figure

    @staticmethod
    def _validate_points(data: Sequence[Dict[str, Any]]) -> List[ChartDataPoint]:
        """Validates and coerces raw dict data into :class:`ChartDataPoint`.

        Args:
            data: A sequence of raw dictionaries with at least ``label`` and
                ``value`` keys.

        Returns:
            A list of validated :class:`ChartDataPoint` instances.

        Raises:
            InvalidChartDataError: If the data is empty or malformed.
        """
        if not data:
            raise InvalidChartDataError("Chart data must not be empty")
        try:
            return [ChartDataPoint.model_validate(item) for item in data]
        except Exception as exc:  # noqa: BLE001 - re-raised as domain error
            raise InvalidChartDataError(f"Malformed chart data: {exc}") from exc

    # ------------------------------------------------------------------
    # Chart builders
    # ------------------------------------------------------------------

    def line_chart(
        self,
        data: Sequence[Dict[str, Any]],
        title: str = "Event Trend Over Time",
        x_title: str = "Time",
        y_title: str = "Count",
    ) -> go.Figure:
        """Builds a line chart, ideal for time-series event volume trends.

        Args:
            data: Sequence of dicts with ``label`` (x-axis) and ``value``
                (y-axis) keys.
            title: Chart title.
            x_title: X-axis title.
            y_title: Y-axis title.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the input data is malformed or empty.
        """
        points = self._validate_points(data)
        figure = go.Figure(
            data=[
                go.Scatter(
                    x=[p.label for p in points],
                    y=[p.value for p in points],
                    mode="lines+markers",
                    line={"width": 3, "shape": "spline"},
                    marker={"size": 6},
                    hovertemplate="%{x}<br>%{y} events<extra></extra>",
                )
            ]
        )
        return self._apply_layout(figure, title, x_title, y_title)

    def bar_chart(
        self,
        data: Sequence[Dict[str, Any]],
        title: str = "Event Counts by Category",
        x_title: str = "Category",
        y_title: str = "Count",
    ) -> go.Figure:
        """Builds a vertical bar chart for categorical comparisons.

        Args:
            data: Sequence of dicts with ``label`` and ``value`` keys.
            title: Chart title.
            x_title: X-axis title.
            y_title: Y-axis title.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the input data is malformed or empty.
        """
        points = self._validate_points(data)
        figure = go.Figure(
            data=[
                go.Bar(
                    x=[p.label for p in points],
                    y=[p.value for p in points],
                    marker={"color": ChartBuilderConstants.DEFAULT_COLORWAY[0]},
                    hovertemplate="%{x}<br>%{y} events<extra></extra>",
                )
            ]
        )
        return self._apply_layout(figure, title, x_title, y_title)

    def horizontal_bar_chart(
        self,
        data: Sequence[Dict[str, Any]],
        title: str = "Top Entities",
        x_title: str = "Count",
        y_title: str = "Entity",
    ) -> go.Figure:
        """Builds a horizontal bar chart, ideal for top-N rankings.

        Args:
            data: Sequence of dicts with ``label`` and ``value`` keys.
            title: Chart title.
            x_title: X-axis title.
            y_title: Y-axis title.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the input data is malformed or empty.
        """
        points = sorted(self._validate_points(data), key=lambda p: p.value)
        figure = go.Figure(
            data=[
                go.Bar(
                    x=[p.value for p in points],
                    y=[p.label for p in points],
                    orientation="h",
                    marker={"color": ChartBuilderConstants.DEFAULT_COLORWAY[1]},
                    hovertemplate="%{y}<br>%{x} events<extra></extra>",
                )
            ]
        )
        return self._apply_layout(figure, title, x_title, y_title)

    def pie_chart(self, data: Sequence[Dict[str, Any]], title: str = "Distribution") -> go.Figure:
        """Builds a pie chart for category distribution/proportions.

        Args:
            data: Sequence of dicts with ``label`` and ``value`` keys.
            title: Chart title.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the input data is malformed or empty.
        """
        points = self._validate_points(data)
        figure = go.Figure(
            data=[
                go.Pie(
                    labels=[p.label for p in points],
                    values=[p.value for p in points],
                    hole=0.35,
                    marker={"colors": ChartBuilderConstants.DEFAULT_COLORWAY},
                    hovertemplate="%{label}<br>%{value} (%{percent})<extra></extra>",
                )
            ]
        )
        return self._apply_layout(figure, title)

    def area_chart(
        self,
        data: Sequence[Dict[str, Any]],
        title: str = "Cumulative Event Volume",
        x_title: str = "Time",
        y_title: str = "Count",
    ) -> go.Figure:
        """Builds a filled area chart, ideal for cumulative volume trends.

        Args:
            data: Sequence of dicts with ``label`` and ``value`` keys.
            title: Chart title.
            x_title: X-axis title.
            y_title: Y-axis title.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the input data is malformed or empty.
        """
        points = self._validate_points(data)
        figure = go.Figure(
            data=[
                go.Scatter(
                    x=[p.label for p in points],
                    y=[p.value for p in points],
                    mode="lines",
                    fill="tozeroy",
                    line={"width": 2},
                    hovertemplate="%{x}<br>%{y} events<extra></extra>",
                )
            ]
        )
        return self._apply_layout(figure, title, x_title, y_title)

    def scatter_plot(
        self,
        data: Sequence[Dict[str, Any]],
        title: str = "Event Correlation",
        x_title: str = "X",
        y_title: str = "Y",
    ) -> go.Figure:
        """Builds a scatter plot, useful for correlation or outlier analysis.

        Args:
            data: Sequence of dicts with ``label`` and ``value`` keys.
            title: Chart title.
            x_title: X-axis title.
            y_title: Y-axis title.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the input data is malformed or empty.
        """
        points = self._validate_points(data)
        figure = go.Figure(
            data=[
                go.Scatter(
                    x=[p.label for p in points],
                    y=[p.value for p in points],
                    mode="markers",
                    marker={"size": 10, "opacity": 0.8},
                    hovertemplate="%{x}<br>%{y}<extra></extra>",
                )
            ]
        )
        return self._apply_layout(figure, title, x_title, y_title)

    def heatmap(
        self,
        z_matrix: Sequence[Sequence[float]],
        x_labels: Sequence[str],
        y_labels: Sequence[str],
        title: str = "Event Intensity Heatmap",
    ) -> go.Figure:
        """Builds a heatmap, ideal for time-of-day/day-of-week intensity maps.

        Args:
            z_matrix: 2D matrix of values, indexed as ``z_matrix[y][x]``.
            x_labels: Labels for the x-axis (columns).
            y_labels: Labels for the y-axis (rows).
            title: Chart title.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the matrix or labels are malformed.
        """
        if not z_matrix or not x_labels or not y_labels:
            raise InvalidChartDataError("Heatmap requires a non-empty z_matrix, x_labels, and y_labels")
        if any(len(row) != len(x_labels) for row in z_matrix):
            raise InvalidChartDataError("Each row in z_matrix must match the length of x_labels")

        figure = go.Figure(
            data=go.Heatmap(
                z=z_matrix,
                x=list(x_labels),
                y=list(y_labels),
                colorscale="Viridis",
                hovertemplate="%{x} / %{y}<br>%{z}<extra></extra>",
            )
        )
        return self._apply_layout(figure, title)

    def histogram(
        self,
        values: Sequence[float],
        title: str = "Value Distribution",
        x_title: str = "Value",
        y_title: str = "Frequency",
        bins: Optional[int] = None,
    ) -> go.Figure:
        """Builds a histogram for statistical distribution analysis.

        Args:
            values: Raw numeric samples to bucket.
            title: Chart title.
            x_title: X-axis title.
            y_title: Y-axis title.
            bins: Optional explicit number of bins.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If ``values`` is empty.
        """
        if not values:
            raise InvalidChartDataError("Histogram requires at least one value")

        histogram_kwargs: Dict[str, Any] = {"x": list(values), "marker": {"color": ChartBuilderConstants.DEFAULT_COLORWAY[2]}}
        if bins:
            histogram_kwargs["nbinsx"] = bins

        figure = go.Figure(data=[go.Histogram(**histogram_kwargs)])
        return self._apply_layout(figure, title, x_title, y_title)

    def stacked_bar_chart(
        self,
        data: Sequence[Dict[str, Any]],
        title: str = "Grouped Event Counts",
        x_title: str = "Category",
        y_title: str = "Count",
    ) -> go.Figure:
        """Builds a stacked bar chart from grouped data points.

        Args:
            data: Sequence of dicts with ``label``, ``value``, and ``group``
                keys, where ``group`` defines the stack segment.
            title: Chart title.
            x_title: X-axis title.
            y_title: Y-axis title.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the data is malformed or missing
                group information.
        """
        points = self._validate_points(data)
        if any(p.group is None for p in points):
            raise InvalidChartDataError("Stacked bar chart requires a 'group' key on every data point")

        groups: Dict[str, List[ChartDataPoint]] = {}
        for point in points:
            groups.setdefault(point.group, []).append(point)  # type: ignore[arg-type]

        traces = [
            go.Bar(
                name=group_name,
                x=[p.label for p in group_points],
                y=[p.value for p in group_points],
                hovertemplate="%{x}<br>%{y} events<extra></extra>",
            )
            for group_name, group_points in groups.items()
        ]
        figure = go.Figure(data=traces)
        figure.update_layout(barmode="stack")
        return self._apply_layout(figure, title, x_title, y_title)

    def timeline(self, events: Sequence[Dict[str, Any]], title: str = "Investigation Timeline") -> go.Figure:
        """Builds a Gantt-style timeline chart of security events.

        Args:
            events: Sequence of dicts matching the :class:`TimelineEvent`
                schema (``task``, ``start``, ``end``, optional
                ``description``).
            title: Chart title.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the events are empty or malformed.
        """
        if not events:
            raise InvalidChartDataError("Timeline requires at least one event")
        try:
            parsed_events = [TimelineEvent.model_validate(event) for event in events]
        except Exception as exc:  # noqa: BLE001 - re-raised as domain error
            raise InvalidChartDataError(f"Malformed timeline event: {exc}") from exc

        figure = go.Figure()
        for index, event in enumerate(parsed_events):
            figure.add_trace(
                go.Scatter(
                    x=[event.start, event.end],
                    y=[event.task, event.task],
                    mode="lines",
                    line={"width": 14, "color": ChartBuilderConstants.DEFAULT_COLORWAY[index % len(ChartBuilderConstants.DEFAULT_COLORWAY)]},
                    hovertemplate=f"{event.task}<br>{event.description or ''}<extra></extra>",
                    showlegend=False,
                )
            )
        return self._apply_layout(figure, title, "Time", "")

    # ------------------------------------------------------------------
    # Automatic chart selection
    # ------------------------------------------------------------------

    def auto_chart(
        self,
        data: Union[Sequence[Dict[str, Any]], Sequence[Sequence[float]]],
        hint: str = "",
        title: Optional[str] = None,
    ) -> go.Figure:
        """Automatically selects and builds the most suitable chart type.

        The selection heuristic considers the semantic ``hint`` (e.g. "top
        users", "timeline", "trend") together with the structural shape of
        the data (presence of ``group`` keys, cardinality, numeric-only
        matrices) to pick among line, bar, pie, area, horizontal bar,
        scatter, heatmap, histogram, stacked bar, and timeline charts.

        Args:
            data: The raw data to visualize. Either a sequence of
                dict-based data points, or a 2D numeric matrix (heatmap).
            hint: A free-text hint describing the semantic nature of the
                data (e.g. "top attacking IPs", "events over time").
            title: Optional explicit chart title; a sensible default is
                generated from ``hint`` if omitted.

        Returns:
            A styled Plotly :class:`~plotly.graph_objects.Figure`.

        Raises:
            InvalidChartDataError: If the data is empty or cannot be
                interpreted as any supported chart shape.
        """
        if not data:
            raise InvalidChartDataError("Cannot auto-select a chart for empty data")

        normalized_hint = hint.lower()
        resolved_title = title or (hint.title() if hint else "SIEM Data Visualization")

        # Matrix-shaped data implies a heatmap.
        if isinstance(data[0], (list, tuple)):
            y_labels = [f"Row {i}" for i in range(len(data))]
            x_labels = [f"Col {i}" for i in range(len(data[0]))]
            return self.heatmap(data, x_labels, y_labels, resolved_title)  # type: ignore[arg-type]

        has_group = any(isinstance(item, dict) and item.get("group") for item in data)
        cardinality = len(data)

        if any(keyword in normalized_hint for keyword in ("timeline", "chronology", "sequence of events")):
            return self.timeline(data, resolved_title)  # type: ignore[arg-type]

        if any(keyword in normalized_hint for keyword in ("trend", "over time", "time series")):
            return self.line_chart(data, resolved_title)  # type: ignore[arg-type]

        if any(keyword in normalized_hint for keyword in ("cumulative", "growth", "area")):
            return self.area_chart(data, resolved_title)  # type: ignore[arg-type]

        if has_group:
            return self.stacked_bar_chart(data, resolved_title)  # type: ignore[arg-type]

        if any(keyword in normalized_hint for keyword in ("top ", "ranking", "highest", "most frequent")):
            return self.horizontal_bar_chart(data, resolved_title)  # type: ignore[arg-type]

        if any(keyword in normalized_hint for keyword in ("distribution", "share", "proportion", "percentage")):
            if cardinality <= ChartBuilderConstants.MAX_CATEGORIES_FOR_PIE:
                return self.pie_chart(data, resolved_title)  # type: ignore[arg-type]
            return self.bar_chart(data, resolved_title)  # type: ignore[arg-type]

        if any(keyword in normalized_hint for keyword in ("correlation", "scatter", "relationship")):
            return self.scatter_plot(data, resolved_title)  # type: ignore[arg-type]

        if cardinality <= ChartBuilderConstants.MAX_CATEGORIES_FOR_PIE and any(
            keyword in normalized_hint for keyword in ("category", "categories", "type", "types")
        ):
            return self.pie_chart(data, resolved_title)  # type: ignore[arg-type]

        logger.debug("auto_chart falling back to bar_chart for hint='%s'", hint)
        return self.bar_chart(data, resolved_title)  # type: ignore[arg-type]

    # ------------------------------------------------------------------
    # Export
    # ------------------------------------------------------------------

    def to_json(self, figure: go.Figure) -> str:
        """Serializes a figure to frontend-ready Plotly JSON.

        Args:
            figure: The Plotly figure to serialize.

        Returns:
            A JSON string compatible with ``Plotly.newPlot`` on the frontend.

        Raises:
            ChartExportError: If serialization fails.
        """
        try:
            return pio.to_json(figure)
        except (TypeError, ValueError) as exc:
            raise ChartExportError(f"Failed to serialize figure to JSON: {exc}") from exc

    def to_html(self, figure: go.Figure, full_html: bool = False, include_plotlyjs: Union[bool, str] = "cdn") -> str:
        """Exports a figure as an HTML fragment or full HTML document.

        Args:
            figure: The Plotly figure to export.
            full_html: If ``True``, returns a full standalone HTML document.
            include_plotlyjs: How to include the Plotly.js dependency
                (``"cdn"``, ``True`` to inline, or ``False`` to omit).

        Returns:
            The HTML representation of the figure.

        Raises:
            ChartExportError: If export fails.
        """
        try:
            return pio.to_html(figure, full_html=full_html, include_plotlyjs=include_plotlyjs)
        except (TypeError, ValueError) as exc:
            raise ChartExportError(f"Failed to export figure to HTML: {exc}") from exc

    def to_image_bytes(self, figure: go.Figure, export_format: ExportFormat = ExportFormat.PNG, scale: float = 2.0) -> bytes:
        """Exports a figure to static image bytes (PNG or SVG).

        Requires the optional ``kaleido`` package to be installed.

        Args:
            figure: The Plotly figure to export.
            export_format: Either :attr:`ExportFormat.PNG` or
                :attr:`ExportFormat.SVG`.
            scale: Image scale multiplier for higher-resolution exports.

        Returns:
            The raw image bytes.

        Raises:
            UnsupportedChartTypeError: If ``export_format`` is not an image
                format.
            ChartExportError: If image rendering fails (e.g. missing
                ``kaleido`` dependency).
        """
        if export_format not in (ExportFormat.PNG, ExportFormat.SVG):
            raise UnsupportedChartTypeError(f"Unsupported image export format: {export_format}")
        try:
            return figure.to_image(format=export_format.value, scale=scale)
        except (ValueError, RuntimeError) as exc:
            raise ChartExportError(
                f"Failed to export figure to {export_format.value}: {exc}. "
                "Ensure the 'kaleido' package is installed."
            ) from exc

    def export(self, figure: go.Figure, export_format: ExportFormat) -> Union[str, bytes]:
        """Unified export entry point supporting all :class:`ExportFormat` values.

        Args:
            figure: The Plotly figure to export.
            export_format: The desired :class:`ExportFormat`.

        Returns:
            A string for JSON/HTML formats, or bytes for PNG/SVG formats.

        Raises:
            UnsupportedChartTypeError: If the export format is unrecognized.
            ChartExportError: If the underlying export operation fails.
        """
        if export_format == ExportFormat.JSON:
            return self.to_json(figure)
        if export_format == ExportFormat.HTML:
            return self.to_html(figure)
        if export_format in (ExportFormat.PNG, ExportFormat.SVG):
            return self.to_image_bytes(figure, export_format)
        raise UnsupportedChartTypeError(f"Unsupported export format: {export_format}")

    def build_result(self, figure: go.Figure, chart_type: ChartType, title: str) -> ChartBuildResult:
        """Wraps a figure and its metadata into a :class:`ChartBuildResult`.

        Args:
            figure: The built Plotly figure.
            chart_type: The :class:`ChartType` that was rendered.
            title: The chart's display title.

        Returns:
            A :class:`ChartBuildResult` ready for API response serialization.
        """
        return ChartBuildResult(chart_type=chart_type, title=title, figure_json=self.to_json(figure))