"""Private ciphertext storage.

`local` writes opaque ciphertext blobs under an ignored directory. The Supabase adapter writes
the same opaque ciphertext to a private bucket through the server-only service-role API.
"""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import quote

import httpx

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

    def replace(self, object_path: str, data: bytes) -> None:
        """Overwrite an existing object.

        Used only by the server-side protection pipeline (finalize), where the
        plaintext content of a derivative object is re-redacted by the server
        before it can ever be released. Intake uploads stay write-once.
        """
        path = self._path(object_path)
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


class SupabaseCiphertextStorage:
    """Private Supabase Storage adapter for already-encrypted object bytes.

    The service key is used only by the backend process. No public URL or
    browser upload is exposed, and object paths never contain source filenames.
    """

    def __init__(self, url: str, service_key: str, bucket: str):
        self.base = url.rstrip("/") + "/storage/v1/object"
        self.bucket = bucket
        self.headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "application/octet-stream",
        }

    def _url(self, object_path: str) -> str:
        if "/" in object_path or "\\" in object_path or ".." in object_path:
            raise ValueError("invalid object path")
        return f"{self.base}/{quote(self.bucket, safe='')}/{quote(object_path, safe='')}"

    def put(self, object_path: str, data: bytes) -> None:
        response = httpx.post(self._url(object_path), content=data,
                              headers={**self.headers, "x-upsert": "false"}, timeout=30)
        if response.status_code in (409, 400) and self.exists(object_path):
            raise FileExistsError(object_path)
        response.raise_for_status()

    def replace(self, object_path: str, data: bytes) -> None:
        response = httpx.put(self._url(object_path), content=data,
                             headers={**self.headers, "x-upsert": "true"}, timeout=30)
        response.raise_for_status()

    def get(self, object_path: str) -> bytes:
        response = httpx.get(self._url(object_path), headers=self.headers, timeout=30)
        if response.status_code == 404:
            raise FileNotFoundError(object_path)
        response.raise_for_status()
        return response.content

    def delete(self, object_path: str) -> None:
        response = httpx.delete(self._url(object_path), headers=self.headers, timeout=30)
        if response.status_code != 404:
            response.raise_for_status()

    def exists(self, object_path: str) -> bool:
        response = httpx.head(self._url(object_path), headers=self.headers, timeout=30)
        if response.status_code == 404:
            return False
        response.raise_for_status()
        return True


def get_storage():
    s = get_settings()
    if s.storage_backend == "local":
        return LocalCiphertextStorage(s.storage_local_dir)
    if s.storage_backend == "supabase":
        if not s.supabase_url or not s.supabase_service_key:
            raise UnavailableError("Supabase storage is not configured")
        return SupabaseCiphertextStorage(
            s.supabase_url, s.supabase_service_key, s.supabase_storage_bucket
        )
    raise UnavailableError(
        f"storage backend {s.storage_backend!r} is not configured on this machine"
    )
