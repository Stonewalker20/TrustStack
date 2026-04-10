from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Document
from app.schemas import DocumentItem

router = APIRouter(tags=["documents"])


@router.get("/documents", response_model=list[DocumentItem])
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    return [
        DocumentItem(id=doc.id, filename=doc.filename, uploaded_at=doc.uploaded_at.isoformat())
        for doc in docs
    ]
