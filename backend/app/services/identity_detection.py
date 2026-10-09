"""Offline person spans and landmark-validated face regions. No network calls."""
from functools import lru_cache
from pathlib import Path
import re

import cv2
import numpy as np


@lru_cache(maxsize=1)
def _names_model():
    import spacy
    return spacy.load("en_core_web_md", exclude=["parser", "tagger", "lemmatizer", "attribute_ruler"])


def person_spans(text: str) -> list[tuple[int, int]]:
    """Return character offsets, never the surrounding sentence or job title."""
    spans = []
    for entity in _names_model()(text).ents:
        if entity.label_ != "PERSON":
            continue
        start, end = entity.start_char, entity.end_char
        prefix = re.match(r"(?i)(?:mr|mrs|ms|dr|prof|shri|smt)\.?\s+", text[start:end])
        if prefix:
            start += prefix.end()
        words = re.findall(r"[^\W\d_]+(?:['’-][^\W\d_]+)*", text[start:end])
        if 1 <= len(words) <= 5 and not any(c.isdigit() for c in text[start:end]):
            spans.append((start, end))
    return spans


def face_regions(image: np.ndarray) -> list[tuple[int, int, int, int, float]]:
    model = Path(__file__).resolve().parents[1] / "assets" / "face_detection_yunet_2023mar.onnx"
    # A detector per request avoids mutable input-size races in OpenCV DNN.
    height, width = image.shape[:2]
    scale = min(1.0, 1280 / max(height, width))
    sample = cv2.resize(image, (max(1, round(width * scale)), max(1, round(height * scale))))
    detector = cv2.FaceDetectorYN.create(str(model), "", (sample.shape[1], sample.shape[0]), 0.9, 0.3, 5000)
    _, detections = detector.detect(sample)
    result = []
    for face in detections if detections is not None else []:
        x, y, w, h = face[:4] / scale
        landmarks = face[4:14].reshape(5, 2) / scale
        eyes, nose, mouth = landmarks[:2], landmarks[2], landmarks[3:]
        if w < 15 or h < 15:
            continue
        # Require two separated eyes above the nose and mouth. Solid shapes and
        # colour blocks must never pass solely because a cascade found a box.
        if np.linalg.norm(eyes[0] - eyes[1]) < w * 0.15:
            continue
        if not eyes[:, 1].mean() < nose[1] < mouth[:, 1].mean():
            continue
        crop = sample[max(0, int(y * scale)):min(sample.shape[0], int((y+h)*scale)),
                      max(0, int(x * scale)):min(sample.shape[1], int((x+w)*scale))]
        if not crop.size or cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).std() < 12:
            continue
        # The model's facial box excludes hair/ears. Expand to a head-sized
        # protection region; this is a conservative margin, not segmentation.
        left, top = max(0, int(x - .22*w)), max(0, int(y - .5*h))
        right, bottom = min(width, int(x + 1.22*w)), min(height, int(y + 1.15*h))
        result.append((left, top, right-left, bottom-top, float(face[-1]) * 100))
    return result
