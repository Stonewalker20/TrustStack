from __future__ import annotations

from datetime import UTC, datetime
from functools import lru_cache
from typing import Protocol

from fastapi import HTTPException
from pymongo import DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

from app.config import settings
from app.services.bootstrap import migrate_sqlite_to_repository


class TrustRepository(Protocol):
    def create_document(self, *, filename: str, file_path: str) -> str: ...
    def create_chunks(self, *, document_id: str, filename: str, chunks: list[dict]) -> list[dict]: ...
    def delete_document_tree(self, *, document_id: str) -> None: ...
    def create_run(
        self,
        *,
        question: str,
        answer: str,
        confidence_score: float,
        trust_summary: str,
        risk_flags: list[str],
        citations: list[str],
        evaluation: dict | None = None,
    ) -> str: ...
    def list_documents(self) -> list[dict]: ...
    def list_runs(self, limit: int = 100) -> list[dict]: ...
    def list_chunks(self) -> list[dict]: ...
    def ping(self) -> None: ...


def _serialize_id(value) -> str:
    return str(value)


class MongoRepository:
    def __init__(self, uri: str, db_name: str):
        try:
            self.client = MongoClient(uri, serverSelectionTimeoutMS=1500)
            self.client.admin.command("ping")
            self.db = self.client[db_name]
            self.documents: Collection = self.db["documents"]
            self.chunks: Collection = self.db["chunks"]
            self.runs: Collection = self.db["runs"]
            self.documents.create_index("uploaded_at")
            self.chunks.create_index("chunk_uid", unique=True)
            self.chunks.create_index("document_id")
            self.runs.create_index("created_at")
        except PyMongoError as exc:
            raise RuntimeError(
                f"MongoDB is unavailable at {uri}. Start MongoDB or update MONGO_URI."
            ) from exc

    def create_document(self, *, filename: str, file_path: str) -> str:
        payload = {
            "filename": filename,
            "file_path": file_path,
            "uploaded_at": datetime.now(UTC),
        }
        result = self.documents.insert_one(payload)
        return _serialize_id(result.inserted_id)

    def create_chunks(self, *, document_id: str, filename: str, chunks: list[dict]) -> list[dict]:
        rows = []
        for idx, chunk in enumerate(chunks):
            chunk_uid = f"doc{document_id}_chunk{idx}"
            rows.append(
                {
                    "document_id": document_id,
                    "filename": filename,
                    "chunk_index": idx,
                    "page_num": chunk["page_num"],
                    "chunk_uid": chunk_uid,
                    "text": chunk["text"],
                    "created_at": datetime.now(UTC),
                }
            )
        if rows:
            self.chunks.insert_many(rows, ordered=True)
        return rows

    def delete_document_tree(self, *, document_id: str) -> None:
        self.chunks.delete_many({"document_id": document_id})
        self.documents.delete_one({"_id": self._coerce_object_id(document_id)})

    def create_run(
        self,
        *,
        question: str,
        answer: str,
        confidence_score: float,
        trust_summary: str,
        risk_flags: list[str],
        citations: list[str],
        evaluation: dict | None = None,
    ) -> str:
        payload = {
            "question": question,
            "answer": answer,
            "confidence_score": confidence_score,
            "trust_summary": trust_summary,
            "risk_flags": risk_flags,
            "citations": citations,
            "evaluation": evaluation,
            "created_at": datetime.now(UTC),
        }
        result = self.runs.insert_one(payload)
        return _serialize_id(result.inserted_id)

    def list_documents(self) -> list[dict]:
        rows = []
        for row in self.documents.find().sort("uploaded_at", DESCENDING):
            rows.append(
                {
                    "id": _serialize_id(row["_id"]),
                    "filename": row["filename"],
                    "uploaded_at": row["uploaded_at"].isoformat(),
                }
            )
        return rows

    def list_runs(self, limit: int = 100) -> list[dict]:
        rows = []
        for row in self.runs.find().sort("created_at", DESCENDING).limit(limit):
            rows.append(
                {
                    "id": _serialize_id(row["_id"]),
                    "question": row["question"],
                    "answer": row["answer"],
                    "confidence_score": row["confidence_score"],
                    "trust_summary": row["trust_summary"],
                    "risk_flags": row.get("risk_flags", []),
                    "citations": row.get("citations", []),
                    "evaluation": row.get("evaluation"),
                    "created_at": row["created_at"].isoformat(),
                }
            )
        return rows

    def list_chunks(self) -> list[dict]:
        rows = []
        for row in self.chunks.find().sort("chunk_index", 1):
            rows.append(
                {
                    "document_id": row["document_id"],
                    "filename": row["filename"],
                    "page_num": row.get("page_num"),
                    "chunk_uid": row["chunk_uid"],
                    "text": row["text"],
                }
            )
        return rows

    def ping(self) -> None:
        self.client.admin.command("ping")

    @staticmethod
    def _coerce_object_id(document_id: str):
        try:
            from bson import ObjectId

            return ObjectId(document_id)
        except Exception:
            return document_id


@lru_cache(maxsize=1)
def get_repository() -> TrustRepository:
    repo = MongoRepository(settings.mongo_uri, settings.mongo_db_name)
    migrate_sqlite_to_repository(repo)
    return repo


def require_repository() -> TrustRepository:
    try:
        return get_repository()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
