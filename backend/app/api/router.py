from fastapi import APIRouter

from app.api.v1 import advisor, analysis, regulations

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
v1_router.include_router(regulations.router, prefix="/regulations", tags=["regulations"])
v1_router.include_router(advisor.router, prefix="/advisor", tags=["advisor"])

router = APIRouter()
router.include_router(v1_router)
