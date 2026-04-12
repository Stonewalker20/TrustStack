from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.repository import TrustRepository, require_repository
from app.schemas import QueryRequest, QueryResponse
from app.services.rag import answer_question
from app.utils.logging import get_logger

router = APIRouter(tags=["query"])
logger = get_logger(__name__)


@router.post("/query", response_model=QueryResponse)
def query_docs(payload: QueryRequest, repo: TrustRepository = Depends(require_repository)):
    try:
        result = answer_question(question=payload.question, top_k=payload.top_k or settings.top_k)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}") from exc

    try:
        repo.create_run(
            question=result["question"],
            answer=result["answer"],
            confidence_score=result["confidence_score"],
            trust_summary=result["trust_summary"],
            risk_flags=result["risk_flags"],
            citations=result["citations"],
            evaluation=result.get("evaluation"),
        )
    except Exception as exc:
        logger.warning("Failed to persist query run history: %s", exc)

    return QueryResponse(**result)
