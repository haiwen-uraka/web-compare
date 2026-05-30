import asyncio
import uuid
import httpx
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse

from app.models.requests import ComparisonRequest
from app.models.results import ComparisonResult, ComparisonListItem
from app.services.orchestrator import run_comparison
from app.services.storage import FileStorage
from app.services.cache import comparison_cache
from app.services.url_validator import validate_url

router = APIRouter()

# In-memory task store: task_id -> ComparisonResult
task_store: dict[str, ComparisonResult] = {}


@router.post("")
async def create_comparison(request: ComparisonRequest, req: Request):
    # SSRF validation
    for url, label in [(request.url_a, "URL A"), (request.url_b, "URL B")]:
        valid, msg = validate_url(url)
        if not valid:
            raise HTTPException(status_code=400, detail=f"{label}: {msg}")

    # Check cache first
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
        },
    )


@router.get("/probe")
async def probe_url(url: str = Query(..., description="URL to check reachability")):
    """Quickly check if a URL is reachable (HEAD request only, no page rendering)."""
    valid, msg = validate_url(url)
    if not valid:
        return {"reachable": False, "status_code": None, "error": msg}

    try:
        async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
            resp = await client.head(url, headers={"User-Agent": "WebCompare/1.0"})
            return {
                "reachable": resp.status_code < 500,
                "status_code": resp.status_code,
            }
    except httpx.TimeoutException:
        return {"reachable": False, "status_code": None, "error": "Timeout"}
    except Exception as e:
        return {"reachable": False, "status_code": None, "error": str(e)}


@router.get("")
async def list_comparisons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=10, le=100),
    status: str | None = Query(None),
    search: str | None = Query(None),
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
    if task_id in task_store:
        return task_store[task_id]

    storage = FileStorage()
    data = storage.load_json(task_id, "result.json")
    if data:
        return ComparisonResult(**data)

    raise HTTPException(status_code=404, detail="Comparison not found")


@router.delete("/{task_id}")
async def delete_comparison(task_id: str):
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
    storage.delete_comparison(task_id)

    if url_a and url_b:
        comparison_cache.invalidate(url_a, url_b)

    return {"deleted": True}
