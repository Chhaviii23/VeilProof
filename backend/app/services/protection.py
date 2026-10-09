"""Reporter-selected redaction and signed, hash-bound derivative receipts.

Receipts contain hashes only, not identity selections. Staff must still review
the resulting copy before releasing it to investigators.
"""
import io
import time

import jwt
from pydantic import BaseModel, Field, ConfigDict, model_validator

from ..security.crypto import sha256_hex
from ..security.keys import session_secret


class Region(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    w: int = Field(gt=0)
    h: int = Field(gt=0)
    page_index: int | None = Field(default=None, ge=0)


class Interval(BaseModel):
    start: float = Field(ge=0, allow_inf_nan=False)
    end: float = Field(gt=0, allow_inf_nan=False)

    @model_validator(mode="after")
    def ordered(self):
        if self.end <= self.start:
            raise ValueError("Audio interval must end after it starts")
        return self


class ProtectionPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    regions: list[Region] = Field(default_factory=list, max_length=1000)
    terms: list[str] = Field(default_factory=list, max_length=100)
    audio: str = Field(default="mute", pattern="^(mute|intervals|keep)$")
    intervals: list[Interval] = Field(default_factory=list, max_length=500)
    protect_video: bool = True


def receipt(original: bytes, derivative: bytes, category: str) -> str:
    return jwt.encode({
        "aud": "veilproof-protected-copy", "exp": int(time.time()) + 86400,
        "original": sha256_hex(original), "derivative": sha256_hex(derivative),
        "category": category,
    }, session_secret(), algorithm="HS256")


def verify_receipt(token: str, original_hash: str, derivative_hash: str, category: str) -> bool:
    try:
        data = jwt.decode(token, session_secret(), algorithms=["HS256"],
                          audience="veilproof-protected-copy", options={"require": ["exp", "aud"]})
        return (data.get("original") == original_hash and data.get("derivative") == derivative_hash
                and data.get("category") == category)
    except jwt.PyJWTError:
        return False


def _cover(image, regions):
    from PIL import ImageDraw
    draw = ImageDraw.Draw(image)
    for r in regions:
        if r.x >= image.width or r.y >= image.height:
            raise ValueError("Redaction region is outside the image")
        draw.rectangle((max(0, r.x - 4), max(0, r.y - 4),
                        min(image.width, r.x + r.w + 4), min(image.height, r.y + r.h + 4)), fill="black")


def protect(data: bytes, category: str, plan: ProtectionPlan) -> bytes:
    from PIL import Image, ImageOps
    if category == "image":
        with Image.open(io.BytesIO(data)) as src:
            if getattr(src, "n_frames", 1) > 1:
                raise ValueError("Animated images must be converted to video or a still image")
            from ..config import get_settings
            if src.width * src.height > get_settings().max_image_pixels:
                raise ValueError("Image exceeds the supported pixel limit")
            image = ImageOps.exif_transpose(src).convert("RGB")
        if plan.terms:
            from .analysis import _configure_tesseract, _pil_to_bgr, _run_ocr_local
            if not _configure_tesseract():
                raise ValueError("OCR is unavailable; mark image regions instead")
            matches = _run_ocr_local(_pil_to_bgr(image), "evidence", include_raw=True)
            for term in plan.terms:
                found = [t for t in matches if term.casefold() in t.text.casefold()]
                if not found:
                    raise ValueError("A requested name could not be located; mark its image region")
                _cover(image, [t.bbox for t in found])
        _cover(image, plan.regions)
        out = io.BytesIO()
        image.save(out, format="JPEG", quality=95)
        return out.getvalue()
    if category == "document":
        import pymupdf as fitz
        with fitz.open(stream=data, filetype="pdf") as src, fitz.open() as dst:
            if src.is_encrypted or not 0 < len(src) <= 100:
                raise ValueError("Use an unlocked PDF with at most 100 pages")
            found_terms = set()
            for idx, page in enumerate(src):
                # Render at the same scale used by local face/OCR analysis.
                pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), colorspace=fitz.csRGB, alpha=False)
                image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                _cover(image, [r for r in plan.regions if r.page_index == idx])
                for term in plan.terms:
                    hits = page.search_for(term)
                    if hits:
                        found_terms.add(term)
                    _cover(image, [Region(x=int(r.x0 * 1.5), y=int(r.y0 * 1.5),
                                          w=max(1, int(r.width * 1.5)), h=max(1, int(r.height * 1.5))) for r in hits])
                out = io.BytesIO()
                image.save(out, format="PNG")
                target = dst.new_page(width=page.rect.width, height=page.rect.height)
                target.insert_image(target.rect, stream=out.getvalue())
            if any(t not in found_terms for t in plan.terms):
                raise ValueError("A requested name was not found in PDF text; use detected OCR regions for scans")
            if any(r.page_index is None or r.page_index >= len(src) for r in plan.regions):
                raise ValueError("Invalid PDF redaction page")
            return dst.tobytes(garbage=4, deflate=True)
    if category == "audio":
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(data))
        if not len(audio):
            raise ValueError("Empty recording")
        if plan.audio == "mute":
            audio = audio - 120
        elif plan.audio == "intervals":
            if not plan.intervals:
                raise ValueError("Select at least one audio interval")
            for interval in plan.intervals:
                start, end = int(interval.start * 1000), int(interval.end * 1000)
                if end > len(audio):
                    raise ValueError("Audio interval exceeds recording duration")
                audio = audio[:start] + (audio[start:end] - 120) + audio[end:]
        out = io.BytesIO()
        audio.export(out, format="mp3", tags={})
        return out.getvalue()
    if category == "video":
        from .redaction import redact_video_content
        return redact_video_content(data, protect_visuals=plan.protect_video, mute_audio=plan.audio != "keep")
    raise ValueError("Unsupported file category")
