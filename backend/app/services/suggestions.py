from __future__ import annotations

import re
from collections import Counter


STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "your",
    "what",
    "when",
    "where",
    "which",
    "while",
    "have",
    "will",
    "would",
    "could",
    "should",
    "about",
    "before",
    "after",
    "during",
    "through",
    "there",
    "their",
    "them",
    "they",
    "then",
    "than",
    "been",
    "being",
    "were",
    "into",
    "onto",
    "page",
}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", text.lower())


def _clean_sentence(text: str) -> str:
    return " ".join(text.split()).strip(" -")


def build_sample_questions(chunks: list[dict], limit: int = 6) -> list[str]:
    if not chunks:
        return []

    combined_text = " ".join(chunk.get("text", "") for chunk in chunks[:18])
    keyword_counts = Counter(token for token in _tokenize(combined_text) if token not in STOPWORDS)
    keywords = [token for token, _ in keyword_counts.most_common(12)]

    suggestions: list[str] = []
    for chunk in chunks[:10]:
        sentences = re.split(r"(?<=[.!?])\s+", chunk.get("text", ""))
        for sentence in sentences:
            cleaned = _clean_sentence(sentence)
            if len(cleaned) < 48:
                continue

            lower = cleaned.lower()
            if any(term in lower for term in ["must", "required", "require", "shall", "should"]):
                suggestions.append(f"What requirements does the evidence describe about {cleaned[:72].rstrip(' ,.;:')}?")
            if any(term in lower for term in ["before", "after", "during", "process", "procedure", "step"]):
                suggestions.append(f"What process or sequence does the evidence describe around {cleaned[:72].rstrip(' ,.;:')}?")
            if any(term in lower for term in ["risk", "hazard", "warning", "danger", "unsafe"]):
                suggestions.append(f"What risks or warnings are described in the uploaded evidence?")
            if any(term in lower for term in ["define", "means", "indicates", "represents"]):
                suggestions.append(f"What does the evidence say about {cleaned[:68].rstrip(' ,.;:')}?")

            if len(suggestions) >= limit * 3:
                break
        if len(suggestions) >= limit * 3:
            break

    for keyword in keywords[:4]:
        suggestions.append(f"What does the uploaded evidence say about {keyword}?")
        suggestions.append(f"Which evidence chunks are most relevant to {keyword}?")

    deduped: list[str] = []
    seen: set[str] = set()
    for suggestion in suggestions:
        normalized = " ".join(suggestion.split())
        if len(normalized) < 12:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(normalized)
        if len(deduped) >= limit:
            break

    if deduped:
        return deduped

    return [
        "What are the main requirements described in the uploaded evidence?",
        "What steps or procedures are documented in the uploaded evidence?",
        "What risks, warnings, or limitations appear in the uploaded evidence?",
    ][:limit]
