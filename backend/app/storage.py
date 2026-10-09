"""Private ciphertext storage.

`local` writes opaque ciphertext blobs under an ignored directory. Object paths are random UUIDs
with no source filenames. A Supabase adapter is documented but not configured on this machine.
"""

from __future__ import annotations

import os
from pathlib import Path

from .config import get_settings
from .errors import UnavailableError


class LocalCiphertextStorage:
    def __init__(self, root: str):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, object_path: str) -> Path:
        # object_path is a random opaque name; reject path traversal defensively.
        if "/" in object_path or "\\" in object_path or ".." in object_path:
            raise ValueError("invalid object path")
        return self.root / object_path

    def put(self, object_path: str, data: bytes) -> None:
        path = self._path(object_path)
        if path.exists():
            # completion locks objects against overwrite
            raise FileExistsError(object_path)
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(data)
        os.replace(tmp, path)

    def get(self, object_path: str) -> bytes:
        path = self._path(object_path)
        if not path.exists():
            raise FileNotFoundError(object_path)
        return path.read_bytes()

    def delete(self, object_path: str) -> None:
        path = self._path(object_path)
        if path.exists():
            path.unlink()

    def exists(self, object_path: str) -> bool:
        return self._path(object_path).exists()


def get_storage():
    s = get_settings()
    if s.storage_backend == "local":
        return LocalCiphertextStorage(s.storage_local_dir)
    raise UnavailableError(
        f"storage backend {s.storage_backend!r} is not configured on this machine"
    )
