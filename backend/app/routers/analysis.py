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

import io
from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from ..config import get_settings
from ..services.analysis import analyze_file, AnalysisManifest
from ..services.redaction import (
    redact_image_content,
    redact_audio_content,
    redact_video_content,
)

router = APIRouter(prefix="/analysis", tags=["analysis"])

_MAX = None  # resolved at request time from settings


def _check_size(data: bytes) -> None:
    s = get_settings()
    if len(data) > s.max_upload_bytes:
        raise HTTPException(status_code=413, detail="file_too_large")


# ── Scan endpoint ─────────────────────────────────────────────────────────────

@router.post("/scan")
async def scan_file(
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
    allowed_categories = {"image", "document", "audio", "video"}
    if category not in allowed_categories:
        raise HTTPException(status_code=422, detail="unsupported_category")

    file_bytes = await file.read()
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
        "notes": manifest.notes,
    }


# ── Sanitize endpoint ─────────────────────────────────────────────────────────

@router.post("/sanitize")
async def sanitize_file(
    file: UploadFile = File(...),
    category: str = Form(...),
) -> Response:
    """
    Produce a sanitized derivative of the uploaded file.

    For images  : Blur all detected faces and redact OCR-detected text regions.
                  Strip all EXIF metadata from the output.
    For audio   : Selective voice pitch-shift on the dominant speaker.
                  Note: removing a spoken name does not anonymize speaker voice.
    For video   : Frame-by-frame face blurring via OpenCV.
                  ffmpeg must be available for audio remuxing.
    For PDFs    : Unsupported in this release (see notes).
    For others  : Returns 415 Unsupported Media Type.

    The original file is never modified.  The derivative is returned directly
    in the HTTP response body and is not stored server-side.

    Privacy guarantees:
      - No intermediate files are persisted after the response is sent.
      - Original file hash is preserved separately (caller's responsibility).
    """
    file_bytes = await file.read()
    _check_size(file_bytes)

    if category == "image":
        sanitized = redact_image_content(file_bytes)
        return Response(
            content=sanitized,
            media_type="image/jpeg",
            headers={
                "Content-Disposition": "attachment; filename=protected.jpg",
                "X-VeilProof-Protection": "faces-blurred,text-redacted,exif-stripped",
            },
        )

    elif category == "audio":
        sanitized = redact_audio_content(file_bytes)
        return Response(
            content=sanitized,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=protected.mp3",
                "X-VeilProof-Protection": "voice-pitch-shifted",
                "X-VeilProof-Warning": (
                    "Voice pitch-shifting reduces speaker recognition risk but "
                    "does not guarantee anonymization.  Spoken names are not "
                    "automatically removed."
                ),
            },
        )

    elif category == "video":
        sanitized = redact_video_content(file_bytes)
        media_type = "video/mp4"
        return Response(
            content=sanitized,
            media_type=media_type,
            headers={
                "Content-Disposition": "attachment; filename=protected.mp4",
                "X-VeilProof-Protection": "faces-blurred-on-sampled-frames",
                "X-VeilProof-Warning": (
                    "Video protection covers sampled frames only. "
                    "Brief appearances may be missed.  Verify the output."
                ),
            },
        )

    elif category == "document":
        raise HTTPException(
            status_code=415,
            detail={
                "code": "unsupported_format",
                "message": (
                    "PDF sanitization (genuine text-layer redaction) requires "
                    "PyMuPDF which is not yet installed.  "
                    "The original file is preserved unchanged.  "
                    "Convert the PDF to images for pixel-level protection."
                ),
            },
        )

    else:
        raise HTTPException(status_code=415, detail="unsupported_category")
