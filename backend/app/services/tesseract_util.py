"""Locate the Tesseract OCR binary.

Default Windows installs (e.g. via winget: UB-Mannheim.TesseractOCR) put the
binary in Program Files without adding it to PATH, so pytesseract needs the
explicit command path. Shared by the analysis and redaction pipelines.
"""

from __future__ import annotations

import os
import shutil


def _registry_install_dir() -> str:
    """Return the Windows registry install directory when available."""
    if os.name != "nt":
        return ""
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"Software\Tesseract-OCR") as key:
            value, _ = winreg.QueryValueEx(key, "InstallDir")
            return str(value).strip()
    except (FileNotFoundError, OSError, ImportError):
        return ""


def configure_tesseract() -> bool:
    """Ensure pytesseract can launch the binary; returns True when OCR can run."""
    try:
        import pytesseract
    except ImportError:
        return False

    if shutil.which("tesseract") or shutil.which("tesseract.exe"):
        return True

    pf = os.environ.get("PROGRAMFILES", r"C:\Program Files")
    pf86 = os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)")
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    registry_dir = _registry_install_dir()
    candidates = [
        os.environ.get("TESSERACT_CMD", "").strip(),
        os.path.join(pf, "Tesseract-OCR", "tesseract.exe"),
        os.path.join(pf86, "Tesseract-OCR", "tesseract.exe"),
        os.path.join(local_app_data, "Tesseract-OCR", "tesseract.exe") if local_app_data else "",
        os.path.join(registry_dir, "tesseract.exe") if registry_dir else "",
    ]
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            pytesseract.pytesseract.tesseract_cmd = candidate
            return True
    return False
