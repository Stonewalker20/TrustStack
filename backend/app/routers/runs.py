from fastapi import APIRouter, Depends

from app.repository import TrustRepository, require_repository
from app.schemas import RunItem

router = APIRouter(tags=["runs"])


@router.get("/runs", response_model=list[RunItem])
def list_runs(repo: TrustRepository = Depends(require_repository)):
    return [RunItem(**row) for row in repo.list_runs()]
