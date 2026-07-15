"""
clarification.py
-----------------
Handles ambiguous analyst queries. The system must never *guess* at intent
below the confidence threshold — it should always ask.

Owner: Ahmad Anas (Team Lead / AI-ML)

Usage:
    from backend.ai.intent import analyze_intent
    from backend.ai.clarification import build_clarification, needs_clarification

    result = analyze_intent("check unusual activity")
    if needs_clarification(result):
        response = build_clarification(result, original_message="check unusual activity")
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from backend.ai.intent import IntentResult
from backend.config import get_settings

logger = logging.getLogger("securitysiem.clarification")

# Default suggestions shown when we truly cannot infer any event-type signal at all.
DEFAULT_OPTIONS: List[str] = [
    "Failed login attempts",
    "Malware detections",
    "Brute force attempts",
    "VPN activity",
]

# Event-type-aware suggestions: when the LLM/rule-based layer has *some* signal
# (e.g. it heard "login" but not "failed" vs "successful"), offer nearby options
# rather than the generic default list.
_RELATED_OPTIONS: Dict[str, List[str]] = {
    "unknown": DEFAULT_OPTIONS,
    "failed_login": ["Failed login attempts", "Brute force attempts", "MFA failures"],
    "successful_login": ["Successful login attempts", "Privilege escalation events"],
    "malware": ["Malware detections", "Suspicious outbound traffic"],
    "brute_force": ["Brute force attempts", "Failed login attempts"],
    "vpn_activity": ["VPN activity", "Suspicious outbound traffic"],
    "mfa_event": ["MFA failures", "Failed login attempts"],
    "privilege_escalation": ["Privilege escalation events", "Successful login attempts"],
    "suspicious_traffic": ["Suspicious outbound traffic", "Malware detections"],
}


@dataclass
class ClarificationResponse:
    needs_clarification: bool
    message: str
    options: List[str] = field(default_factory=list)
    reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "needs_clarification": self.needs_clarification,
            "message": self.message,
            "options": self.options,
            "reason": self.reason,
        }


def needs_clarification(result: IntentResult) -> bool:
    """
    Decide whether an IntentResult is confident enough to proceed straight
    to query generation, or whether the analyst should be asked to confirm.
    """
    settings = get_settings()
    if result.intent == "clarification_needed":
        return True
    if result.confidence < settings.INTENT_CONFIDENCE_THRESHOLD:
        return True
    if result.event_type == "unknown":
        return True
    if not result.time_range.matched and result.time_range.label == "past_24_hours":
        # Time was defaulted rather than explicitly stated or inferable —
        # not blocking on its own, but logged for visibility/telemetry.
        logger.info("Time range was defaulted for an otherwise confident intent; proceeding")
    return False


def build_clarification(
    result: IntentResult,
    original_message: Optional[str] = None,
) -> ClarificationResponse:
    """
    Build a clarification prompt for the frontend chat window (Barath/Charumithra)
    to render as quick-reply buttons.
    """
    options = _RELATED_OPTIONS.get(result.event_type, DEFAULT_OPTIONS)

    if result.event_type == "unknown":
        reason = "Could not determine which type of security event you're asking about."
        message = "I couldn't tell which type of activity you mean. Did you mean one of these?"
    else:
        reason = f"Low confidence ({result.confidence:.0%}) in classifying this as '{result.event_type}'."
        message = f"Just to confirm — are you asking about one of these?"

    logger.info(
        "Clarification triggered for message=%r reason=%s options=%s",
        original_message, reason, options,
    )

    return ClarificationResponse(
        needs_clarification=True,
        message=message,
        options=options,
        reason=reason,
    )


def resolve_clarification_choice(chosen_option: str) -> Dict[str, str]:
    """
    Map a user's clicked clarification option back to a canonical event_type,
    so the chat route can re-run `analyze_intent`-equivalent logic without
    another LLM round trip.
    """
    normalized = chosen_option.strip().lower()
    mapping = {
        "failed login attempts": "failed_login",
        "successful login attempts": "successful_login",
        "malware detections": "malware",
        "brute force attempts": "brute_force",
        "vpn activity": "vpn_activity",
        "mfa failures": "mfa_event",
        "privilege escalation events": "privilege_escalation",
        "suspicious outbound traffic": "suspicious_traffic",
    }
    event_type = mapping.get(normalized, "unknown")
    return {"event_type": event_type}


if __name__ == "__main__":
    from backend.ai.intent import analyze_intent

    for q in ["check unusual activity", "show failed ssh logins yesterday"]:
        r = analyze_intent(q)
        if needs_clarification(r):
            print(q, "->", build_clarification(r, q).to_dict())
        else:
            print(q, "-> confident, proceeding to query_generator")