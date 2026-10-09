"""VeilProof FastAPI application."""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .db import SessionLocal, engine
from .errors import AppError
from .migrations import run_migrations
from .security.auth import AuthError
from .services.seed import seed_all

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("veilproof")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="VeilProof API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

    problems = settings.validate_runtime()
    if problems:
        raise RuntimeError("invalid configuration: " + "; ".join(problems))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-VeilProof-Receipt", "X-VeilProof-Warning"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        rid = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:12]
        request.state.request_id = rid
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        # Log path only; never query/body/credentials.
        logger.info("%s %s -> %s", request.method, request.url.path, response.status_code)
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "safe_message": exc.message,
                "request_id": getattr(request.state, "request_id", "unknown"),
                "retryable": exc.retryable,
                "field_errors": exc.field_errors,
            },
        )

    @app.exception_handler(AuthError)
    async def auth_error_handler(request: Request, exc: AuthError):
        return JSONResponse(
            status_code=401,
            content={
                "code": "unauthorized",
                "safe_message": "invalid or expired session",
                "request_id": getattr(request.state, "request_id", "unknown"),
                "retryable": False,
                "field_errors": [],
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        field_errors = [
            {"field": ".".join(str(p) for p in e.get("loc", [])), "message": e.get("msg", "invalid")}
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "code": "validation_error",
                "safe_message": "request failed validation",
                "request_id": getattr(request.state, "request_id", "unknown"),
                "retryable": False,
                "field_errors": field_errors,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        logger.error("unhandled error: %s", type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={
                "code": "internal_error",
                "safe_message": "an unexpected error occurred",
                "request_id": getattr(request.state, "request_id", "unknown"),
                "retryable": True,
                "field_errors": [],
            },
        )

    @app.on_event("startup")
    def _startup() -> None:
        version = run_migrations(engine)
        db = SessionLocal()
        try:
            summary = seed_all(db)
            db.commit()
        finally:
            db.close()
        logger.info("migrations at v%s; seed cases_created=%s", version, summary.get("cases_created"))

    from .routers import health, intake, meta, staff, tracking, verify, analysis

    api = "/api/v1"
    app.include_router(health.router)
    app.include_router(health.router, prefix=api)
    app.include_router(meta.router, prefix=api)
    app.include_router(intake.router, prefix=api)
    app.include_router(tracking.router, prefix=api)
    app.include_router(verify.router, prefix=api)
    app.include_router(staff.router, prefix=api)
    app.include_router(analysis.router, prefix=api)
    return app


app = create_app()
