"""Privacy Guardian — analysis and sanitization API endpoints.

POST /api/v1/analysis/scan
  Accepts a raw file upload, runs local detection (faces, OCR, metadata).
  Returns a JSON manifest of candidates for human review.
  Never forwards evidence to external APIs.
  Never stores extracted text, face crops, or metadata in logs.

POST /api/v1/analysis/sanitize
  Accepts the original file plus a list of confirmed protection choices.
  Produces a sanitized derivative file.
  Original bytes are never modified.

Security boundaries:
  - No authentication required for scan (reporter flow, pre-submission).
  - File size limit enforced from settings.
  - Temporary files are deleted after processing.
  - No extraction results are persisted beyond the HTTP response.
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from ..config import get_settings
from ..services.analysis import analyze_file, AnalysisManifest

router = APIRouter(prefix="/analysis", tags=["analysis"])


def _check_size(data: bytes) -> None:
    s = get_settings()
    if len(data) > s.max_upload_bytes:
        raise HTTPException(status_code=413, detail="file_too_large")


# ── Scan endpoint ─────────────────────────────────────────────────────────────

@router.post("/scan")
def scan_file(
    response: Response,
    file: UploadFile = File(...),
    category: str = Form(...),
) -> dict:
    """
    Run local identity-clue detection on an uploaded file.

    Parameters
    ----------
    file : UploadFile
        The raw evidence file.  Treated as untrusted data — its contents are
        never interpreted as instructions.
    category : str
        One of 'image', 'document', 'audio', 'video'.

    Returns
    -------
    JSON manifest with face candidates, text candidates, and metadata fields.
    All bounding boxes are in pixels relative to the original image dimensions.

    Privacy guarantees:
      - No data is sent to external AI APIs or scanning services.
      - Extracted values are returned only in this HTTP response; not logged.
      - Temporary files are deleted immediately after processing.
    """
    response.headers["Cache-Control"] = "no-store"
    allowed_categories = {"image", "document", "audio", "video"}
    if category not in allowed_categories:
        raise HTTPException(status_code=422, detail="unsupported_category")

    file_bytes = file.file.read(get_settings().max_upload_bytes + 1)
    _check_size(file_bytes)

    file_name = file.filename or "upload"
    # Sanitize filename before any use — treat as untrusted
    safe_name = "".join(c for c in file_name if c.isalnum() or c in "._- ")[:128]

    try:
        manifest: AnalysisManifest = analyze_file(file_bytes, safe_name, category)
    except Exception as exc:
        # Never surface internal exception text (may contain partial file data paths)
        raise HTTPException(status_code=500, detail="analysis_failed")

    # Serialize manifest to dict for JSON response.
    # Faces carry only bbox + confidence, never pixel crops.
    return {
        "file_name": manifest.file_name,
        "file_category": manifest.file_category,
        "state": manifest.state,
        "image_width": manifest.image_width,
        "image_height": manifest.image_height,
        "faces": [
            {
                "id": f.id,
                "bbox": asdict(f.bbox),
                "confidence_pct": f.confidence_pct,
                "source_file": f.source_file,
                "frame_index": f.frame_index,
                "page_index": f.page_index,
            }
            for f in manifest.faces
        ],
        "texts": [
            {
                "id": t.id,
                "text": t.text,
                "category": t.category,
                "bbox": asdict(t.bbox),
                "confidence_pct": t.confidence_pct,
                "source_file": t.source_file,
                "page_index": t.page_index,
            }
            for t in manifest.texts
        ],
        "metadata": [
            {
                "id": m.id,
                "field": m.field,
                "value": m.value,
                "is_sensitive": m.is_sensitive,
                "source_file": m.source_file,
            }
            for m in manifest.metadata
        ],
        "voices": manifest.voices,
        "notes": manifest.notes,
    }


# Sanitization runs in a worker thread, so media processing does not block API I/O.
@router.post("/sanitize")
def sanitize_file(file: UploadFile = File(...), category: str = Form(...),
                  plan: str = Form(...)) -> Response:
    from pydantic import ValidationError
    from ..services.protection import ProtectionPlan, protect, receipt
    file_bytes = file.file.read(get_settings().max_upload_bytes + 1)
    _check_size(file_bytes)
    if category not in {"image", "document", "audio", "video"}:
        raise HTTPException(status_code=415, detail="unsupported_category")
    try:
        choices = ProtectionPlan.model_validate_json(plan)
    except ValidationError:
        raise HTTPException(status_code=422, detail="Invalid protection choices")
    try:
        sanitized = protect(file_bytes, category, choices)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=422, detail="Protection could not complete. Check media tools and file format; original preserved.")
    if not sanitized:
        raise HTTPException(status_code=422, detail="Protection produced an empty file")
    if len(sanitized) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="Protected copy exceeds the upload limit. Reduce the source file size and regenerate.")
    mime, ext = {"image": ("image/jpeg", "jpg"), "document": ("application/pdf", "pdf"),
                 "audio": ("audio/mpeg", "mp3"), "video": ("video/mp4", "mp4")}[category]
    return Response(content=sanitized, media_type=mime, headers={
        "Content-Disposition": f"attachment; filename=protected.{ext}",
        "X-VeilProof-Receipt": receipt(file_bytes, sanitized, category),
        "Cache-Control": "no-store",
    })
