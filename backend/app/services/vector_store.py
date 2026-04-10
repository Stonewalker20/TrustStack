from __future__ import annotations

from functools import lru_cache
import json
import math
from pathlib import Path

from app.config import settings

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except Exception:  # pragma: no cover - graceful fallback
    chromadb = None
    ChromaSettings = None


class SimpleVectorStore:
    def __init__(self, persist_path: str):
        self.persist_file = Path(persist_path) / "simple_vector_store.json"
        self.persist_file.parent.mkdir(parents=True, exist_ok=True)
        self.records: list[dict] = []
        if self.persist_file.exists():
            try:
                self.records = json.loads(self.persist_file.read_text(encoding="utf-8"))
            except Exception:
                self.records = []

    def _save(self) -> None:
        self.persist_file.write_text(json.dumps(self.records), encoding="utf-8")

    def upsert(self, ids: list[str], documents: list[str], embeddings: list[list[float]], metadatas: list[dict]):
        record_map = {record["id"]: record for record in self.records}
        for rid, doc, emb, meta in zip(ids, documents, embeddings, metadatas):
            record_map[rid] = {"id": rid, "document": doc, "embedding": emb, "metadata": meta}
        self.records = list(record_map.values())
        self._save()

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
        norm_b = math.sqrt(sum(y * y for y in b)) or 1.0
        return dot / (norm_a * norm_b)

    def query(self, query_embedding: list[float], top_k: int = 5) -> dict:
        ranked = []
        for record in self.records:
            sim = self._cosine_similarity(query_embedding, record["embedding"])
            ranked.append((sim, record))
        ranked.sort(key=lambda x: x[0], reverse=True)
        selected = ranked[: max(1, min(top_k, len(ranked)))]

        return {
            "documents": [[rec["document"] for _, rec in selected]],
            "metadatas": [[rec["metadata"] for _, rec in selected]],
            "distances": [[1.0 - max(0.0, min(1.0, score)) for score, _ in selected]],
            "ids": [[rec["id"] for _, rec in selected]],
        }

    def count(self) -> int:
        return len(self.records)


class ChromaVectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(name="truststack_chunks")

    def upsert(self, ids: list[str], documents: list[str], embeddings: list[list[float]], metadatas: list[dict]):
        self.collection.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)

    def query(self, query_embedding: list[float], top_k: int = 5) -> dict:
        n_results = max(1, min(top_k, self.count()))
        return self.collection.query(query_embeddings=[query_embedding], n_results=n_results)

    def count(self) -> int:
        return self.collection.count()


@lru_cache(maxsize=1)
def get_vector_store():
    if chromadb is not None:
        try:
            return ChromaVectorStore()
        except Exception:
            pass
    return SimpleVectorStore(settings.chroma_persist_dir)
