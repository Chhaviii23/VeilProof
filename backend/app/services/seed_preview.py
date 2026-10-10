"""Controlled fictional bytes for object-less local demo evidence."""

from __future__ import annotations

import io


def preview_bytes(label: str, category: str, protected: bool) -> bytes:
    """Build a non-sensitive preview for seeded display-only evidence."""
    title = "Protected copy" if protected else "Sealed original"
    text = (
        f"VeilProof local demonstration\n\n{title}\n{label}\n\n"
        + ("Metadata stripped for investigation.\n" if protected else "Original metadata is visible only after approved timed access.\n")
        + "Fictional sample content — no real evidence is included."
    )
    if category == "document":
        import pymupdf

        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_textbox((54, 54, 540, 740), text, fontsize=14, lineheight=1.4)
        if not protected:
            doc.set_metadata({"author": "Fictional Evidence Office", "title": label})
        data = doc.tobytes()
        doc.close()
        return data
    if category == "image":
        from PIL import Image, ImageDraw

        image = Image.new("RGB", (1200, 700), "#eeeae2")
        draw = ImageDraw.Draw(image)
        draw.multiline_text((70, 70), text, fill="#20242a", spacing=12)
        out = io.BytesIO()
        image.save(out, format="JPEG", quality=90)
        return out.getvalue()
    return text.encode("utf-8")
