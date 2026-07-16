import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from jose import jwt

from models.request_models import LoginRequest
from models.response_models import LoginResponse
# from app.services import auth_service


logger = logging.getLogger("sentinelai.auth")

router = APIRouter()


# --------------------------------------------------------------------------
# JWT Configuration
# --------------------------------------------------------------------------
# Secrets must be provided via environment variables. No hardcoded secrets.
JWT_SECRET_KEY: str | None = os.getenv("SENTINELAI_JWT_SECRET")
JWT_ALGORITHM: str = os.getenv("SENTINELAI_JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES: int = int(os.getenv("SENTINELAI_JWT_EXPIRATION_MINUTES", "60"))


def _create_access_token(subject: str) -> str:
    """
    Generates a signed JWT access token for an authenticated user.

    Args:
        subject: The unique identifier (username) to embed as the token subject.

    Returns:
        str: Encoded JWT access token.

    Raises:
        RuntimeError: If the JWT signing secret is not configured.
    """
    if not JWT_SECRET_KEY:
        raise RuntimeError(
            "SENTINELAI_JWT_SECRET environment variable is not configured."
        )

    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    payload = {
        "sub": subject,
        "iat": datetime.now(timezone.utc),
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate a user and issue an access token",
)
async def login(payload: LoginRequest) -> LoginResponse:
    """
    Authenticates a user against the authentication service and issues
    a JWT access token upon success.

    Args:
        payload: Validated login credentials (username, password).

    Returns:
        LoginResponse: JWT access token and token type.

    Raises:
        HTTPException:
            401 - Invalid credentials.
            500 - Unexpected server or configuration error.
    """
    logger.info("Login attempt received for username=%s", payload.username)

    try:
        is_authenticated = await auth_service.authenticate_user(
            username=payload.username,
            password=payload.password,
        )
    except Exception as exc:
        logger.error(
            "Authentication service error for username=%s | error=%s",
            payload.username,
            str(exc),
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service is currently unavailable.",
        ) from exc

    if not is_authenticated:
        logger.warning("Failed login attempt for username=%s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    try:
        access_token = _create_access_token(subject=payload.username)
    except RuntimeError as exc:
        logger.error("JWT signing failed: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to issue access token at this time.",
        ) from exc

    logger.info("Login successful for username=%s", payload.username)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
    )