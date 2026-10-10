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
    """Return only name/surname spans, never the surrounding sentence.

    NER models occasionally return a person entity containing a title, job
    description, or the rest of an OCR line. Trim every model result to the
    contiguous name-like words and use the same conservative rule as a
    fallback when the optional spaCy model is unavailable.
    """
    token_re = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['’-][A-Za-zÀ-ÖØ-öø-ÿ]+)*")
    stopwords = {
        "the", "a", "an", "and", "or", "of", "for", "to", "from", "with",
        "officer", "director", "engineer", "manager", "department", "report",
        "this", "that", "was", "were", "is", "are", "said", "identified",
    }

    def trim(start: int, end: int) -> tuple[int, int] | None:
        raw = text[start:end]
        prefix = re.match(r"(?i)(?:mr|mrs|ms|dr|prof|shri|smt)\.?\s+", raw)
        if prefix:
            start += prefix.end()
            raw = text[start:end]
        tokens = list(token_re.finditer(raw))
        if not tokens:
            return None
        # Pick a contiguous run of title-cased words. This deliberately
        # rejects sentence fragments and all-lowercase prose.
        runs: list[list[re.Match[str]]] = []
        run: list[re.Match[str]] = []
        previous_end = None
        for token in tokens:
            # OCR/PDF lines are independent candidates. Do not join a name
            # with the first capitalized word on the next line, or across
            # punctuation such as commas and colons.
            if previous_end is not None and re.search(r"[^ \t]", raw[previous_end:token.start()]):
                if run:
                    runs.append(run)
                    run = []
            word = token.group(0)
            looks_like_name = (
                word[:1].isupper() and word[1:] == word[1:].lower()
                and word.casefold() not in stopwords
            )
            if looks_like_name:
                run.append(token)
            elif run:
                runs.append(run)
                run = []
            previous_end = token.end()
        if run:
            runs.append(run)
        # Prefer a two-word first/last-name pair; allow a middle name, but do
        # not return one ordinary capitalized sentence word by itself.
        candidates = [r for r in runs if 2 <= len(r) <= 4]
        if not candidates:
            return None
        chosen = max(candidates, key=lambda r: (len(r), -r[0].start()))
        return start + chosen[0].start(), start + chosen[-1].end()

    spans: list[tuple[int, int]] = []
    try:
        entities = _names_model()(text).ents
    except Exception:
        entities = ()
    for entity in entities:
        if entity.label_ == "PERSON":
            span = trim(entity.start_char, entity.end_char)
            if span:
                spans.append(span)
    # OCR-friendly fallback for names such as “Arsh Chakraborty”. Run it even
    # when NER found another name: a malformed entity must not hide valid
    # names elsewhere in the same paragraph.
    for match in re.finditer(
        r"\b[A-Z][a-zÀ-ÖØ-öø-ÿ]+(?:\s+[A-Z][a-zÀ-ÖØ-öø-ÿ]+){1,3}\b", text
    ):
        span = trim(match.start(), match.end())
        if span:
            spans.append(span)
    return sorted(set(spans))


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
