from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import settings
from app.repository import TrustRepository, get_repository
from app.schemas import IngestResponse
from app.services.chunker import chunk_pages
from app.services.embeddings import get_embedder
from app.services.parser import parse_uploaded_file
from app.services.vector_store import get_vector_store

router = APIRouter(tags=["ingest"])


def _sanitize_filename(filename: str) -> str:
    safe_name = Path(filename).name
    safe_name = "".join(ch for ch in safe_name if ch.isalnum() or ch in {"-", "_", "."})
    return safe_name or f"upload_{uuid4().hex}.txt"


@router.post("/ingest", response_model=IngestResponse)
async def ingest_file(file: UploadFile = File(...), repo: TrustRepository = Depends(get_repository)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a filename.")

    original_name = _sanitize_filename(file.filename)
    extension = Path(original_name).suffix.lower()
    if extension not in settings.allowed_extension_set:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {extension}")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_size_mb} MB limit.")

    stored_name = f"{uuid4().hex}_{original_name}"
    destination = upload_dir / stored_name
    destination.write_bytes(content)

    try:
        pages = parse_uploaded_file(destination)
    except ValueError as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    chunks = chunk_pages(pages, original_name)
    if not chunks:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="No text could be extracted from file.")

    document_id = repo.create_document(filename=original_name, file_path=str(destination))
    texts = []
    metadatas = []
    ids = []

    for idx, chunk in enumerate(chunks):
        chunk_uid = f"doc{document_id}_chunk{idx}"
        texts.append(chunk["text"])
        metadatas.append({
            "filename": original_name,
            "page_num": chunk["page_num"],
            "chunk_uid": chunk_uid,
        })
        ids.append(chunk_uid)

    repo.create_chunks(document_id=document_id, filename=original_name, chunks=chunks)

    try:
        embedder = get_embedder()
        embeddings = embedder.embed_texts(texts)
        vector_store = get_vector_store()
        vector_store.upsert(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Indexing failed after upload: {exc}") from exc

    return IngestResponse(document_id=document_id, filename=original_name, num_chunks=len(chunks), status="indexed")
