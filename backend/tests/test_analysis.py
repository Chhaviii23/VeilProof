"""Privacy Guardian analysis tests.

Covers the fixes for:
  - PDFs returning zero candidates whenever Gemini was unavailable (quota/unset)
  - OCR classifying word tokens individually, so names like "Rahul Sharma"
    were never matched
  - scans depending on the GEMINI_API_KEY being usable
"""

from __future__ import annotations

import io

import pymupdf
from PIL import Image, ImageDraw, ImageFont

from app.services.analysis import analyze_file


def _no_gemini(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)


def _letterhead_jpeg() -> bytes:
    img = Image.new("RGB", (1200, 500), "white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", 32)
    except Exception:
        font = ImageFont.load_default()
    draw.text((30, 40), "Employee: Rahul Sharma", fill="black", font=font)
    draw.text((30, 110), "Phone: 9876543210", fill="black", font=font)
    draw.text((30, 180), "Email: rahul.sharma@pwd.gov.in", fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def test_image_ocr_detects_names_phones_emails(monkeypatch):
    _no_gemini(monkeypatch)
    manifest = analyze_file(_letterhead_jpeg(), "letterhead.jpg", "image")
    assert manifest.state == "review_required"
    categories = {t.category for t in manifest.texts}
    assert "name_pattern" in categories, f"names not detected: {[t.text for t in manifest.texts]}"
    assert "phone" in categories
    assert "email" in categories
    # Line-level grouping keeps the full name in one candidate.
    assert any("Rahul Sharma" in t.text for t in manifest.texts)


def test_pdf_local_fallback_detects_names_faces_and_metadata(monkeypatch):
    _no_gemini(monkeypatch)
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 100), "Whistleblower: Arsh Chakraborty")
    page.insert_text((72, 130), "Signed: Vikram Sethi, Assistant Engineer")
    doc.set_metadata({"author": "Rohan Malhotra"})
    pdf = doc.tobytes()
    doc.close()

    manifest = analyze_file(pdf, "memo.pdf", "document")
    assert manifest.state == "review_required"
    texts = " ".join(t.text for t in manifest.texts)
    assert "Arsh Chakraborty" in texts
    assert "Vikram Sethi" in texts
    assert any(m.field == "PDF Author" and "Rohan Malhotra" in m.value for m in manifest.metadata)


def test_pdf_scan_endpoint_returns_candidates(client, monkeypatch):
    """The /analysis/scan endpoint must return candidates for PDFs without Gemini."""
    _no_gemini(monkeypatch)
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 100), "Contact: Priya Nair, +911234567890")
    pdf = doc.tobytes()
    doc.close()

    r = client.post(
        "/api/v1/analysis/scan",
        files={"file": ("memo.pdf", pdf, "application/pdf")},
        data={"category": "document"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["state"] == "review_required"
    assert any("Priya Nair" in t["text"] for t in body["texts"])
