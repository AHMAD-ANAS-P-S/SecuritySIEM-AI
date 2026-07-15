import logging

from fastapi import APIRouter, HTTPException, status

from models.request_models import ChatRequest
from models.response_models import ChatResponse


logger = logging.getLogger("sentinelai.chat")

router = APIRouter()


# --------------------------------------------------------------------------
# Safe Imports - Downstream Module Dependencies
# --------------------------------------------------------------------------
try:
    from ai.intent import extract_intent
except ImportError:
    extract_intent = None
    logger.warning("Dependency unavailable: ai.intent.extract_intent")

try:
    from ai.context_manager import get_context, save_context
except ImportError:
    get_context = None
    save_context = None
    logger.warning(
        "Dependency unavailable: ai.context_manager.get_context / save_context"
    )

try:
    from ai.query_generator import generate_query
except ImportError:
    generate_query = None
    logger.warning("Dependency unavailable: ai.query_generator.generate_query")

try:
    from siem.validator import validate_query
except ImportError:
    validate_query = None
    logger.warning("Dependency unavailable: siem.validator.validate_query")

try:
    from siem.connector import execute_query
except ImportError:
    execute_query = None
    logger.warning("Dependency unavailable: siem.connector.execute_query")

try:
    from formatter.response_formatter import format_response
except ImportError:
    format_response = None
    logger.warning(
        "Dependency unavailable: formatter.response_formatter.format_response"
    )


def _unavailable_response(session_id: str, component: str) -> ChatResponse:
    """
    Builds a graceful, structured ChatResponse when a required pipeline
    component is not yet available, avoiding application crashes or
    fabricated data.

    Args:
        session_id: The chat session identifier.
        component: Name of the unavailable component, for diagnostics.

    Returns:
        ChatResponse: A response indicating degraded service status.
    """
    return ChatResponse(
        status="error",
        session_id=session_id,
        summary=(
            f"SentinelAI cannot process this request because the "
            f"'{component}' module is not yet available. Please try again "
            f"once this component has been deployed."
        ),
        table_data=[],
        chart_data={},
    )


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Process a conversational query against SIEM data",
)
async def chat(payload: ChatRequest) -> ChatResponse:
    """
    Processes a user's natural-language query through the full SentinelAI
    pipeline: intent extraction, context retrieval, query generation, SIEM
    validation, SIEM execution, response formatting, and context persistence.

    Args:
        payload: Validated chat request containing session_id and message.

    Returns:
        ChatResponse: Structured response containing a summary, tabular
            data, and chart data derived from the SIEM query results.

    Raises:
        HTTPException:
            500 - Unexpected error during pipeline execution.
    """
    session_id = payload.session_id
    message = payload.message

    logger.info(
        "Chat request received | session_id=%s | message_length=%d",
        session_id,
        len(message),
    )

    try:
        # ------------------------------------------------------------
        # Step 1: Intent extraction
        # ------------------------------------------------------------
        if extract_intent is None:
            return _unavailable_response(session_id, "ai.intent.extract_intent")

        intent = await extract_intent(message)
        logger.info("Intent extracted | session_id=%s | intent=%s", session_id, intent)

        # ------------------------------------------------------------
        # Step 2: Retrieve conversation context
        # ------------------------------------------------------------
        if get_context is None:
            return _unavailable_response(
                session_id, "ai.context_manager.get_context"
            )

        context = await get_context(session_id)
        logger.info("Context retrieved | session_id=%s", session_id)

        # ------------------------------------------------------------
        # Step 3: Merge current query with context if needed
        # ------------------------------------------------------------
        merged_input = {
            "session_id": session_id,
            "message": message,
            "intent": intent,
            "context": context,
        }
        logger.debug("Merged input prepared | session_id=%s", session_id)

        # ------------------------------------------------------------
        # Step 4: Generate SIEM query
        # ------------------------------------------------------------
        if generate_query is None:
            return _unavailable_response(
                session_id, "ai.query_generator.generate_query"
            )

        siem_query = await generate_query(merged_input)
        logger.info("SIEM query generated | session_id=%s", session_id)

        # ------------------------------------------------------------
        # Step 5: Validate SIEM query
        # ------------------------------------------------------------
        if validate_query is None:
            return _unavailable_response(session_id, "siem.validator.validate_query")

        is_valid, validation_message = await validate_query(siem_query)
        if not is_valid:
            logger.warning(
                "SIEM query validation failed | session_id=%s | reason=%s",
                session_id,
                validation_message,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Generated query failed validation: {validation_message}",
            )

        logger.info("SIEM query validated | session_id=%s", session_id)

        # ------------------------------------------------------------
        # Step 6: Execute SIEM query
        # ------------------------------------------------------------
        if execute_query is None:
            return _unavailable_response(session_id, "siem.connector.execute_query")

        raw_results = await execute_query(siem_query)
        logger.info(
            "SIEM query executed | session_id=%s | result_count=%s",
            session_id,
            len(raw_results) if hasattr(raw_results, "__len__") else "unknown",
        )

        # ------------------------------------------------------------
        # Step 7: Format response
        # ------------------------------------------------------------
        if format_response is None:
            return _unavailable_response(
                session_id, "formatter.response_formatter.format_response"
            )

        formatted = await format_response(raw_results, intent=intent)
        logger.info("Response formatted | session_id=%s", session_id)

        # ------------------------------------------------------------
        # Step 8: Persist updated context
        # ------------------------------------------------------------
        if save_context is None:
            logger.warning(
                "Dependency unavailable: ai.context_manager.save_context | "
                "session_id=%s | context will not be persisted",
                session_id,
            )
        else:
            await save_context(session_id, message, formatted)
            logger.info("Context saved | session_id=%s", session_id)

        # ------------------------------------------------------------
        # Step 9: Return structured response
        # ------------------------------------------------------------
        return ChatResponse(
            status="success",
            session_id=session_id,
            summary=formatted.get("summary", ""),
            table_data=formatted.get("table_data", []),
            chart_data=formatted.get("chart_data", {}),
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Unhandled error in chat pipeline | session_id=%s | error=%s",
            session_id,
            str(exc),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request.",
        ) from exc