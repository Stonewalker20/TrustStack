from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.repository import TrustRepository, get_repository
from app.schemas import QueryRequest, QueryResponse
from app.services.rag import answer_question

router = APIRouter(tags=["query"])


@router.post("/query", response_model=QueryResponse)
def query_docs(payload: QueryRequest, repo: TrustRepository = Depends(get_repository)):
    try:
        result = answer_question(question=payload.question, top_k=payload.top_k or settings.top_k)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}") from exc

    repo.create_run(
        question=result["question"],
        answer=result["answer"],
        confidence_score=result["confidence_score"],
        trust_summary=result["trust_summary"],
        risk_flags=result["risk_flags"],
        citations=result["citations"],
        evaluation=result.get("evaluation"),
    )

    return QueryResponse(**result)
