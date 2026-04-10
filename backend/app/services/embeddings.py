from __future__ import annotations

from functools import lru_cache
import math
import re
from collections import Counter

import httpx
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

from app.config import settings


class LexicalEmbedder:
    """Deterministic lightweight fallback when no external embedding model is available."""

    dim: int = 256

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return re.findall(r"[A-Za-z0-9_\-]+", text.lower())

    def _embed(self, text: str) -> list[float]:
        tokens = self._tokenize(text)
        if not tokens:
            return [0.0] * self.dim

        counts = Counter(tokens)
        vec = [0.0] * self.dim
        for token, count in counts.items():
            idx = hash(token) % self.dim
            vec[idx] += float(count)

        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)


class LocalSentenceTransformerEmbedder:
    def __init__(self, model_name: str):
        if SentenceTransformer is None:
            raise RuntimeError("sentence-transformers is not installed")
        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        return self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True).tolist()

    def embed_query(self, text: str) -> list[float]:
        return self.model.encode([text], convert_to_numpy=True, normalize_embeddings=True)[0].tolist()


class OllamaEmbedder:
    def __init__(self, model_name: str):
        self.model_name = model_name

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{settings.ollama_base_url}/api/embed",
                json={"model": self.model_name, "input": texts},
            )
            response.raise_for_status()
            data = response.json()
        return data["embeddings"]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]


class ResilientEmbedder:
    def __init__(self, primary, fallback):
        self.primary = primary
        self.fallback = fallback

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        try:
            return self.primary.embed_texts(texts)
        except Exception:
            return self.fallback.embed_texts(texts)

    def embed_query(self, text: str) -> list[float]:
        try:
            return self.primary.embed_query(text)
        except Exception:
            return self.fallback.embed_query(text)


@lru_cache(maxsize=1)
def get_embedder():
    provider = settings.embedding_provider.lower().strip()
    lexical = LexicalEmbedder()

    if provider == "ollama":
        try:
            return ResilientEmbedder(OllamaEmbedder(settings.embedding_model), lexical)
        except Exception:
            return lexical

    if provider == "local":
        try:
            return LocalSentenceTransformerEmbedder(settings.embedding_model)
        except Exception:
            return lexical

    return lexical
