import json
import time
import shutil
from pathlib import Path

from app.config import settings


class FileStorage:
    def __init__(self):
        self.root = Path(settings.storage_dir) / "results"
        self.root.mkdir(parents=True, exist_ok=True)

    def _task_dir(self, task_id: str) -> Path:
        path = self.root / task_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def save_json(self, task_id: str, filename: str, data: dict):
        path = self._task_dir(task_id) / filename
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def load_json(self, task_id: str, filename: str) -> dict | None:
        path = self.root / task_id / filename
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_file(self, task_id: str, filename: str, data: bytes):
        path = self._task_dir(task_id) / filename
        path.write_bytes(data)

    def get_file_path(self, task_id: str, filename: str) -> Path | None:
        path = self.root / task_id / filename
        return path if path.exists() else None

    def delete_comparison(self, task_id: str):
        path = self.root / task_id
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
            if d.is_dir():
                mtime = d.stat().st_mtime
                if mtime < cutoff:
                    shutil.rmtree(d)
                    count += 1
        return count
