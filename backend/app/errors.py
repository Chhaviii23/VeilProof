"""Safe application errors. Responses never contain parser dumps, SQL, paths, or tracebacks."""

from __future__ import annotations


class AppError(Exception):
    status_code = 400
    code = "error"
    retryable = False

    def __init__(self, message: str, *, field_errors: list[dict] | None = None):
        super().__init__(message)
        self.message = message
        self.field_errors = field_errors or []


class ValidationFailure(AppError):
    status_code = 422
    code = "validation_error"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"


class RateLimitedError(AppError):
    status_code = 429
    code = "rate_limited"
    retryable = True


class PayloadTooLargeError(AppError):
    status_code = 413
    code = "payload_too_large"


class UnavailableError(AppError):
    status_code = 503
    code = "unavailable"
    retryable = True
