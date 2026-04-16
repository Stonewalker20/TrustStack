from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import settings
from app.repository import TrustRepository, require_repository
from app.schemas import IngestResponse, PresetIngestRequest, PresetSourceItem
from app.services.chunker import chunk_pages
from app.services.embeddings import get_embedder
from app.services.parser import parse_uploaded_file
from app.services.vector_store import get_vector_store, sanitize_metadatas

router = APIRouter(tags=["ingest"])

SAMPLE_DATA_DIR = Path(__file__).resolve().parents[3] / "sample_data"
PRESET_SOURCE_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


def _sanitize_filename(filename: str) -> str:
    safe_name = Path(filename).name
    safe_name = "".join(ch for ch in safe_name if ch.isalnum() or ch in {"-", "_", "."})
    return safe_name or f"upload_{uuid4().hex}.txt"


def _preset_sources() -> list[PresetSourceItem]:
    if not SAMPLE_DATA_DIR.exists():
        return []

    items: list[PresetSourceItem] = []
    for path in sorted(SAMPLE_DATA_DIR.iterdir()):
        if not path.is_file():
            continue
        if path.name.lower() == "readme.md":
            continue
        if path.suffix.lower() not in PRESET_SOURCE_EXTENSIONS:
            continue

        label = path.stem.replace("_", " ").replace("-", " ").title()
        description = f"Preloaded {path.suffix.lower().lstrip('.')} source material for demo and guided evaluation."
        items.append(
            PresetSourceItem(
                key=path.name,
                filename=path.name,
                label=label,
                description=description,
            )
        )
    return items


def _ingest_from_path(*, source_path: Path, original_name: str, repo: TrustRepository) -> IngestResponse:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    content = source_path.read_bytes()
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
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded file: {exc}") from exc

    chunks = chunk_pages(pages, original_name)
    if not chunks:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="No text could be extracted from file.")

    texts = [chunk["text"] for chunk in chunks]
    if not texts:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="No text could be extracted from file.")

    try:
        embedder = get_embedder()
        embeddings = embedder.embed_texts(texts)
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Embedding failed after upload: {exc}") from exc

    metadatas = []
    ids = []
    document_id: str | None = None

    try:
        document_id = repo.create_document(filename=original_name, file_path=str(destination))
        for idx, chunk in enumerate(chunks):
            chunk_uid = f"doc{document_id}_chunk{idx}"
            metadatas.append(
                {
                    "filename": original_name,
                    "page_num": chunk["page_num"],
                    "chunk_uid": chunk_uid,
                }
            )
            ids.append(chunk_uid)

        repo.create_chunks(document_id=document_id, filename=original_name, chunks=chunks)

        vector_store = get_vector_store()
        vector_store.upsert(ids=ids, documents=texts, embeddings=embeddings, metadatas=sanitize_metadatas(metadatas))
    except ValueError as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        if document_id is not None:
            repo.delete_document_tree(document_id=document_id)
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Indexing failed after upload: {exc}") from exc

    return IngestResponse(document_id=document_id, filename=original_name, num_chunks=len(chunks), status="indexed")


@router.get("/ingest/presets", response_model=list[PresetSourceItem])
def list_preset_sources():
    return _preset_sources()


@router.post("/ingest/preset", response_model=IngestResponse)
def ingest_preset(request: PresetIngestRequest, repo: TrustRepository = Depends(require_repository)):
    match = next((item for item in _preset_sources() if item.key == request.key), None)
    if match is None:
        raise HTTPException(status_code=404, detail="Preset source not found.")

    source_path = SAMPLE_DATA_DIR / match.filename
    if not source_path.exists():
        raise HTTPException(status_code=404, detail="Preset source file is missing.")

    return _ingest_from_path(source_path=source_path, original_name=match.filename, repo=repo)


@router.post("/ingest", response_model=IngestResponse)
async def ingest_file(file: UploadFile = File(...), repo: TrustRepository = Depends(require_repository)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a filename.")

    original_name = _sanitize_filename(file.filename)
    extension = Path(original_name).suffix.lower()
    if extension not in settings.allowed_extension_set:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {extension}")

    content = await file.read()
    temp_path = SAMPLE_DATA_DIR / f".upload_{uuid4().hex}_{original_name}"
    temp_path.write_bytes(content)
    try:
        return _ingest_from_path(source_path=temp_path, original_name=original_name, repo=repo)
    finally:
        temp_path.unlink(missing_ok=True)
