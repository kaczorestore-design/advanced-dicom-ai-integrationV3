from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from typing import Union
import traceback

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Custom API error with structured response"""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = None,
        details: dict = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or f"API_ERROR_{status_code}"
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(APIError):
    """Validation error"""

    def __init__(self, message: str, field: str = None, details: dict = None):
        super().__init__(
            message=message,
            status_code=422,
            error_code="VALIDATION_ERROR",
            details={"field": field, **(details or {})},
        )


class AuthenticationError(APIError):
    """Authentication error"""

    def __init__(self, message: str = "Authentication failed", details: dict = None):
        super().__init__(
            message=message,
            status_code=401,
            error_code="AUTHENTICATION_ERROR",
            details=details or {},
        )


class AuthorizationError(APIError):
    """Authorization error"""

    def __init__(self, message: str = "Access denied", details: dict = None):
        super().__init__(
            message=message,
            status_code=403,
            error_code="AUTHORIZATION_ERROR",
            details=details or {},
        )


class NotFoundError(APIError):
    """Resource not found error"""

    def __init__(
        self, resource: str, identifier: Union[str, int] = None, details: dict = None
    ):
        message = f"{resource} not found"
        if identifier:
            message += f" (ID: {identifier})"
        super().__init__(
            message=message,
            status_code=404,
            error_code="RESOURCE_NOT_FOUND",
            details={"resource": resource, "identifier": identifier, **(details or {})},
        )


class ConflictError(APIError):
    """Resource conflict error"""

    def __init__(self, message: str, resource: str = None, details: dict = None):
        super().__init__(
            message=message,
            status_code=409,
            error_code="RESOURCE_CONFLICT",
            details={"resource": resource, **(details or {})},
        )


class RateLimitError(APIError):
    """Rate limit exceeded error"""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: int = None,
        details: dict = None,
    ):
        super().__init__(
            message=message,
            status_code=429,
            error_code="RATE_LIMIT_EXCEEDED",
            details={"retry_after": retry_after, **(details or {})},
        )


class ServiceUnavailableError(APIError):
    """Service unavailable error"""

    def __init__(self, service: str, message: str = None, details: dict = None):
        message = message or f"{service} service is currently unavailable"
        super().__init__(
            message=message,
            status_code=503,
            error_code="SERVICE_UNAVAILABLE",
            details={"service": service, **(details or {})},
        )


def create_error_response(error: APIError, request: Request = None) -> JSONResponse:
    """Create standardized error response"""
    response_data = {
        "error": {
            "message": error.message,
            "code": error.error_code,
            "status_code": error.status_code,
            "details": error.details,
        }
    }

    if request:
        response_data["error"]["path"] = str(request.url.path)
        response_data["error"]["method"] = request.method

    # Log error for monitoring
    logger.error(
        f"API Error: {error.error_code} - {error.message}",
        extra={
            "status_code": error.status_code,
            "error_code": error.error_code,
            "details": error.details,
            "path": str(request.url.path) if request else None,
        },
    )

    return JSONResponse(status_code=error.status_code, content=response_data)


async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle custom API errors"""
    return create_error_response(exc, request)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions"""
    api_error = APIError(
        message=exc.detail,
        status_code=exc.status_code,
        error_code=f"HTTP_{exc.status_code}",
    )
    return create_error_response(api_error, request)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle request validation errors"""
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append({"field": field, "message": error["msg"], "type": error["type"]})

    api_error = ValidationError(
        message="Request validation failed", details={"validation_errors": errors}
    )
    return create_error_response(api_error, request)


async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """Handle SQLAlchemy database errors"""
    logger.error(f"Database error: {str(exc)}", exc_info=True)

    if isinstance(exc, IntegrityError):
        api_error = ConflictError(
            message="Database constraint violation",
            details={"database_error": "Integrity constraint failed"},
        )
    else:
        api_error = APIError(
            message="Database operation failed",
            status_code=500,
            error_code="DATABASE_ERROR",
            details={"database_error": "Internal database error"},
        )

    return create_error_response(api_error, request)


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions"""
    logger.error(
        f"Unexpected error: {str(exc)}",
        exc_info=True,
        extra={
            "path": str(request.url.path),
            "method": request.method,
            "traceback": traceback.format_exc(),
        },
    )

    api_error = APIError(
        message="An unexpected error occurred",
        status_code=500,
        error_code="INTERNAL_SERVER_ERROR",
        details={"error_type": type(exc).__name__},
    )

    return create_error_response(api_error, request)


def setup_error_handlers(app):
    """Setup all error handlers for the FastAPI app"""
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
