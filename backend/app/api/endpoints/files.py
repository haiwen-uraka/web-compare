import re

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services.storage import FileStorage

router = APIRouter()

_TASK_ID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


@router.get("/{task_id}/screenshots/{side}")
async def get_screenshot(task_id: str, side: str):
    if not _TASK_ID_RE.match(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    if side not in ("a", "b"):
        raise HTTPException(status_code=400, detail="side must be 'a' or 'b'")

    storage = FileStorage()
    path = storage.get_file_path(task_id, f"screenshot-{side}.png")
    if not path:
        raise HTTPException(status_code=404, detail="Screenshot not found")
    return FileResponse(path, media_type="image/png")


@router.get("/{task_id}/diffs/visual")
async def get_visual_diff(task_id: str):
    if not _TASK_ID_RE.match(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    storage = FileStorage()
    path = storage.get_file_path(task_id, "diff-visual.png")
    if not path:
        raise HTTPException(status_code=404, detail="Visual diff not found")
    return FileResponse(path, media_type="image/png")


@router.get("/{task_id}/diffs/visual-highlight/{side}")
async def get_visual_highlight(task_id: str, side: str):
    if not _TASK_ID_RE.match(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    if side not in ("a", "b"):
        raise HTTPException(status_code=400, detail="side must be 'a' or 'b'")

    storage = FileStorage()
    path = storage.get_file_path(task_id, f"highlight-{side}.png")
    if not path:
        raise HTTPException(status_code=404, detail="Highlight not found")
    return FileResponse(path, media_type="image/png")
