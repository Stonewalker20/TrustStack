from __future__ import annotations

import json

from app.db import SessionLocal
from app.models import Chunk, Document, Run


def migrate_sqlite_to_repository(repo) -> dict[str, int]:
    existing_documents = repo.list_documents()
    existing_chunks = repo.list_chunks()
    existing_runs = repo.list_runs(limit=1)
    if existing_documents or existing_chunks or existing_runs:
        return {"documents": 0, "chunks": 0, "runs": 0}

    document_id_map: dict[int, str] = {}
    migrated_documents = 0
    migrated_chunks = 0
    migrated_runs = 0

    with SessionLocal() as db:
        documents = db.query(Document).order_by(Document.id.asc()).all()
        for document in documents:
            new_id = repo.create_document(filename=document.filename, file_path=document.file_path)
            document_id_map[document.id] = new_id
            migrated_documents += 1

        chunks = db.query(Chunk).order_by(Chunk.id.asc()).all()
        grouped: dict[int, list[dict]] = {}
        filenames: dict[int, str] = {}
        for chunk in chunks:
            if chunk.document_id not in document_id_map:
                continue
            grouped.setdefault(chunk.document_id, []).append({"page_num": chunk.page_num, "text": chunk.text})
            filenames[chunk.document_id] = chunk.document.filename if chunk.document else "unknown"

        for legacy_doc_id, chunk_rows in grouped.items():
            repo.create_chunks(
                document_id=document_id_map[legacy_doc_id],
                filename=filenames.get(legacy_doc_id, "unknown"),
                chunks=chunk_rows,
            )
            migrated_chunks += len(chunk_rows)

        runs = db.query(Run).order_by(Run.id.asc()).all()
        for run in runs:
            repo.create_run(
                question=run.question,
                answer=run.answer,
                confidence_score=run.confidence_score,
                trust_summary=run.trust_summary,
                risk_flags=json.loads(run.risk_flags_json or "[]"),
                citations=json.loads(run.citations_json or "[]"),
            )
            migrated_runs += 1

    return {"documents": migrated_documents, "chunks": migrated_chunks, "runs": migrated_runs}
