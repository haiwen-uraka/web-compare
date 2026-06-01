import re
import json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse, Response

from app.services.storage import FileStorage

router = APIRouter()

_TASK_ID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


@router.get("/{task_id}/screenshots/{side}")
async def get_screenshot(
    task_id: str,
    side: str,
    width: int | None = Query(None, ge=100, le=3840, description="Resize width"),
    quality: int = Query(85, ge=10, le=100, description="PNG quality (for resize)"),
):
    if not _TASK_ID_RE.match(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    if side not in ("a", "b"):
        raise HTTPException(status_code=400, detail="side must be 'a' or 'b'")

    storage = FileStorage()
    path = storage.get_file_path(task_id, f"screenshot-{side}.png")
    if not path:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    # If width is specified, resize the image
    if width:
        try:
            from PIL import Image
            import io
            img = Image.open(path)
            ratio = width / img.width
            new_size = (width, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="PNG", optimize=True)
            return Response(content=buf.getvalue(), media_type="image/png")
        except Exception:
            # Fallback to original if resize fails
            pass

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


@router.get("/{task_id}/dom/{side}")
async def get_dom_tree(task_id: str, side: str):
    """Get the DOM tree structure for a captured page."""
    if not _TASK_ID_RE.match(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    if side not in ("a", "b"):
        raise HTTPException(status_code=400, detail="side must be 'a' or 'b'")

    storage = FileStorage()
    data = storage.load_json(task_id, f"dom-{side}.json")
    if data is None:
        raise HTTPException(status_code=404, detail="DOM tree not found")
    return JSONResponse(content=data)
