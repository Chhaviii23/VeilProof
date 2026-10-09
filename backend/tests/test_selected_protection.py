"""Tests verify output pixels/audio and the bytes actually entering staff review."""
import io
import json
import secrets

import pytest
from PIL import Image
from pydub import AudioSegment
from pydub.generators import Sine

from app.services.protection import ProtectionPlan, protect, verify_receipt
from app.security.crypto import sha256_hex
from tests.helpers import API, DEFAULT_DESC, _upload_object


def image_bytes():
    out = io.BytesIO()
    Image.new("RGB", (200, 100), "white").save(out, format="PNG")
    return out.getvalue()


def sanitize(client, data, category, plan):
    return client.post(f"{API}/analysis/sanitize", files={"file": ("evidence", data)},
                       data={"category": category, "plan": json.dumps(plan)})


def test_only_selected_pixels_are_concealed(client):
    source = image_bytes()
    response = sanitize(client, source, "image", {"regions": [{"x": 20, "y": 20, "w": 40, "h": 40}]})
    assert response.status_code == 200, response.text
    img = Image.open(io.BytesIO(response.content))
    assert max(img.getpixel((40, 40))) < 5
    assert min(img.getpixel((150, 50))) > 245
    token = response.headers["x-veilproof-receipt"]
    assert verify_receipt(token, sha256_hex(source), sha256_hex(response.content), "image")
    assert not verify_receipt(token, sha256_hex(b"different"), sha256_hex(response.content), "image")
    assert not verify_receipt(token, sha256_hex(source), sha256_hex(source), "image")


def test_pdf_protects_selected_name_preserves_other_content(client):
    import pymupdf as fitz
    with fitz.open() as doc:
        page = doc.new_page()
        page.insert_text((72, 72), "Reporter Alice Smith")
        page.insert_text((72, 140), "Public contract value 1000")
        original = doc.tobytes()
    response = sanitize(client, original, "document", {"terms": ["Alice Smith"]})
    assert response.status_code == 200, response.text
    with fitz.open(stream=response.content, filetype="pdf") as doc:
        assert "Alice Smith" not in doc[0].get_text()
        pix = doc[0].get_pixmap()
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        assert min(image.crop((72, 125, 220, 145)).convert("L").getextrema()) < 150


def test_selected_audio_interval_is_silent_and_duration_preserved():
    source = Sine(440).to_audio_segment(duration=3000)
    wav = io.BytesIO()
    source.export(wav, format="wav")
    result = protect(wav.getvalue(), "audio", ProtectionPlan(audio="intervals", intervals=[{"start": 1, "end": 2}]))
    audio = AudioSegment.from_file(io.BytesIO(result), format="mp3")
    assert abs(len(audio) - 3000) < 30
    assert audio[1200:1800].rms <= 1
    assert audio[100:700].rms > 1000
    assert audio[2300:2900].rms > 1000


def test_video_concealment_removes_visuals_and_audio(tmp_path):
    import subprocess
    import cv2

    source = tmp_path / "source.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=red:s=64x64:r=10:d=1",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(source),
    ], check=True, capture_output=True, timeout=30)
    output = tmp_path / "protected.mp4"
    output.write_bytes(protect(source.read_bytes(), "video", ProtectionPlan()))
    cap = cv2.VideoCapture(str(output))
    count = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            assert frame.max() < 5
            count += 1
    finally:
        cap.release()
    assert count == 10
    info = subprocess.run([
        "ffprobe", "-v", "error", "-show_streams", "-of", "json", str(output),
    ], check=True, capture_output=True, text=True, timeout=30)
    assert all(s["codec_type"] != "audio" for s in json.loads(info.stdout)["streams"])


@pytest.mark.parametrize("category", ["audio", "image", "video", "document"])
def test_invalid_media_never_returns_original_as_protected(client, category):
    response = sanitize(client, b"not a valid file", category, {})
    assert response.status_code == 422
    assert "x-veilproof-receipt" not in response.headers


def test_invalid_or_missing_plan_rejected(client):
    response = sanitize(client, image_bytes(), "image", {"regions": [{"x": -10, "y": 0, "w": 20, "h": 20}]})
    assert response.status_code == 422

    response = client.post(f"{API}/analysis/sanitize", files={"file": ("photo.png", image_bytes())}, data={"category": "image"})
    assert response.status_code == 422


def test_generated_copy_must_fit_upload_limit(client, monkeypatch):
    from app.config import get_settings
    source = image_bytes()
    monkeypatch.setattr(get_settings(), "max_upload_bytes", len(source) + 1)
    response = sanitize(client, source, "image", {})
    assert response.status_code == 413
    assert "x-veilproof-receipt" not in response.headers


def test_exact_reviewed_copy_enters_workflow(client, privacy_headers):
    original = image_bytes()
    protected = sanitize(client, original, "image", {"regions": [{"x": 20, "y": 20, "w": 40, "h": 40}]})
    assert protected.status_code == 200
    intake = client.post(f"{API}/intakes").json()
    broker = client.get(f"{API}/public/broker-key").json()
    args = (client, intake["intake_id"], intake["capability"], broker, broker["operator_id"])
    oid, _ = _upload_object(*args, "original", "image", original)
    did, _ = _upload_object(*args, "derivative", "image", protected.content)
    headers = {"X-Intake-Capability": intake["capability"], "Idempotency-Key": secrets.token_hex(16)}
    body = {"title": "Selected identity protection", "description": DEFAULT_DESC, "category": "other",
            "risk_factors": [], "no_immediate_risk": True, "tracking_secret": secrets.token_hex(24),
            "objects": [{"original_object_id": oid, "derivative_object_id": did, "category": "image",
                         "display_label": "Evidence 1", "protection_receipt": protected.headers["x-veilproof-receipt"]}]}
    response = client.post(f"{API}/intakes/{intake['intake_id']}/finalize", json=body, headers=headers)
    assert response.status_code == 200, response.text
    case_id = response.json()["case_id"]
    case = client.get(f"{API}/staff/cases/{case_id}", headers=privacy_headers).json()
    evidence = case["evidence"][0]
    version = next(v for v in evidence["versions"] if v["kind"] == "derivative")
    assert version["provenance"] == "reporter_reviewed_redaction"
    content = client.get(f"{API}/staff/evidence/{version['id']}/protected", headers=privacy_headers)
    assert content.content == protected.content
    assert evidence["protectedCopyStatus"] == "pending_release"


def test_scanning_does_not_send_evidence_to_external_api(client, monkeypatch):
    import urllib.request
    monkeypatch.setenv("GEMINI_API_KEY", "configured-but-must-not-be-used")
    def forbidden(*args, **kwargs):
        pytest.fail("Evidence left local analysis")
    monkeypatch.setattr(urllib.request, "urlopen", forbidden)
    response = client.post(f"{API}/analysis/scan", files={"file": ("photo.png", image_bytes())}, data={"category": "image"})
    assert response.status_code == 200
