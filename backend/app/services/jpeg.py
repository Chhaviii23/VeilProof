"""Real JPEG Privacy Guardian pipeline (P04B).

Reads supported EXIF/GPS/device fields, preserves the exact original bytes, normalizes
orientation, and produces a metadata-minimized derivative. Reinspection confirms the metadata
absence. This is *not* visible-content anonymization: faces/names in pixels remain unless a
controlled fixture is used.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field

from PIL import Image, ImageOps

MAX_PIXELS = 40_000_000

TAG_NAMES = {
    271: ("Device make", "medium"),
    272: ("Device model", "medium"),
    305: ("Software", "medium"),
    306: ("DateTime", "medium"),
    315: ("Artist", "high"),
    33432: ("Copyright", "medium"),
    36867: ("DateTimeOriginal", "medium"),
    42036: ("LensModel", "low"),
    270: ("ImageDescription", "medium"),
}


class UnsupportedMedia(Exception):
    pass


@dataclass
class Finding:
    field: str
    value: str
    risk: str


@dataclass
class ProtectionResult:
    original_sha256: str
    protected_sha256: str
    derivative_bytes: bytes
    findings: list[Finding] = field(default_factory=list)
    removed_fields: list[str] = field(default_factory=list)
    width: int = 0
    height: int = 0


def _load(data: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as exc:
        raise UnsupportedMedia("not a decodable image") from exc
    if img.format not in {"JPEG", "JPG", "MPO"}:
        raise UnsupportedMedia(f"unsupported image format {img.format!r}")
    if img.width * img.height > MAX_PIXELS:
        raise UnsupportedMedia("image exceeds pixel limit")
    return img


def inspect(data: bytes) -> tuple[list[Finding], list[str]]:
    """Return supported metadata findings and their field names."""
    img = _load(data)
    findings: list[Finding] = []
    try:
        exif = img.getexif()
    except Exception:
        exif = {}
    for tag_id, value in dict(exif).items():
        if tag_id in TAG_NAMES:
            name, risk = TAG_NAMES[tag_id]
            text = str(value)
            if len(text) > 200:
                text = text[:200]
            findings.append(Finding(name, text, risk))
    # GPS IFD
    try:
        gps_ifd = exif.get_ifd(0x8825) if exif else {}
    except Exception:
        gps_ifd = {}
    if gps_ifd:
        lat = _gps_to_decimal(gps_ifd.get(2), gps_ifd.get(1))
        lon = _gps_to_decimal(gps_ifd.get(4), gps_ifd.get(3))
        if lat is not None and lon is not None:
            findings.append(Finding("GPS coordinates", f"{lat:.4f}, {lon:.4f}", "high"))
        else:
            findings.append(Finding("GPS metadata", "present", "high"))
    exif_ifd = {}
    try:
        exif_ifd = exif.get_ifd(0x8769) if exif else {}
    except Exception:
        exif_ifd = {}
    for tag_id, (name, risk) in {
        36867: ("DateTimeOriginal", "medium"),
        36868: ("DateTimeDigitized", "medium"),
    }.items():
        if exif_ifd.get(tag_id):
            findings.append(Finding(name, str(exif_ifd[tag_id])[:80], risk))
    removed = sorted({f.field for f in findings})
    return findings, removed


def _gps_to_decimal(coord, ref) -> float | None:
    try:
        if not coord or len(coord) != 3:
            return None
        deg, minute, sec = (float(x) for x in coord)
        value = deg + minute / 60 + sec / 3600
        if ref in ("S", "W"):
            value = -value
        return value
    except Exception:
        return None


def protect(data: bytes) -> ProtectionResult:
    """Preserve original bytes, normalize orientation, and emit a minimized derivative."""
    from ..security.crypto import sha256_hex

    findings, removed = inspect(data)
    img = _load(data)
    oriented = ImageOps.exif_transpose(img)
    if oriented.mode not in ("RGB", "L"):
        oriented = oriented.convert("RGB")
    buf = io.BytesIO()
    # Re-encoding without an exif payload drops all metadata (allowlist = none).
    oriented.save(buf, format="JPEG", quality=92, optimize=True, exif=b"")
    derivative = buf.getvalue()

    # Independent reinspection of the derivative.
    d_findings, d_removed = inspect(derivative)
    if d_findings:
        # Should never happen; surface honestly if it does.
        removed = removed + [f"reinspect:{f}" for f in d_removed]

    return ProtectionResult(
        original_sha256=sha256_hex(data),
        protected_sha256=sha256_hex(derivative),
        derivative_bytes=derivative,
        findings=findings,
        removed_fields=removed,
        width=oriented.width,
        height=oriented.height,
    )
