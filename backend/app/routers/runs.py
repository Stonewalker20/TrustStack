import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Run
from app.schemas import RunItem

router = APIRouter(tags=["runs"])


@router.get("/runs", response_model=list[RunItem])
def list_runs(db: Session = Depends(get_db)):
    rows = db.query(Run).order_by(Run.created_at.desc()).limit(100).all()
    return [
        RunItem(
            id=row.id,
            question=row.question,
            answer=row.answer,
            confidence_score=row.confidence_score,
            trust_summary=row.trust_summary,
            risk_flags=json.loads(row.risk_flags_json or "[]"),
            citations=json.loads(row.citations_json or "[]"),
            created_at=row.created_at.isoformat(),
        )
        for row in rows
    ]
