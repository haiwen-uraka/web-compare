import asyncio
import logging
import uuid
import json
import httpx
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse

from app.models.requests import ComparisonRequest
from app.models.results import ComparisonResult, ComparisonListItem
from app.services.orchestrator import run_comparison
from app.services.storage import FileStorage
from app.services.cache import comparison_cache
from app.services.url_validator import validate_url

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory task store: task_id -> ComparisonResult
task_store: dict[str, ComparisonResult] = {}


@router.post("")
async def create_comparison(request: ComparisonRequest, req: Request):
    # SSRF validation
    for url, label in [(request.url_a, "URL A"), (request.url_b, "URL B")]:
        valid, msg = validate_url(url)
        if not valid:
            raise HTTPException(status_code=400, detail=f"{label}: {msg}")

    # Check cache first (skip if force=true)
    force = req.query_params.get("force", "false").lower() == "true"
    if force:
        comparison_cache.invalidate(request.url_a, request.url_b)
    cached = comparison_cache.get(request.url_a, request.url_b)
    if cached is not None:
        return JSONResponse(
            status_code=200,
            content=cached.model_dump(mode="json"),
        )

    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    result = ComparisonResult(
        id=task_id,
        status="pending",
        created_at=now,
        url_a=request.url_a,
        url_b=request.url_b,
        comparisons=request.comparisons,
    )
    task_store[task_id] = result

    # Launch background comparison
    asyncio.create_task(run_comparison(task_id, request, task_store))

    return JSONResponse(
        status_code=202,
        content={
            "id": task_id,
            "status": "processing",
            "created_at": now.isoformat(),
            "url_a": request.url_a,
            "url_b": request.url_b,
            "comparisons": request.comparisons,
        },
    )


@router.get("/probe")
async def probe_url(url: str = Query(..., description="URL to check reachability")):
    """Quickly check if a URL is reachable (HEAD request only, no page rendering)."""
    valid, msg = validate_url(url)
    if not valid:
        return {"reachable": False, "status_code": None, "error": msg}

    try:
        async with httpx.AsyncClient(timeout=5, follow_redirects=False) as client:
            resp = await client.head(url, headers={"User-Agent": "WebCompare/1.0"})
            return {
                "reachable": resp.status_code < 500,
                "status_code": resp.status_code,
            }
    except httpx.TimeoutException:
        return {"reachable": False, "status_code": None, "error": "Timeout"}
    except Exception:
        logger.warning("Probe failed for url=%s", url, exc_info=True)
        return {"reachable": False, "status_code": None, "error": "Connection failed"}


@router.get("")
async def list_comparisons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=10, le=100),
    status: str | None = Query(None),
    search: str | None = Query(None),
    include_deleted: bool = Query(False),
):
    storage = FileStorage()
    task_ids = storage.list_comparisons()

    items = []
    seen = set()
    all_ids = list(task_store.keys()) + task_ids
    for tid in all_ids:
        if tid in seen:
            continue
        seen.add(tid)

        # Skip soft-deleted items unless explicitly requested
        if not include_deleted and storage.is_deleted(tid):
            continue

        if tid in task_store:
            r = task_store[tid]
            items.append(
                ComparisonListItem(
                    id=r.id,
                    status=r.status,
                    created_at=r.created_at,
                    url_a=r.url_a,
                    url_b=r.url_b,
                    summary=r.summary,
                )
            )
        else:
            data = storage.load_json(tid, "result.json")
            if data:
                r = ComparisonResult(**data)
                items.append(
                    ComparisonListItem(
                        id=r.id,
                        status=r.status,
                        created_at=r.created_at,
                        url_a=r.url_a,
                        url_b=r.url_b,
                        summary=r.summary,
                    )
                )

    # Filter by status
    if status:
        items = [i for i in items if i.status == status]

    # Filter by search
    if search:
        q = search.lower()
        items = [i for i in items if q in i.url_a.lower() or q in i.url_b.lower()]

    items.sort(key=lambda x: x.created_at, reverse=True)

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    paged = items[start:end]

    return {
        "items": paged,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{task_id}")
async def get_comparison(task_id: str):
    # Validate task_id format to prevent path traversal
    import re
    if not re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")

    if task_id in task_store:
        return task_store[task_id]

    storage = FileStorage()
    data = storage.load_json(task_id, "result.json")
    if data:
        return ComparisonResult(**data)

    raise HTTPException(status_code=404, detail="Comparison not found")


@router.delete("/{task_id}")
async def delete_comparison(task_id: str):
    import re
    if not re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")

    url_a = url_b = None
    if task_id in task_store:
        url_a = task_store[task_id].url_a
        url_b = task_store[task_id].url_b
    else:
        storage = FileStorage()
        data = storage.load_json(task_id, "result.json")
        if data:
            url_a = data.get("url_a")
            url_b = data.get("url_b")

    task_store.pop(task_id, None)
    storage = FileStorage()
    storage.delete_comparison(task_id, soft=True)

    if url_a and url_b:
        comparison_cache.invalidate(url_a, url_b)

    return {"deleted": True}


@router.post("/{task_id}/restore")
async def restore_comparison(task_id: str):
    import re
    if not re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")

    storage = FileStorage()
    if storage.restore_comparison(task_id):
        return {"restored": True}
    raise HTTPException(status_code=404, detail="Comparison not found or not deleted")


@router.get("/{task_id}/progress")
async def stream_progress(task_id: str):
    """Stream comparison progress using Server-Sent Events (SSE)."""
    import re
    if not re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")

    async def event_stream():
        last_phase = None
        while True:
            # Get result from task store or disk
            result = None
            if task_id in task_store:
                result = task_store[task_id]
            else:
                storage = FileStorage()
                data = storage.load_json(task_id, "result.json")
                if data:
                    result = ComparisonResult(**data)

            if not result:
                yield f"data: {json.dumps({'status': 'not_found', 'phase': 'unknown'})}\n\n"
                break

            # Only send if phase changed
            current_phase = result.phase
            if current_phase != last_phase:
                yield f"data: {json.dumps({'status': result.status, 'phase': current_phase})}\n\n"
                last_phase = current_phase

            # Break if completed
            if result.status in ('completed', 'failed', 'partial'):
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
