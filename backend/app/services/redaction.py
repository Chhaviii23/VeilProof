import cv2
import numpy as np
import pytesseract
from PIL import Image
import io

def redact_image_content(image_bytes: bytes) -> bytes:
    """
    Detects faces and text in an image and blurs them for privacy.
    Returns the modified image bytes.
    """
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        # If OpenCV can't decode it, return original (might be another format)
        return image_bytes
        
    # 1. Face Detection and Blurring
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        for (x, y, w, h) in faces:
            # Add some padding to the face bounding box
            pad_x = int(w * 0.1)
            pad_y = int(h * 0.1)
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(img.shape[1], x + w + pad_x)
            y2 = min(img.shape[0], y + h + pad_y)
            
            roi = img[y1:y2, x1:x2]
            # Heavy blur
            blurred = cv2.GaussianBlur(roi, (51, 51), 30)
            img[y1:y2, x1:x2] = blurred
    except Exception as e:
        print(f"Face redaction failed: {e}")

    # 2. Text Detection and Blurring
    try:
        # Get dictionary of bounding boxes and confidences
        d = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        n_boxes = len(d['text'])
        for i in range(n_boxes):
            if int(d['conf'][i]) > 60:  # Confidence > 60%
                text = d['text'][i].strip()
                if not text:
                    continue
                    
                (x, y, w, h) = (d['left'][i], d['top'][i], d['width'][i], d['height'][i])
                
                # Only blur reasonably sized boxes
                if w > 5 and h > 5:
                    # Slight padding
                    x1 = max(0, x - 2)
                    y1 = max(0, y - 2)
                    x2 = min(img.shape[1], x + w + 2)
                    y2 = min(img.shape[0], y + h + 2)
                    
                    roi = img[y1:y2, x1:x2]
                    # Substantial blur to make text illegible
                    blurred = cv2.GaussianBlur(roi, (21, 21), 10)
                    img[y1:y2, x1:x2] = blurred
    except Exception as e:
        print(f"Text redaction failed: {e}")

    # 3. Re-encode to JPEG
    success, encoded_img = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if success:
        return encoded_img.tobytes()
        
    return image_bytes

def redact_audio_content(audio_bytes: bytes, whistleblower_is_louder: bool = True) -> bytes:
    """
    Selective voice modulation — modulates only the WHISTLEBLOWER's voice segments.

    Strategy (no ML model needed):
    1. Split audio on silence to get per-turn segments.
    2. Cluster segments into 2 groups by RMS energy:
         - Louder group  → assumed to be the whistleblower (closer to mic)
         - Quieter group → assumed to be the accused / other party
    3. Pitch-shift + noise only the whistleblower's segments.
    4. Reconstruct full track by stitching all segments in order.

    If only 1 speaker is detected (monologue), the whole track is modulated.
    Falls back to full-track modulation on any error.
    """
    try:
        from pydub import AudioSegment, silence as pydub_silence
    except ImportError:
        return audio_bytes

    try:
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))

        # ── 1. Silence-based turn segmentation ──────────────────────────────
        # Each "chunk" is a voiced turn (pause ≥ 400 ms separates them)
        chunks = pydub_silence.split_on_silence(
            audio,
            min_silence_len=400,      # ms of silence between turns
            silence_thresh=audio.dBFS - 16,  # anything 16dB below avg = silence
            keep_silence=200,         # preserve 200ms padding for naturalness
        )

        if not chunks:
            # No voiced segments found — return original unchanged
            return audio_bytes

        if len(chunks) == 1:
            # Only one block — treat as monologue, modulate everything
            return _pitch_shift_segment(audio, audio)

        # ── 2. Cluster by RMS energy (loudness proxy) ────────────────────────
        rms_values = [chunk.rms for chunk in chunks]
        median_rms = sorted(rms_values)[len(rms_values) // 2]

        # Louder than median → speaker A (whistleblower if whistleblower_is_louder=True)
        is_whistleblower = [
            (rms >= median_rms) if whistleblower_is_louder else (rms < median_rms)
            for rms in rms_values
        ]

        # ── 3. Modulate only whistleblower segments, stitch all back ────────
        processed_chunks = []
        for chunk, is_wb in zip(chunks, is_whistleblower):
            if is_wb:
                processed_chunks.append(_pitch_shift_segment(chunk, audio))
            else:
                processed_chunks.append(chunk)  # accused voice: untouched

        # ── 4. Combine and export ────────────────────────────────────────────
        combined = processed_chunks[0]
        for seg in processed_chunks[1:]:
            combined = combined + seg

        out_buf = io.BytesIO()
        combined.export(out_buf, format="mp3")
        return out_buf.getvalue()

    except Exception as e:
        print(f"Audio redaction failed, falling back to full-track: {e}")
        # Fallback: shift everything rather than fail silently
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
            out_buf = io.BytesIO()
            _pitch_shift_segment(audio, audio).export(out_buf, format="mp3")
            return out_buf.getvalue()
        except Exception:
            return audio_bytes


def _pitch_shift_segment(segment, reference_audio) -> "AudioSegment":
    """Pitch-shift a single AudioSegment down by ~25% and add light noise."""
    import random
    new_rate = int(segment.frame_rate * 0.75)
    shifted = segment._spawn(segment.raw_data, overrides={"frame_rate": new_rate})
    shifted = shifted.set_frame_rate(segment.frame_rate)
    # Very light noise overlay to mask vocal fingerprint
    noise_raw = bytearray(random.randint(0, 255) for _ in range(len(shifted.raw_data)))
    noise = segment._spawn(noise_raw)
    return shifted.overlay(noise - 32)


def redact_video_content(video_bytes: bytes) -> bytes:
    """
    Frame-by-frame face detection and blurring for video files.
    Uses OpenCV Haar cascade (same as image redaction). Audio track is preserved via ffmpeg.
    Returns the redacted video bytes (MP4).
    Falls back to the original bytes on any error.
    """
    import tempfile
    import os
    import subprocess

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    with tempfile.TemporaryDirectory() as tmp:
        src_path = os.path.join(tmp, 'input.mp4')
        vid_only_path = os.path.join(tmp, 'redacted_silent.mp4')
        out_path = os.path.join(tmp, 'output.mp4')

        # Write incoming bytes to disk
        with open(src_path, 'wb') as f:
            f.write(video_bytes)

        cap = cv2.VideoCapture(src_path)
        if not cap.isOpened():
            return video_bytes

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(vid_only_path, fourcc, fps, (width, height))

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(
                    gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
                )
                for (x, y, w, h) in faces:
                    pad_x, pad_y = int(w * 0.15), int(h * 0.15)
                    x1 = max(0, x - pad_x)
                    y1 = max(0, y - pad_y)
                    x2 = min(width,  x + w + pad_x)
                    y2 = min(height, y + h + pad_y)
                    roi = frame[y1:y2, x1:x2]
                    frame[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (51, 51), 30)

                writer.write(frame)
        finally:
            cap.release()
            writer.release()

        # Re-mux: copy original audio track + redacted video using ffmpeg
        try:
            result = subprocess.run(
                [
                    'ffmpeg', '-y',
                    '-i', vid_only_path,   # redacted video (no audio)
                    '-i', src_path,        # original (for audio)
                    '-map', '0:v:0',       # video from redacted
                    '-map', '1:a?',        # audio from original (optional)
                    '-c:v', 'libx264', '-crf', '23', '-preset', 'fast',
                    '-c:a', 'aac',
                    out_path,
                ],
                capture_output=True,
                timeout=300,
            )
            if result.returncode != 0:
                # ffmpeg failed — return silent redacted video
                with open(vid_only_path, 'rb') as f:
                    return f.read()
        except Exception as e:
            print(f"ffmpeg mux failed: {e}")
            with open(vid_only_path, 'rb') as f:
                return f.read()

        with open(out_path, 'rb') as f:
            return f.read()
