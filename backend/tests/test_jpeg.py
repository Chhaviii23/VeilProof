"""Real JPEG metadata protection tests (P04B)."""

from __future__ import annotations

import pytest

from app.services import jpeg
from gen_fixture_jpeg import build_fixture


def test_inspect_finds_seeded_metadata():
    data = build_fixture()
    findings, removed = jpeg.inspect(data)
    fields = {f.field for f in findings}
    assert "GPS coordinates" in fields
    assert "Device model" in fields
    assert "DateTime" in fields
    assert "GPS coordinates" in removed


def test_protect_removes_metadata_and_preserves_dimensions():
    data = build_fixture()
    result = jpeg.protect(data)
    assert result.original_sha256 != result.protected_sha256
    assert (result.width, result.height) == (320, 240)
    find, _ = jpeg.inspect(result.derivative_bytes)
    assert find == []
    assert result.derivative_bytes[:3] == b"\xff\xd8\xff"


def test_malformed_image_rejected():
    with pytest.raises(jpeg.UnsupportedMedia):
        jpeg.inspect(b"not an image")


def test_non_jpeg_rejected():
    from PIL import Image
    import io

    buf = io.BytesIO()
    Image.new("RGB", (10, 10)).save(buf, format="PNG")
    with pytest.raises(jpeg.UnsupportedMedia):
        jpeg.inspect(buf.getvalue())
