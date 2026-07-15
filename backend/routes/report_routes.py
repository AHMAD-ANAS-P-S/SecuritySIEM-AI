import logging
import uuid

from fastapi import APIRouter, HTTPException, status

from models.request_models import ReportRequest
from models.response_models import ReportResponse
# from app.services import report_generator

logger = logging.getLogger("sentinelai.report")

router = APIRouter()


@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a security report",
)
async def create_report(payload: ReportRequest) -> ReportResponse:
    """
    Generates a security report for the specified session and time range.

    Args:
        payload: Validated report request containing session_id, report_type,
            start_time, and end_time.

    Returns:
        ReportResponse: Status, generated report ID, and report access URL.

    Raises:
        HTTPException:
            400 - Invalid report parameters.
            404 - Session not found.
            500 - Unexpected error during report generation.
    """
    logger.info(
        "Report generation requested | session_id=%s | report_type=%s | "
        "start_time=%s | end_time=%s",
        payload.session_id,
        payload.report_type,
        payload.start_time,
        payload.end_time,
    )

    try:
        session_exists = await report_generator.validate_session(payload.session_id)
    except Exception as exc:
        logger.error(
            "Error validating session_id=%s | error=%s",
            payload.session_id,
            str(exc),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to validate session at this time.",
        ) from exc

    if not session_exists:
        logger.warning("Session not found: session_id=%s", payload.session_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{payload.session_id}' was not found.",
        )

    report_id = f"rpt_{uuid.uuid4().hex[:12]}"

    try:
        report_url = await report_generator.generate_report(
            report_id=report_id,
            session_id=payload.session_id,
            report_type=payload.report_type,
            start_time=payload.start_time,
            end_time=payload.end_time,
        )
    except ValueError as exc:
        logger.warning(
            "Invalid report parameters | session_id=%s | error=%s",
            payload.session_id,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error(
            "Report generation failed | session_id=%s | report_id=%s | error=%s",
            payload.session_id,
            report_id,
            str(exc),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Report generation failed. Please try again later.",
        ) from exc

    logger.info(
        "Report generated successfully | session_id=%s | report_id=%s",
        payload.session_id,
        report_id,
    )

    return ReportResponse(
        status="success",
        report_id=report_id,
        report_url=report_url,
    )