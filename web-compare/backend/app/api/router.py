from fastapi import APIRouter

from app.api.endpoints.comparisons import router as comparisons_router
from app.api.endpoints.files import router as files_router

api_router = APIRouter()
api_router.include_router(comparisons_router, prefix="/comparisons", tags=["comparisons"])
api_router.include_router(files_router, prefix="/comparisons", tags=["files"])
