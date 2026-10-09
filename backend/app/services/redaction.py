"""Content-protection pipeline: face/text blurring for images, PDFs, audio, video.

Heavy dependencies (OpenCV, Tesseract OCR, Pydub, PyMuPDF) are imported lazily so a
missing *optional* dependency degrades one capability instead of crashing intake.
Face blurring is the core protection and requires OpenCV (opencv-python-headless).
"""

from __future__ import annotations

import io

import cv2
import numpy as np

# Haar cascade for face detection (loaded once, reused across calls).
_FACE_CASCADE = None


def _face_cascade() -> cv2.CascadeClassifier:
    global _FACE_CASCADE
    if _FACE_CASCADE is None:
        _FACE_CASCADE = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    return _FACE_CASCADE


def _blur_face_regions(img: np.ndarray, regions) -> int:
    """Apply heavy Gaussian blur over padded face bounding boxes. Returns count."""
    count = 0
    for (x, y, w, h) in regions:
        pad_x = max(8, int(w * 0.15))
        pad_y = max(8, int(h * 0.15))
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(img.shape[1], x + w + pad_x)
        y2 = min(img.shape[0], y + h + pad_y)
        if x2 <= x1 or y2 <= y1:
            continue
        roi = img[y1:y2, x1:x2]
        # Kernel size must be odd and larger than the ROI, or OpenCV raises.
        k = min(51, max(3, (min(roi.shape[0], roi.shape[1]) // 2) * 2 + 1))
        img[y1:y2, x1:x2] = 0
        count += 1
    return count


def _blur_text_regions(img: np.ndarray) -> int:
    """OCR-based text redaction. Optional: skipped when tesseract is unavailable."""
    try:
        import pytesseract
        from .tesseract_util import configure_tesseract

        if not configure_tesseract():
            raise RuntimeError("OCR is required for automatic text protection")
    except ImportError as exc:
        raise RuntimeError("OCR is required for automatic text protection") from exc
    try:
        d = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    except Exception as e:
        raise RuntimeError("Text redaction failed") from e
    count = 0
    n_boxes = len(d["text"])
    for i in range(n_boxes):
        try:
            conf = int(float(d["conf"][i]))
        except (TypeError, ValueError):
            continue
        if conf <= 60:
            continue
        text = d["text"][i].strip()
        if not text:
            continue
        (x, y, w, h) = (d["left"][i], d["top"][i], d["width"][i], d["height"][i])
        if w <= 5 or h <= 5:
            continue
        x1 = max(0, x - 2)
        y1 = max(0, y - 2)
        x2 = min(img.shape[1], x + w + 2)
        y2 = min(img.shape[0], y + h + 2)
        roi = img[y1:y2, x1:x2]
        k = min(21, max(3, (min(roi.shape[0], roi.shape[1]) // 2) * 2 + 1))
        img[y1:y2, x1:x2] = 0
        count += 1
    return count


def _detect_faces(img: np.ndarray):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade = _face_cascade()
    if cascade.empty():
        return []
    return list(cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)))


def redact_image_content(image_bytes: bytes) -> bytes:
    """Detect faces and text in an image and blur them. Returns modified JPEG bytes.

    Falls back to returning the input bytes only when the image cannot be decoded
    at all (in which case the caller must treat protection as failed).
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        # Not a decodable raster image — caller must handle (e.g. re-route category).
        raise ValueError("Image protection failed")

    # 1. Face detection and blurring (the core protection guarantee).
    try:
        _blur_face_regions(img, _detect_faces(img))
    except Exception as e:
        raise RuntimeError("Face redaction failed") from e

    # 2. Text detection and blurring (optional OCR).
    try:
        _blur_text_regions(img)
    except Exception as e:
        raise RuntimeError("Text redaction failed") from e

    # 3. Re-encode to JPEG — this also strips all EXIF/metadata.
    success, encoded_img = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if success:
        return encoded_img.tobytes()

    raise RuntimeError("Image encoding failed")


def redact_pdf_content(pdf_bytes: bytes) -> bytes:
    """Produce a protected PDF copy: render each page, blur faces + text, rebuild.

    The rebuilt PDF contains only redacted page rasters — the original text layer,
    embedded metadata, attachments, and annotations do not carry over. Raises
    RuntimeError when PyMuPDF is not installed so callers can fail loudly instead
    of attaching an unredacted copy.
    """
    try:
        try:
            import pymupdf as fitz  # PyMuPDF ≥ 1.24
        except ImportError:  # pragma: no cover - older PyMuPDF
            import fitz  # type: ignore[no-redef]
    except ImportError as exc:  # pragma: no cover - depends on environment
        raise RuntimeError("PyMuPDF is required for PDF protection") from exc

    from PIL import Image

    src = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: list[Image.Image] = []
    try:
        for page in src:
            zoom = 2.0  # ~144 DPI — enough for face detection, bounded size
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            nparr = np.frombuffer(pix.samples, dtype=np.uint8)
            img = nparr.reshape(pix.height, pix.width, 3).copy()

            try:
                _blur_face_regions(img, _detect_faces(img))
            except Exception as e:
                raise RuntimeError("PDF face redaction failed") from e
            try:
                _blur_text_regions(img)
            except Exception as e:
                raise RuntimeError("PDF text redaction failed") from e

            pages.append(Image.fromarray(img))
    finally:
        src.close()

    if not pages:
        raise RuntimeError("PDF has no pages")

    out = io.BytesIO()
    # PIL rebuild: no original text layer, no document metadata, no embedded files.
    pages[0].save(
        out,
        format="PDF",
        save_all=True,
        append_images=pages[1:],
        resolution=144.0,
    )
    return out.getvalue()


def redact_audio_content(audio_bytes: bytes, whistleblower_is_louder: bool = True) -> bytes:
    """Legacy clients get all audio muted; never infer identity from loudness."""
    from .protection import protect, ProtectionPlan
    return protect(audio_bytes, "audio", ProtectionPlan(audio="mute"))


def redact_video_content(video_bytes: bytes, protect_visuals: bool = True, mute_audio: bool = True) -> bytes:
    """Re-encode video with explicitly chosen full-frame concealment/audio removal.
    Never returns an original or a partial output on encoder failure.
    """
    import tempfile
    import os
    import subprocess

    with tempfile.TemporaryDirectory() as tmp:
        src_path = os.path.join(tmp, 'input.mp4')
        vid_only_path = os.path.join(tmp, 'redacted_silent.mp4')
        out_path = os.path.join(tmp, 'output.mp4')

        # Write incoming bytes to disk
        with open(src_path, 'wb') as f:
            f.write(video_bytes)

        cap = cv2.VideoCapture(src_path)
        if not cap.isOpened():
            raise ValueError("Video could not be decoded")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(vid_only_path, fourcc, fps, (width, height))

        if not writer.isOpened():
            cap.release()
            raise ValueError("Video encoder is unavailable")
        frame_count = 0
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if protect_visuals:
                    # Moving faces/text can evade sampled detection. Full-frame
                    # concealment is explicit in the review UI; preserve timing.
                    frame[:] = 0

                writer.write(frame)
                frame_count += 1
        finally:
            cap.release()
            writer.release()

        if frame_count == 0:
            raise ValueError("Video contains no decodable frames")

        # Re-mux: copy original audio track + redacted video using ffmpeg
        try:
            result = subprocess.run(
                [
                    'ffmpeg', '-y',
                    '-i', vid_only_path,   # redacted video (no audio)
                    '-i', src_path,        # original (for audio)
                    '-map', '0:v:0',       # video from redacted
                    *(['-an'] if mute_audio else ['-map', '1:a?']),        # audio from original (optional)
                    '-c:v', 'libx264', '-crf', '23', '-preset', 'fast',
                    '-c:a', 'aac', '-map_metadata', '-1',
                    out_path,
                ],
                capture_output=True,
                timeout=300,
            )
            if result.returncode != 0:
                raise RuntimeError("Video encoding failed")
        except Exception as exc:
            raise RuntimeError("FFmpeg is required for video protection") from exc

        with open(out_path, 'rb') as f:
            return f.read()
