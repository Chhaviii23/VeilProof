"""Locate FFmpeg tools installed outside the system drive or PATH."""

from __future__ import annotations

import os
import shutil


def ffmpeg_command(name: str) -> str:
    """Return an executable path for FFmpeg/ffprobe, or its command name."""
    executable = shutil.which(name)
    if executable:
        return executable
    configured = os.environ.get("FFMPEG_BIN", "").strip()
    candidates = [
        os.path.join(configured, name + ".exe") if configured else "",
        os.path.join(r"D:\ffmpeg\bin", name + ".exe"),
    ]
    return next((path for path in candidates if path and os.path.exists(path)), name)
