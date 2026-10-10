"""Local identity-clue screening. Candidates require human review.
No evidence is forwarded to external services or persisted by this module.
"""

from __future__ import annotations

import io
import os
import re
import uuid
from dataclasses import dataclass, field
from typing import Literal

try:  # OpenCV is required for local face detection; the API must boot without it.
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:  # pragma: no cover - environment without opencv
    cv2 = None          # type: ignore[assignment]
    np = None           # type: ignore[assignment]
    CV2_AVAILABLE = False

try:  # Tesseract is optional; OCR is skipped when unavailable.
    import pytesseract
except ImportError:  # pragma: no cover - environment without tesseract binding
    pytesseract = None  # type: ignore[assignment]

from PIL import Image, ImageOps, ExifTags

# ── Types ─────────────────────────────────────────────────────────────────────

AnalysisState = Literal[
    "waiting", "analyzing", "review_required", "unsupported", "failed",
    "partially_analyzed"
]


@dataclass
class BoundingBox:
    x: int
    y: int
    w: int
    h: int


@dataclass
class FaceCandidate:
    id: str
    bbox: BoundingBox
    confidence_pct: float
    source_file: str
    frame_index: int | None = None
    page_index: int | None = None


@dataclass
class TextCandidate:
    id: str
    text: str
    category: Literal["name_pattern", "phone", "email", "address", "id_pattern", "raw"]
    bbox: BoundingBox
    source_file: str
    page_index: int | None = None
    confidence_pct: float = 0.0


@dataclass
class MetadataCandidate:
    id: str
    field: str
    value: str
    is_sensitive: bool
    source_file: str


@dataclass
class AnalysisManifest:
    file_name: str
    file_category: str
    state: AnalysisState
    faces: list[FaceCandidate] = field(default_factory=list)
    texts: list[TextCandidate] = field(default_factory=list)
    metadata: list[MetadataCandidate] = field(default_factory=list)
    voices: list[dict] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    image_width: int | None = None
    image_height: int | None = None


def _configure_tesseract() -> bool:
    if pytesseract is None or not CV2_AVAILABLE:
        return False
    from .tesseract_util import configure_tesseract
    return configure_tesseract()


# ── Fallback: Local OpenCV + Tesseract Detection ───────────────────────────────

_PHONE_RE = re.compile(
    r"(?<!\d)(\+91[\s\-]?)?[6-9]\d{9}(?!\d)|"
    r"\d{2,4}[\s\-]\d{6,8}"
)
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_NAME_RE = re.compile(
    r"\b(?:Mr|Mrs|Ms|Dr|Shri|Smt|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b|"
    r"\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b"
)
_ID_RE = re.compile(
    r"\b[A-Z]{3,5}\d{4,10}\b|"
    r"\b\d{4}\s?\d{4}\s?\d{4}\b|"
    r"[A-Z]{2}\d{2}[A-Z]{2}\d{4}"
)
_ADDR_KW = re.compile(
    r"\b(?:plot|flat|house|villa|road|street|nagar|colony|sector|phase|"
    r"district|tehsil|taluka|pincode|zip)\b",
    re.IGNORECASE,
)


def _classify(text: str) -> str:
    if _EMAIL_RE.search(text): return "email"
    if _PHONE_RE.search(text): return "phone"
    if _ID_RE.search(text): return "id_pattern"
    if _NAME_RE.search(text): return "name_pattern"
    if _ADDR_KW.search(text): return "address"
    return "raw"


_FACE_CASCADE = None


def _get_face_cascade() -> "cv2.CascadeClassifier":
    global _FACE_CASCADE
    if _FACE_CASCADE is None:
        _FACE_CASCADE = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    return _FACE_CASCADE


def _detect_faces_local(img_bgr: "np.ndarray", source_file: str) -> list[FaceCandidate]:
    if not CV2_AVAILABLE:
        return []
    from .identity_detection import face_regions
    return [FaceCandidate(id=f"face-{uuid.uuid4().hex[:8]}",
                          bbox=BoundingBox(x, y, w, h), confidence_pct=confidence,
                          source_file=source_file)
            for x, y, w, h, confidence in face_regions(img_bgr)]


def _run_ocr_local(img_bgr: "np.ndarray", source_file: str, include_raw: bool = False) -> list[TextCandidate]:
    if pytesseract is None or not CV2_AVAILABLE or not _configure_tesseract():
        return []
    try:
        data = pytesseract.image_to_data(img_bgr, output_type=pytesseract.Output.DICT, lang="eng")
    except Exception:
        return []
    # Group word tokens into lines before classifying: names like "Rahul Sharma"
    # arrive as separate tokens and are never matched word-by-word.
    lines: dict[tuple, list[int]] = {}
    for i, raw in enumerate(data["text"]):
        if not str(raw).strip():
            continue
        key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
        lines.setdefault(key, []).append(i)

    candidates = []
    for idxs in lines.values():
        line_text = " ".join(str(data["text"][i]).strip() for i in idxs).strip()
        if len(line_text) < 3:
            continue
        confs: list[float] = []
        for i in idxs:
            try:
                value = float(data["conf"][i])
                if value >= 0:
                    confs.append(value)
            except (ValueError, TypeError):
                continue
        conf = sum(confs) / len(confs) if confs else 0.0
        if conf < 55:
            continue
        from .identity_detection import person_spans
        if include_raw:
            spans = [(0, len(line_text), "raw")]
        else:
            # Keep the conservative person detector for names, while still
            # reporting other narrowly matched PII (phone/email/ID) without
            # turning an entire OCR sentence into one candidate.
            spans = [(start, end, "name_pattern") for start, end in person_spans(line_text)]
            spans.extend((match.start(), match.end(), "email") for match in _EMAIL_RE.finditer(line_text))
            spans.extend((match.start(), match.end(), "phone") for match in _PHONE_RE.finditer(line_text))
            spans.extend((match.start(), match.end(), "id_pattern") for match in _ID_RE.finditer(line_text))
        offsets = []
        cursor = 0
        for i in idxs:
            word = str(data["text"][i]).strip()
            offsets.append((cursor, cursor + len(word), i))
            cursor += len(word) + 1
        for start, end, category in spans:
            selected = [i for a, b, i in offsets if a < end and b > start]
            if not selected:
                continue
            x1 = min(int(data["left"][i]) for i in selected)
            y1 = min(int(data["top"][i]) for i in selected)
            x2 = max(int(data["left"][i]) + int(data["width"][i]) for i in selected)
            y2 = max(int(data["top"][i]) + int(data["height"][i]) for i in selected)
            candidates.append(TextCandidate(
                id=f"text-{uuid.uuid4().hex[:8]}", text=line_text[start:end],
                category=category,
                bbox=BoundingBox(x1, y1, x2-x1, y2-y1),
                confidence_pct=conf, source_file=source_file,
            ))
    return candidates


def _pil_to_bgr(pil_img: Image.Image):
    if not CV2_AVAILABLE:
        return None
    rgb = pil_img.convert("RGB")
    return cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)


def _local_detect(pil_img: Image.Image, file_name: str, manifest: AnalysisManifest) -> None:
    """Run local OpenCV + Tesseract detection; degrade gracefully when unavailable."""
    img_bgr = _pil_to_bgr(pil_img)
    if img_bgr is None:
        manifest.notes.append(
            "Local detection unavailable (OpenCV not installed). "
            "Faces and text were not screened — review this file manually."
        )
        return
    manifest.faces = _detect_faces_local(img_bgr, file_name)
    manifest.texts = _run_ocr_local(img_bgr, file_name)


# ── EXIF Metadata ──────────────────────────────────────────────────────────────

_SENSITIVE_EXIF = {
    "GPSInfo", "MakerNote", "UserComment", "Artist", "Copyright",
    "ImageDescription", "XPAuthor", "XPTitle", "XPSubject", "XPComment",
    "Software", "Make", "Model", "LensModel", "DateTime", "DateTimeOriginal",
    "DateTimeDigitized", "OwnerName", "CameraSerialNumber",
}
_ALWAYS_SENSITIVE = {"GPSInfo", "MakerNote", "Artist", "OwnerName", "CameraSerialNumber"}


def _extract_exif(pil_image: Image.Image, source_file: str) -> list[MetadataCandidate]:
    results = []
    try:
        raw_exif = pil_image._getexif()  # type: ignore[attr-defined]
        if not raw_exif:
            return results
        for tag_id, value in raw_exif.items():
            tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
            if tag_name not in _SENSITIVE_EXIF:
                continue
            display = "[GPS coordinates present]" if tag_name == "GPSInfo" else str(value)[:120]
            results.append(MetadataCandidate(
                id=f"meta-{uuid.uuid4().hex[:8]}",
                field=tag_name,
                value=display,
                is_sensitive=tag_name in _ALWAYS_SENSITIVE,
                source_file=source_file,
            ))
    except Exception:
        pass
    return results


# ── Image Analysis (Gemini or local fallback) ──────────────────────────────────

def analyze_image(image_bytes: bytes, file_name: str) -> AnalysisManifest:
    manifest = AnalysisManifest(
        file_name=file_name, file_category="image", state="analyzing"
    )
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        manifest.metadata = _extract_exif(pil_img, file_name)
        pil_img = ImageOps.exif_transpose(pil_img)
        manifest.image_width, manifest.image_height = pil_img.size

        if manifest.metadata:
            manifest.notes.append(
                f"{len(manifest.metadata)} EXIF/metadata field(s) detected. "
                "GPS, camera model, and timestamps will be stripped from the protected copy."
            )

        _local_detect(pil_img, file_name, manifest)
        manifest.state = "review_required" if CV2_AVAILABLE and _configure_tesseract() else "partially_analyzed"
        if not _configure_tesseract():
            manifest.notes.append("OCR unavailable: text was not screened. Inspect the original and mark any sensitive regions.")

    except Exception as exc:
        manifest.state = "failed"
        manifest.notes.append(
            f"Image analysis failed: {type(exc).__name__}. Original preserved unchanged."
        )
    return manifest


# ── PDF Analysis ──────────────────────────────────────────────────────────────

def _extract_pdf_metadata(doc, file_name: str, manifest: AnalysisManifest) -> None:
    """Record sensitive PDF document properties (author etc.) as candidates."""
    try:
        meta = doc.metadata or {}
    except Exception:
        return
    for field, sensitive in (
        ("author", True), ("title", False), ("subject", False),
        ("keywords", False), ("creator", False),
    ):
        value = str(meta.get(field) or "").strip()
        if not value:
            continue
        manifest.metadata.append(MetadataCandidate(
            id=f"meta-{uuid.uuid4().hex[:8]}",
            field=f"PDF {field.capitalize()}",
            value=value[:120],
            is_sensitive=sensitive,
            source_file=file_name,
        ))


def _analyze_pdf_local(pdf_bytes: bytes, file_name: str, manifest: AnalysisManifest) -> None:
    """Local PDF screening — no external API.

    1. Searchable text layer: names, phones, emails, IDs classified with the
       same rules as OCR (works without Tesseract).
    2. Per-page rendering: Haar face detection on every page.
    3. OCR on pages that have no text layer (scanned documents), when the
       Tesseract binary is available.
    """
    try:
        try:
            import pymupdf as fitz
        except ImportError:  # pragma: no cover - older PyMuPDF
            import fitz  # type: ignore[no-redef]
    except ImportError:
        manifest.state = "failed"
        manifest.notes.append("Local PDF analysis requires PyMuPDF, which is not installed.")
        return

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        _extract_pdf_metadata(doc, file_name, manifest)
        n_pages = doc.page_count
        if doc.is_encrypted or not 0 < n_pages <= 100:
            raise ValueError("Use an unlocked PDF with at most 100 pages")
        for page_index, page in enumerate(doc):
            # 1. Text layer (no OCR needed)
            page_had_text = False
            from .identity_detection import person_spans
            page_text = page.get_text() or ""
            page_had_text = bool(page_text.strip())
            for start, end in person_spans(page_text):
                name = page_text[start:end]
                for rect in page.search_for(name):
                    manifest.texts.append(TextCandidate(
                        id=f"text-{uuid.uuid4().hex[:8]}", text=name,
                        category="name_pattern",
                        bbox=BoundingBox(int(rect.x0*1.5), int(rect.y0*1.5),
                                         max(1, int(rect.width*1.5+1)), max(1, int(rect.height*1.5+1))),
                        source_file=file_name, page_index=page_index, confidence_pct=90.0,
                    ))

            # 2 + 3. Render the page for face detection; OCR only if the text
            # layer yielded nothing (scanned page) to avoid duplicate results.
            if not CV2_AVAILABLE:
                continue
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
            nparr = np.frombuffer(pix.samples, dtype=np.uint8)
            rgb = nparr.reshape(pix.height, pix.width, 3)
            img_bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            for face in _detect_faces_local(img_bgr, file_name):
                face.page_index = page_index
                manifest.faces.append(face)
            if not page_had_text:
                for text in _run_ocr_local(img_bgr, file_name):
                    text.page_index = page_index
                    manifest.texts.append(text)
    finally:
        doc.close()

    if manifest.faces or manifest.texts or manifest.metadata:
        manifest.state = "review_required"
        manifest.notes.append(
            f"Local analysis: {len(manifest.faces)} face candidate(s), "
            f"{len(manifest.texts)} person-name candidate(s) from the searchable text layer, "
            f"per-page rendering and OCR, and {len(manifest.metadata)} metadata field(s) "
            f"across {n_pages} page(s). Review each candidate — automated detection is not perfect."
        )
    else:
        manifest.state = "partially_analyzed"
        manifest.notes.append(
            f"Local analysis found no candidates across {n_pages} page(s). Detection can miss "
            "low-resolution, handwritten, or unusual content — review the protected copy manually."
        )


def analyze_pdf(pdf_bytes: bytes, file_name: str) -> AnalysisManifest:
    manifest = AnalysisManifest(file_name=file_name, file_category="document", state="analyzing")
    try:
        _analyze_pdf_local(pdf_bytes, file_name, manifest)
    except Exception:
        manifest.state = "failed"
        manifest.notes.append("PDF could not be analyzed. Use an unlocked, valid PDF.")
    return manifest


def analyze_audio(audio_bytes: bytes, file_name: str) -> AnalysisManifest:
    manifest = AnalysisManifest(file_name=file_name, file_category="audio", state="partially_analyzed")
    try:
        from pydub import AudioSegment, silence
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        intervals = silence.detect_nonsilent(audio, min_silence_len=400, silence_thresh=-40, seek_step=20)
        manifest.voices = [{"id": f"voice-{i}", "start": start / 1000, "end": end / 1000}
                           for i, (start, end) in enumerate(intervals[:500])]
        manifest.notes.append("Sound intervals may contain speech or noise, not identified speakers. Listen and mark reporter/whistleblower intervals. Spoken names require manual review.")
    except Exception:
        manifest.state = "failed"
        manifest.notes.append("Recording could not be decoded. Check FFmpeg and file format.")
    return manifest


# ── Video Analysis ─────────────────────────────────────────────────────────────

MAX_FRAMES = 30


def analyze_video(video_bytes: bytes, file_name: str) -> AnalysisManifest:
    manifest = AnalysisManifest(
        file_name=file_name, file_category="video", state="analyzing"
    )
    if not CV2_AVAILABLE:
        manifest.state = "failed"
        manifest.notes.append(
            "Video analysis requires OpenCV, which is not installed in this environment. "
            "The original file is preserved unchanged."
        )
        return manifest
    manifest.notes.append(
        f"Video is analyzed by sampling up to {MAX_FRAMES} frames (~1 per second). "
        "Faces appearing for less than 1 second between sampled frames may be missed."
    )

    import tempfile, os
    tmp_path = None
    cap = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            manifest.state = "failed"
            manifest.notes.append("Video could not be opened for analysis.")
            return manifest

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_interval = max(1, int(fps))

        manifest.image_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        manifest.image_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        seen_frames = 0
        frame_idx = 0

        while seen_frames < MAX_FRAMES:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                break

            for face in _detect_faces_local(frame, file_name):
                face.frame_index = frame_idx
                manifest.faces.append(face)
            for text in _run_ocr_local(frame, file_name):
                manifest.texts.append(text)

            frame_idx += sample_interval
            seen_frames += 1
            if frame_idx >= total_frames:
                break

        cap.release()

        if manifest.faces:
            manifest.notes.append(
                f"{len(manifest.faces)} face candidate(s) across sampled frames. "
                "Faces are not identified — review each and decide what to protect."
            )
        manifest.state = "review_required"

    except Exception as exc:
        manifest.state = "failed"
        manifest.notes.append(f"Video analysis failed: {type(exc).__name__}. Original preserved.")
    finally:
        if cap is not None:
            cap.release()
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return manifest


# ── Entry point ────────────────────────────────────────────────────────────────

def analyze_file(file_bytes: bytes, file_name: str, category: str) -> AnalysisManifest:
    if category == "image":
        return analyze_image(file_bytes, file_name)
    if category == "document":
        return analyze_pdf(file_bytes, file_name)
    if category == "audio":
        return analyze_audio(file_bytes, file_name)
    if category == "video":
        return analyze_video(file_bytes, file_name)

    manifest = AnalysisManifest(
        file_name=file_name, file_category=category, state="unsupported"
    )
    manifest.notes.append(f"Category '{category}' is not supported for automated analysis.")
    return manifest
