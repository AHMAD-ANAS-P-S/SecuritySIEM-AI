"""
time_normalizer.py
-------------------
Converts human-language time expressions ("yesterday", "past 6 hours",
"last week") into concrete UTC datetime ranges and Elasticsearch date-math
filters.

Owner: Ahmad Anas (Team Lead / AI-ML)

Usage:
    from backend.utils.time_normalizer import normalize_time

    result = normalize_time("yesterday")
    result.gte              # datetime(2026, 7, 14, 0, 0, tzinfo=UTC)
    result.lte              # datetime(2026, 7, 14, 23, 59, 59, tzinfo=UTC)
    result.es_range()       # {"gte": "2026-07-14T00:00:00Z", "lte": "2026-07-14T23:59:59Z"}
    result.matched          # True -> phrase was understood
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger("securitysiem.time_normalizer")

UTC = timezone.utc


@dataclass
class TimeRange:
    """Normalized time range returned to callers (intent.py, query_generator.py)."""

    gte: datetime
    lte: datetime
    label: str
    matched: bool = True

    def es_range(self) -> dict:
        """Return an Elasticsearch-compatible range filter body."""
        return {
            "gte": self.gte.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "lte": self.lte.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    def as_dict(self) -> dict:
        return {
            "label": self.label,
            "matched": self.matched,
            "gte": self.gte.isoformat(),
            "lte": self.lte.isoformat(),
        }


def _start_of_day(dt: datetime) -> datetime:
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def _end_of_day(dt: datetime) -> datetime:
    return dt.replace(hour=23, minute=59, second=59, microsecond=0)


def _start_of_week(dt: datetime) -> datetime:
    # Monday as the first day of the week
    monday = dt - timedelta(days=dt.weekday())
    return _start_of_day(monday)


def _start_of_month(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


# Relative "past/last N unit" pattern, e.g. "past 6 hours", "last 90 days", "past 2 weeks"
_RELATIVE_PATTERN = re.compile(
    r"(?:past|last)\s+(\d+)\s*(hour|hours|hr|hrs|day|days|week|weeks|month|months|minute|minutes|min|mins)",
    re.IGNORECASE,
)

_UNIT_TO_TIMEDELTA_KEY = {
    "hour": "hours", "hours": "hours", "hr": "hours", "hrs": "hours",
    "day": "days", "days": "days",
    "week": "weeks", "weeks": "weeks",
    "month": "days", "months": "days",  # approximate month as 30 days
    "minute": "minutes", "minutes": "minutes", "min": "minutes", "mins": "minutes",
}


def normalize_time(phrase: Optional[str], now: Optional[datetime] = None) -> TimeRange:
    """
    Convert a human time phrase into a `TimeRange`.

    If the phrase cannot be understood, returns a TimeRange defaulting to the
    last 24 hours with `matched=False`, so callers (e.g. clarification.py)
    can decide whether to ask the user to confirm the time window.
    """
    now = (now or datetime.now(UTC)).astimezone(UTC)

    if not phrase or not phrase.strip():
        return _default_range(now, matched=False)

    text = phrase.strip().lower()

    # --- exact / well-known phrases -----------------------------------------
    if text in ("today",):
        return TimeRange(gte=_start_of_day(now), lte=now, label="today")

    if text in ("yesterday",):
        yesterday = now - timedelta(days=1)
        return TimeRange(
            gte=_start_of_day(yesterday),
            lte=_end_of_day(yesterday),
            label="yesterday",
        )

    if text in ("this week",):
        return TimeRange(gte=_start_of_week(now), lte=now, label="this_week")

    if text in ("last week", "past week"):
        start_this_week = _start_of_week(now)
        start_last_week = start_this_week - timedelta(days=7)
        end_last_week = start_this_week - timedelta(seconds=1)
        return TimeRange(gte=start_last_week, lte=end_last_week, label="last_week")

    if text in ("this month",):
        return TimeRange(gte=_start_of_month(now), lte=now, label="this_month")

    if text in ("last month", "past month"):
        first_of_this_month = _start_of_month(now)
        last_month_end = first_of_this_month - timedelta(seconds=1)
        # first day of the previous month
        if first_of_this_month.month == 1:
            last_month_start = first_of_this_month.replace(
                year=first_of_this_month.year - 1, month=12
            )
        else:
            last_month_start = first_of_this_month.replace(month=first_of_this_month.month - 1)
        return TimeRange(gte=last_month_start, lte=last_month_end, label="last_month")

    if text in ("now", "current"):
        return TimeRange(gte=now - timedelta(minutes=1), lte=now, label="now")

    # --- relative "past/last N unit" ----------------------------------------
    match = _RELATIVE_PATTERN.search(text)
    if match:
        amount = int(match.group(1))
        unit = match.group(2).lower()
        td_key = _UNIT_TO_TIMEDELTA_KEY.get(unit)
        if td_key:
            if td_key == "days" and unit.startswith("month"):
                amount *= 30  # months approximated as 30 days each
            delta = timedelta(**{td_key: amount})
            label = f"past_{amount}_{td_key}"
            return TimeRange(gte=now - delta, lte=now, label=label)

    # --- "past 90 days" style already covered above; try bare number + unit ---
    bare_match = re.match(r"(\d+)\s*(hour|day|week|month|minute)s?$", text)
    if bare_match:
        amount = int(bare_match.group(1))
        unit = bare_match.group(2)
        td_key = _UNIT_TO_TIMEDELTA_KEY.get(unit, "days")
        delta = timedelta(**{td_key: amount})
        return TimeRange(gte=now - delta, lte=now, label=f"past_{amount}_{td_key}")

    logger.warning("time_normalizer: unrecognized phrase '%s', defaulting to last 24h", phrase)
    return _default_range(now, matched=False)


def _default_range(now: datetime, matched: bool) -> TimeRange:
    return TimeRange(
        gte=now - timedelta(hours=24),
        lte=now,
        label="past_24_hours",
        matched=matched,
    )


SUPPORTED_PHRASES = [
    "today",
    "yesterday",
    "this week",
    "last week",
    "this month",
    "last month",
    "past N hours",
    "past N days",
    "past N weeks",
    "past 90 days",
]


if __name__ == "__main__":
    for p in ["yesterday", "past 6 hours", "last week", "past 90 days", "gibberish"]:
        r = normalize_time(p)
        print(p, "->", r.as_dict())