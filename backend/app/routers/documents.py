from fastapi import APIRouter, Depends

from app.repository import TrustRepository, require_repository
from app.schemas import DocumentItem, SampleQuestionItem
from app.services.suggestions import build_sample_questions

router = APIRouter(tags=["documents"])


@router.get("/documents", response_model=list[DocumentItem])
def list_documents(repo: TrustRepository = Depends(require_repository)):
    return [DocumentItem(**doc) for doc in repo.list_documents()]


@router.get("/documents/sample-questions", response_model=list[SampleQuestionItem])
def list_sample_questions(repo: TrustRepository = Depends(require_repository)):
    documents = repo.list_documents()
    if not documents:
        return []

    selected_document = documents[0]
    selected_chunks = [chunk for chunk in repo.list_chunks() if chunk["document_id"] == selected_document["id"]]
    if not selected_chunks:
        return []

    return [
        SampleQuestionItem(question=question, source=selected_document["filename"])
        for question in build_sample_questions(selected_chunks)
    ]
