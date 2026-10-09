"""Generate a fictional JPEG with known EXIF (GPS/device/date) for the real processing test.

Output is a genuinely valid JPEG. All metadata is fictional.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image

FIXTURE_EXIF = {
    271: "FictionalCam",          # Make
    272: "Fictional X100",        # Model
    305: "FictionalPhotoApp 1.0",  # Software
    306: "2026:04:03 06:42:17",   # DateTime
    315: "Fictional Photographer",  # Artist
    36867: "2026:04:03 06:42:17",  # DateTimeOriginal
}

FIXTURE_GPS = {1: "N", 2: (22.0, 34.0, 21.0), 3: "E", 4: (88.0, 21.0, 50.0)}


def build_fixture(width: int = 320, height: int = 240) -> bytes:
    img = Image.new("RGB", (width, height), (30, 60, 90))
    # add a few distinguishable pixels so the image is not trivial
    for x in range(0, width, 20):
        img.putpixel((x, 10), (200, 30, 30))
    exif = Image.Exif()
    for tag, value in FIXTURE_EXIF.items():
        exif[tag] = value
    exif[0x8825] = FIXTURE_GPS
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90, exif=exif)
    return buf.getvalue()


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "fixtures" / "fictional_site_photo.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    data = build_fixture()
    out.write_bytes(data)
    from hashlib import sha256

    print(f"wrote {out} ({len(data)} bytes, sha256={sha256(data).hexdigest()})")


if __name__ == "__main__":
    main()
