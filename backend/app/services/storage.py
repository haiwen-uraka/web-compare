import json
import re
import time
import shutil
from pathlib import Path

from app.config import settings

# Only allow UUID-format task IDs (no path traversal possible)
_TASK_ID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def _validate_task_id(task_id: str) -> None:
    """Raise ValueError if task_id is not a safe UUID."""
    if not _TASK_ID_RE.match(task_id):
        raise ValueError(f"Invalid task_id format: {task_id}")


class FileStorage:
    def __init__(self):
        self.root = Path(settings.storage_dir) / "results"
        self.root.mkdir(parents=True, exist_ok=True)

    def _task_dir(self, task_id: str) -> Path:
        _validate_task_id(task_id)
        path = (self.root / task_id).resolve()
        # Double-check resolved path is under root
        if not str(path).startswith(str(self.root.resolve())):
            raise ValueError("task_id resolves outside storage root")
        path.mkdir(parents=True, exist_ok=True)
        return path

    def save_json(self, task_id: str, filename: str, data: dict):
        path = self._task_dir(task_id) / filename
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def load_json(self, task_id: str, filename: str) -> dict | None:
        _validate_task_id(task_id)
        path = (self.root / task_id / filename).resolve()
        if not str(path).startswith(str(self.root.resolve())):
            return None
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_file(self, task_id: str, filename: str, data: bytes):
        path = self._task_dir(task_id) / filename
        path.write_bytes(data)

    def get_file_path(self, task_id: str, filename: str) -> Path | None:
        _validate_task_id(task_id)
        path = (self.root / task_id / filename).resolve()
        if not str(path).startswith(str(self.root.resolve())):
            return None
        return path if path.exists() else None

    def delete_comparison(self, task_id: str):
        _validate_task_id(task_id)
        path = (self.root / task_id).resolve()
        if not str(path).startswith(str(self.root.resolve())):
            return
        if path.exists():
            shutil.rmtree(path)

    def list_comparisons(self) -> list[str]:
        if not self.root.exists():
            return []
        return sorted(
            (d.name for d in self.root.iterdir() if d.is_dir()),
            reverse=True,
        )

    def cleanup_old(self, max_age_hours: int) -> int:
        now = time.time()
        cutoff = now - max_age_hours * 3600
        count = 0
        for d in self.root.iterdir():
            try:
                if d.is_dir():
                    mtime = d.stat().st_mtime
                    if mtime < cutoff:
                        shutil.rmtree(d)
                        count += 1
            except (FileNotFoundError, PermissionError, OSError):
                # Directory may have been removed by another process
                continue
        return count
