import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes import chat_routes, report_routes, history_routes, auth_routes


# --------------------------------------------------------------------------
# Logging Configuration
# --------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("sentinelai")


# --------------------------------------------------------------------------
# CORS Configuration
# --------------------------------------------------------------------------
ALLOWED_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://localhost:8080",
]


# --------------------------------------------------------------------------
# Application Lifespan (Startup / Shutdown)
# --------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown lifecycle events.

    Startup:
        - Initializes logging
        - Reserved for future Redis / Elasticsearch / Wazuh connections

    Shutdown:
        - Gracefully closes resources
        - Reserved for future connection pool teardown
    """
    logger.info("SentinelAI is starting up...")
    logger.info("Version: 1.0.0 | Environment initialized.")
    # Future: initialize Redis connection pool
    # Future: initialize Elasticsearch/Wazuh client

    yield

    logger.info("SentinelAI is shutting down...")
    # Future: close Redis connection pool
    # Future: close Elasticsearch/Wazuh client
    logger.info("Shutdown complete. All resources released.")


# --------------------------------------------------------------------------
# FastAPI Application Initialization
# --------------------------------------------------------------------------
app = FastAPI(
    title="SentinelAI",
    version="1.0.0",
    description="Enterprise AI-powered Security Intelligence and SIEM Assistant.",
    lifespan=lifespan,
)


# --------------------------------------------------------------------------
# Middleware
# --------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Exception Handlers
# --------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handles all raised HTTPExceptions and returns a consistent JSON error format.
    """
    logger.warning(
        "HTTPException | path=%s | status=%s | detail=%s",
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": exc.status_code,
            "message": exc.detail,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catches all unhandled exceptions to prevent server crashes and
    returns a sanitized JSON error response.
    """
    logger.error(
        "Unhandled exception | path=%s | error=%s",
        request.url.path,
        str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "message": "An unexpected internal server error occurred.",
        },
    )


# --------------------------------------------------------------------------
# Router Registration
# --------------------------------------------------------------------------
app.include_router(auth_routes.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(chat_routes.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(report_routes.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(history_routes.router, prefix="/api/v1/history", tags=["History"])


# --------------------------------------------------------------------------
# Health Check Endpoint
# --------------------------------------------------------------------------
@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    """
    Health check endpoint used for readiness and liveness probes.

    Returns:
        dict: Service status, name, and version information.
    """
    return {
        "status": "ok",
        "service": "SentinelAI",
        "version": "1.0.0",
    }