import logging

from fastapi import APIRouter, HTTPException, status

from models.response_models import HistoryResponse
# from app.services import context_manager


logger = logging.getLogger("sentinelai.history")

router = APIRouter()


@router.get(
    "/{session_id}",
    response_model=HistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve conversation history for a chat session",
)
async def get_history(session_id: str) -> HistoryResponse:
    """
    Retrieves the full message history for a given chat session.

    Args:
        session_id: Unique identifier of the chat session.

    Returns:
        HistoryResponse: Session identifier and its chronological message list.

    Raises:
        HTTPException:
            400 - Invalid or empty session_id.
            404 - Session not found.
            500 - Unexpected error while retrieving history.
    """
    if not session_id or not session_id.strip():
        logger.warning("History request rejected: empty session_id.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="session_id must not be empty.",
        )

    logger.info("Fetching history for session_id=%s", session_id)

    try:
        session_exists = await context_manager.session_exists(session_id)
    except Exception as exc:
        logger.error(
            "Error checking session existence for session_id=%s | error=%s",
            session_id,
            str(exc),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify session at this time.",
        ) from exc

    if not session_exists:
        logger.warning("Session not found: session_id=%s", session_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' was not found.",
        )

    try:
        messages = await context_manager.get_history(session_id)
    except Exception as exc:
        logger.error(
            "Error retrieving history for session_id=%s | error=%s",
            session_id,
            str(exc),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve conversation history at this time.",
        ) from exc

    logger.info(
        "History retrieved for session_id=%s | message_count=%d",
        session_id,
        len(messages),
    )

    return HistoryResponse(
        session_id=session_id,
        messages=messages,
    )