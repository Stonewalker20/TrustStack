from fastapi import APIRouter, Depends

from app.repository import TrustRepository, get_repository
from app.schemas import DocumentItem

router = APIRouter(tags=["documents"])


@router.get("/documents", response_model=list[DocumentItem])
def list_documents(repo: TrustRepository = Depends(get_repository)):
    return [DocumentItem(**doc) for doc in repo.list_documents()]
