import json
import re
from collections import Counter

import httpx

from app.config import settings


SYSTEM_PROMPT = (
    "You are TrustStack, a reliability-aware AI assistant. "
    "Answer only from the provided context. If evidence is insufficient, say so clearly. "
    "Do not fabricate causes, procedures, policies, or measurements. "
    "Return JSON with keys: answer, citations, insufficient_evidence."
)


def _clean_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    return cleaned


class LLMClient:
    def generate_answer(self, question: str, context: str, hits: list[dict] | None = None) -> dict:
        if settings.llm_provider == "ollama":
            try:
                return self._ollama_generate(question, context)
            except Exception:
                pass
        elif settings.llm_provider == "openai_compatible":
            try:
                return self._openai_compatible_generate(question, context)
            except Exception:
                pass
        return self._fallback_generate(question, context, hits or [])

    def _openai_compatible_generate(self, question: str, context: str) -> dict:
        if not settings.openai_api_key:
            raise RuntimeError("Missing OpenAI-compatible API key")

        user_prompt = f"Question:\n{question}\n\nContext:\n{context}\n\nRespond with JSON only."
        payload = {
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
        with httpx.Client(timeout=60.0) as client:
            response = client.post(f"{settings.openai_base_url}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        content = _clean_json_text(data["choices"][0]["message"]["content"])
        return json.loads(content)

    def _ollama_generate(self, question: str, context: str) -> dict:
        prompt = f"{SYSTEM_PROMPT}\n\nQuestion:\n{question}\n\nContext:\n{context}\n\nReturn JSON only."
        payload = {
            "model": settings.llm_model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.1},
        }
        with httpx.Client(timeout=120.0) as client:
            response = client.post(f"{settings.ollama_base_url}/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()
        return json.loads(_clean_json_text(data["response"]))

    def _fallback_generate(self, question: str, context: str, hits: list[dict]) -> dict:
        if not hits:
            return {
                "answer": "I could not find any indexed evidence to answer this question.",
                "citations": [],
                "insufficient_evidence": True,
            }

        top_hits = hits[:3]
        citations = [hit["chunk_id"] for hit in top_hits if hit.get("score", 0.0) >= settings.min_retrieval_score]
        insufficient = not citations

        question_terms = [w.lower() for w in re.findall(r"[A-Za-z0-9_\-]+", question) if len(w) > 2]
        q_counter = Counter(question_terms)

        ranked_sentences: list[tuple[float, str, str]] = []
        for hit in top_hits:
            chunk_id = hit["chunk_id"]
            sentences = re.split(r"(?<=[.!?])\s+", hit["text"])
            for sent in sentences:
                sent = sent.strip()
                if len(sent) < 40:
                    continue
                words = [w.lower() for w in re.findall(r"[A-Za-z0-9_\-]+", sent)]
                overlap = sum((Counter(words) & q_counter).values())
                score = (hit.get("score", 0.0) * 3.0) + overlap * 0.35
                if any(token in sent.lower() for token in question_terms):
                    ranked_sentences.append((score, sent, chunk_id))

        ranked_sentences.sort(key=lambda x: x[0], reverse=True)
        chosen = ranked_sentences[:3]

        if not chosen:
            chosen = [(hit.get("score", 0.0), hit["text"][:400].strip(), hit["chunk_id"]) for hit in top_hits]

        unique_citations = []
        parts = []
        for _, sentence, chunk_id in chosen:
            if chunk_id not in unique_citations:
                unique_citations.append(chunk_id)
            parts.append(sentence)

        answer = " ".join(parts)
        answer = answer[:1200].strip()
        if insufficient:
            answer = (
                "The indexed evidence is too weak to support a firm answer. The closest relevant material says: "
                + answer
            )

        return {
            "answer": answer,
            "citations": unique_citations,
            "insufficient_evidence": insufficient,
        }


client = LLMClient()
