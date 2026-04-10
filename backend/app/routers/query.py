import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Run
from app.schemas import QueryRequest, QueryResponse
from app.services.rag import answer_question

router = APIRouter(tags=["query"])


@router.post("/query", response_model=QueryResponse)
def query_docs(payload: QueryRequest, db: Session = Depends(get_db)):
    try:
        result = answer_question(question=payload.question, top_k=payload.top_k or settings.top_k)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}") from exc

    run = Run(
        question=result["question"],
        answer=result["answer"],
        confidence_score=result["confidence_score"],
        trust_summary=result["trust_summary"],
        risk_flags_json=json.dumps(result["risk_flags"]),
        citations_json=json.dumps(result["citations"]),
    )
    db.add(run)
    db.commit()

    return QueryResponse(**result)
