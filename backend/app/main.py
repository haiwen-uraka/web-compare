import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.router import api_router
from app.services.rate_limiter import rate_limiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from app.services.browser import get_browser, close_browser

    Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)
    logger.info("Storage directory: %s", settings.storage_dir)

    # Start browser
    await get_browser()
    logger.info("Browser started.")

    # Start cleanup task
    cleanup_task = asyncio.create_task(periodic_cleanup())

    yield

    # Shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

    await close_browser()
    logger.info("Shutdown complete.")


async def periodic_cleanup():
    from app.services.storage import FileStorage
    try:
        storage = FileStorage()
    except Exception as e:
        logger.error("Failed to initialize storage for cleanup: %s", e)
        return
    while True:
        try:
            await asyncio.sleep(settings.cleanup_interval_minutes * 60)
            cleaned = await asyncio.to_thread(storage.cleanup_old, settings.storage_max_age_hours)
            if cleaned:
                logger.info("Cleaned %d old comparison(s)", cleaned)
            rate_limiter.cleanup()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Cleanup error: %s", e)


app = FastAPI(
    title="Web Page Comparator",
    description="Visual web automation platform for comparing two web pages",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/comparisons") and request.method == "POST":
        client_ip = request.client.host if request.client else "unknown"
        if not rate_limiter.is_allowed(client_ip):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please wait and try again."},
            )
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
