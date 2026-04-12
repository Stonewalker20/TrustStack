from fastapi import APIRouter, Depends

from app.repository import TrustRepository, get_repository
from app.schemas import DocumentItem, SampleQuestionItem
from app.services.suggestions import build_sample_questions

router = APIRouter(tags=["documents"])


@router.get("/documents", response_model=list[DocumentItem])
def list_documents(repo: TrustRepository = Depends(get_repository)):
    return [DocumentItem(**doc) for doc in repo.list_documents()]


@router.get("/documents/sample-questions", response_model=list[SampleQuestionItem])
def list_sample_questions(repo: TrustRepository = Depends(get_repository)):
    chunks = repo.list_chunks()
    if not chunks:
        return []

    grouped: dict[str, list[dict]] = {}
    for chunk in chunks:
        grouped.setdefault(chunk["filename"], []).append(chunk)

    selected_filename, selected_chunks = max(grouped.items(), key=lambda item: len(item[1]))
    return [SampleQuestionItem(question=question, source=selected_filename) for question in build_sample_questions(selected_chunks)]
