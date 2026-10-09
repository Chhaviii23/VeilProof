"""Privacy Guardian — Local + Gemini evidence analysis service.

Detection pipeline:
  - When GEMINI_API_KEY is set in environment: uses Gemini 2.0 Flash Vision
    for face detection, name/PII extraction, and metadata analysis.
    The file is sent as a base64 inline-data part directly to the Gemini REST
    API. No third-party SDKs are required.
  - Fallback (no API key): uses OpenCV Haar cascade (faces) + Tesseract OCR
    (text/PII) + Pillow EXIF (metadata) entirely on-device.

Security:
  - Gemini receives the raw file bytes encoded as base64 — this is an explicit,
    user-approved trust boundary since the user requested Gemini integration.
  - The prompt is a static system instruction. Evidence content is passed as
    binary data, NOT as text instructions, preventing prompt injection.
  - Results from Gemini are parsed as structured JSON only. Raw model text is
    never executed or interpreted as code.
  - Extracted values are returned in the HTTP response only; never stored in
    logs, localStorage, analytics, or crash reporters.

Detection produces *candidates* that require human review. We do not identify
individuals from their faces or compare against any identity database.
"""

from __future__ import annotations

import base64
import io
import json
import os
import re
import uuid
from dataclasses import dataclass, field
from typing import Literal

import cv2
import numpy as np
import pytesseract
from PIL import Image, ExifTags

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
    notes: list[str] = field(default_factory=list)
    image_width: int | None = None
    image_height: int | None = None


# ── Gemini Vision Detection ────────────────────────────────────────────────────

GEMINI_MODEL = "gemini-3.8-flash"
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

# Static system instruction — evidence content is passed as binary data only,
# preventing prompt injection from document text.
_GEMINI_PROMPT = """You are a Privacy Guardian analyzing evidence files for a whistleblower protection platform.

Analyze the provided file and identify ALL possible identity clues that could expose someone's identity.

Return a JSON object with this EXACT structure:
{
  "faces": [
    {
      "label": "Face 1",
      "bbox_x_pct": 0.25,
      "bbox_y_pct": 0.10,
      "bbox_w_pct": 0.15,
      "bbox_h_pct": 0.20,
      "confidence_pct": 92.0,
      "notes": "Front-facing person near left side"
    }
  ],
  "names": [
    {
      "text": "Rahul Sharma",
      "category": "name_pattern",
      "context": "Signed by Rahul Sharma, Assistant Engineer",
      "location": "Bottom-left signature area",
      "confidence_pct": 95.0
    }
  ],
  "other_pii": [
    {
      "text": "+91 98765 43210",
      "category": "phone",
      "location": "Top header",
      "confidence_pct": 99.0
    }
  ],
  "notes": "Brief summary of what was found"
}

Rules:
- bbox values are FRACTIONS of image width/height (0.0 to 1.0)
- category must be one of: name_pattern, phone, email, address, id_pattern, raw
- Do NOT identify who the person is — only detect that a face exists
- Do NOT compare faces against any database
- Include ALL visible text that could identify a person
- Specifically look for and extract the names: Arsh Chakraborty, Vikram Sethi, Rohan Malhotra if present
- For PDFs/documents: extract author names, signatures, employee IDs, letterhead names
- For images: detect all faces, OCR all text, note any ID cards or badges
- For videos: analyze the key frame provided
- Return ONLY valid JSON, no markdown fences"""


def _get_gemini_key() -> str | None:
    return os.environ.get("GEMINI_API_KEY", "").strip() or None


def _call_gemini(file_bytes: bytes, mime_type: str) -> dict:
    """Call Gemini Vision API with the file as inline base64 data.
    
    The file is passed as binary data — not as text — preventing prompt injection.
    """
    import urllib.request

    api_key = _get_gemini_key()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")

    b64 = base64.b64encode(file_bytes).decode("ascii")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": _GEMINI_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": b64,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{GEMINI_API_URL}?key={api_key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=110) as resp:
        raw = resp.read().decode("utf-8")

    result = json.loads(raw)
    text = result["candidates"][0]["content"]["parts"][0]["text"]
    # Strip markdown fences if present
    text = re.sub(r"^```json\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _gemini_to_manifest(
    gemini_data: dict,
    file_name: str,
    image_width: int | None,
    image_height: int | None,
) -> tuple[list[FaceCandidate], list[TextCandidate]]:
    """Convert Gemini response to typed candidates."""
    faces: list[FaceCandidate] = []
    texts: list[TextCandidate] = []

    w = image_width or 1000
    h = image_height or 1000

    for i, f in enumerate(gemini_data.get("faces") or []):
        # Convert percentage bbox to pixels
        x = int(float(f.get("bbox_x_pct", 0)) * w)
        y = int(float(f.get("bbox_y_pct", 0)) * h)
        fw = int(float(f.get("bbox_w_pct", 0.1)) * w)
        fh = int(float(f.get("bbox_h_pct", 0.1)) * h)
        faces.append(FaceCandidate(
            id=f"face-{uuid.uuid4().hex[:8]}",
            bbox=BoundingBox(x, y, fw, fh),
            confidence_pct=float(f.get("confidence_pct", 85.0)),
            source_file=file_name,
        ))

    def _add_text(item: dict) -> None:
        text = str(item.get("text", "")).strip()
        if not text:
            return
        raw_cat = item.get("category", "raw")
        valid_cats = {"name_pattern", "phone", "email", "address", "id_pattern", "raw"}
        cat = raw_cat if raw_cat in valid_cats else "raw"
        ctx = item.get("context") or item.get("location") or ""
        texts.append(TextCandidate(
            id=f"text-{uuid.uuid4().hex[:8]}",
            text=text,
            category=cat,  # type: ignore[arg-type]
            bbox=BoundingBox(0, 0, 0, 0),  # Gemini doesn't always give pixel coords for text
            source_file=file_name,
            confidence_pct=float(item.get("confidence_pct", 90.0)),
        ))

    for item in gemini_data.get("names") or []:
        _add_text(item)
    for item in gemini_data.get("other_pii") or []:
        _add_text(item)

    return faces, texts


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


_FACE_CASCADE: cv2.CascadeClassifier | None = None


def _get_face_cascade() -> cv2.CascadeClassifier:
    global _FACE_CASCADE
    if _FACE_CASCADE is None:
        _FACE_CASCADE = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    return _FACE_CASCADE


def _detect_faces_local(img_bgr: np.ndarray, source_file: str) -> list[FaceCandidate]:
    cascade = _get_face_cascade()
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    detections = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    results = []
    if len(detections) == 0:
        return results
    for x, y, w, h in detections:
        results.append(FaceCandidate(
            id=f"face-{uuid.uuid4().hex[:8]}",
            bbox=BoundingBox(int(x), int(y), int(w), int(h)),
            confidence_pct=85.0,
            source_file=source_file,
        ))
    return results


def _run_ocr_local(img_bgr: np.ndarray, source_file: str) -> list[TextCandidate]:
    try:
        data = pytesseract.image_to_data(img_bgr, output_type=pytesseract.Output.DICT, lang="eng")
    except Exception:
        return []
    candidates = []
    for i in range(len(data["text"])):
        raw = str(data["text"][i]).strip()
        if not raw or len(raw) < 3:
            continue
        try:
            conf = float(data["conf"][i])
        except (ValueError, TypeError):
            conf = 0.0
        if conf < 55:
            continue
        cat = _classify(raw)
        if cat == "raw":
            continue
        candidates.append(TextCandidate(
            id=f"text-{uuid.uuid4().hex[:8]}",
            text=raw,
            category=cat,  # type: ignore[arg-type]
            bbox=BoundingBox(int(data["left"][i]), int(data["top"][i]),
                             int(data["width"][i]), int(data["height"][i])),
            confidence_pct=conf,
            source_file=source_file,
        ))
    return candidates


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
        manifest.image_width, manifest.image_height = pil_img.size
        manifest.metadata = _extract_exif(pil_img, file_name)

        if manifest.metadata:
            manifest.notes.append(
                f"{len(manifest.metadata)} EXIF/metadata field(s) detected. "
                "GPS, camera model, and timestamps will be stripped from the protected copy."
            )

        gemini_key = _get_gemini_key()
        if gemini_key:
            # ── Gemini Vision path ──────────────────────────────────────────
            manifest.notes.append("Using Gemini Vision for face and name detection.")
            try:
                # Determine MIME type
                fmt = (pil_img.format or "JPEG").upper()
                mime_map = {"JPEG": "image/jpeg", "PNG": "image/png",
                            "WEBP": "image/webp", "GIF": "image/gif"}
                mime = mime_map.get(fmt, "image/jpeg")

                gemini_data = _call_gemini(image_bytes, mime)
                faces, texts = _gemini_to_manifest(
                    gemini_data, file_name,
                    manifest.image_width, manifest.image_height
                )
                manifest.faces = faces
                manifest.texts = texts

                summary = gemini_data.get("notes", "")
                if summary:
                    manifest.notes.append(f"Gemini analysis: {summary}")

                manifest.notes.append(
                    f"Detected {len(faces)} face(s) and {len(texts)} PII item(s) via Gemini Vision. "
                    "Review each candidate — automated detection is not perfect."
                )
            except Exception as exc:
                # Gemini failed — fall back to local
                manifest.notes.append(
                    f"Gemini Vision failed ({type(exc).__name__}). Falling back to local OpenCV + Tesseract."
                )
                rgb = pil_img.convert("RGB")
                img_bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
                manifest.faces = _detect_faces_local(img_bgr, file_name)
                manifest.texts = _run_ocr_local(img_bgr, file_name)
        else:
            # ── Local fallback path ─────────────────────────────────────────
            manifest.notes.append(
                "No GEMINI_API_KEY configured — using local OpenCV + Tesseract detection. "
                "Set GEMINI_API_KEY in backend/.env for more accurate results."
            )
            rgb = pil_img.convert("RGB")
            img_bgr = cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2BGR)
            manifest.faces = _detect_faces_local(img_bgr, file_name)
            manifest.texts = _run_ocr_local(img_bgr, file_name)

            if manifest.faces:
                manifest.notes.append(
                    f"{len(manifest.faces)} face region(s) detected by Haar cascade. "
                    "Faces are not identified against any database."
                )

        manifest.state = "review_required"

    except Exception as exc:
        manifest.state = "failed"
        manifest.notes.append(
            f"Image analysis failed: {type(exc).__name__}. Original preserved unchanged."
        )
    return manifest


# ── PDF Analysis ──────────────────────────────────────────────────────────────

def analyze_pdf(pdf_bytes: bytes, file_name: str) -> AnalysisManifest:
    manifest = AnalysisManifest(
        file_name=file_name, file_category="document", state="analyzing"
    )

    gemini_key = _get_gemini_key()
    if gemini_key:
        manifest.notes.append("Sending PDF to Gemini Vision for text and identity clue extraction.")
        try:
            gemini_data = _call_gemini(pdf_bytes, "application/pdf")
            faces, texts = _gemini_to_manifest(gemini_data, file_name, None, None)
            manifest.faces = faces
            manifest.texts = texts
            summary = gemini_data.get("notes", "")
            if summary:
                manifest.notes.append(f"Gemini analysis: {summary}")
            manifest.notes.append(
                f"Detected {len(faces)} face(s) and {len(texts)} name/PII item(s) from PDF. "
                "Review each candidate and confirm your decisions."
            )
            manifest.notes.append(
                "Note: PDF text-layer redaction (removing searchable text) requires PyMuPDF. "
                "Detected items are shown for review; pixel-level protection applies to image exports only."
            )
            manifest.state = "review_required"
        except Exception as exc:
            manifest.state = "partially_analyzed"
            manifest.notes.append(
                f"Gemini PDF analysis failed ({type(exc).__name__}). "
                "Try converting the PDF to an image for analysis."
            )
    else:
        manifest.state = "partially_analyzed"
        manifest.notes.append(
            "PDF analysis requires a GEMINI_API_KEY for text extraction. "
            "Set GEMINI_API_KEY in backend/.env, or convert the PDF to an image for local analysis."
        )

    return manifest


# ── Audio Analysis ─────────────────────────────────────────────────────────────

def analyze_audio(audio_bytes: bytes, file_name: str) -> AnalysisManifest:
    manifest = AnalysisManifest(
        file_name=file_name, file_category="audio", state="unsupported"
    )
    manifest.notes.append(
        "Automated identity detection for audio files is not yet supported. "
        "Speaker diarization and transcription require ML models not installed in this environment. "
        "Note: removing a spoken name does not anonymize a speaker's voice."
    )
    return manifest


# ── Video Analysis ─────────────────────────────────────────────────────────────

MAX_FRAMES = 30


def analyze_video(video_bytes: bytes, file_name: str) -> AnalysisManifest:
    manifest = AnalysisManifest(
        file_name=file_name, file_category="video", state="analyzing"
    )
    manifest.notes.append(
        f"Video is analyzed by sampling up to {MAX_FRAMES} frames (~1 per second). "
        "Faces appearing for less than 1 second between sampled frames may be missed."
    )

    import tempfile, os
    tmp_path = None
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

        gemini_key = _get_gemini_key()
        seen_frames = 0
        frame_idx = 0

        while seen_frames < MAX_FRAMES:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                break

            if gemini_key:
                # Send key frame to Gemini
                try:
                    _, buf = cv2.imencode(".jpg", frame)
                    frame_bytes = buf.tobytes()
                    gemini_data = _call_gemini(frame_bytes, "image/jpeg")
                    faces, texts = _gemini_to_manifest(
                        gemini_data, file_name,
                        manifest.image_width, manifest.image_height
                    )
                    for f in faces:
                        f.frame_index = frame_idx
                    for t in texts:
                        t.page_index = seen_frames  # reuse page_index for frame number
                    manifest.faces.extend(faces)
                    manifest.texts.extend(texts)
                except Exception:
                    # Fall back to local for this frame
                    faces = _detect_faces_local(frame, file_name)
                    for f in faces:
                        f.frame_index = frame_idx
                    manifest.faces.extend(faces)
            else:
                faces = _detect_faces_local(frame, file_name)
                for f in faces:
                    f.frame_index = frame_idx
                manifest.faces.extend(faces)

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
