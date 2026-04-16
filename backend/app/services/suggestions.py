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
    normalized = " ".join(text.split())
    normalized = normalized.replace("•", " ").replace("|", " ").replace("_", " ")
    normalized = re.sub(r"[\[\]\{\}<>\*\^~`]+", "", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip(" -:;,.")

def _clean_prompt_text(text: str) -> str:
    cleaned = _clean_sentence(text)
    cleaned = re.sub(r"[^\w\s,\-?]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if cleaned and not cleaned.endswith("?"):
        cleaned = cleaned.rstrip(" ,.;:") + "?"
    return cleaned


def build_sample_questions(chunks: list[dict], limit: int = 6) -> list[dict[str, str]]:
    if not chunks:
        return []

    combined_text = " ".join(chunk.get("text", "") for chunk in chunks[:18])
    keyword_counts = Counter(token for token in _tokenize(combined_text) if token not in STOPWORDS)
    keywords = [token for token, _ in keyword_counts.most_common(12)]

    suggestions: list[dict[str, str]] = []
    for chunk in chunks[:10]:
        sentences = re.split(r"(?<=[.!?])\s+", chunk.get("text", ""))
        for sentence in sentences:
            cleaned = _clean_sentence(sentence)
            if len(cleaned) < 48:
                continue

            lower = cleaned.lower()
            if any(term in lower for term in ["must", "required", "require", "shall", "should"]):
                suggestions.append(
                    {
                        "question": _clean_prompt_text(
                            f"What requirements does the evidence describe about {cleaned[:72]}?"
                        ),
                        "support_level": "supported",
                    }
                )
            if any(term in lower for term in ["before", "after", "during", "process", "procedure", "step"]):
                suggestions.append(
                    {
                        "question": _clean_prompt_text(
                            f"What process or sequence does the evidence describe around {cleaned[:72]}?"
                        ),
                        "support_level": "supported",
                    }
                )
            if any(term in lower for term in ["risk", "hazard", "warning", "danger", "unsafe"]):
                suggestions.append(
                    {
                        "question": "What risks or warnings are described in the uploaded evidence?",
                        "support_level": "supported",
                    }
                )
            if any(term in lower for term in ["define", "means", "indicates", "represents"]):
                suggestions.append(
                    {
                        "question": _clean_prompt_text(f"What does the evidence say about {cleaned[:68]}?"),
                        "support_level": "supported",
                    }
                )

            if len(suggestions) >= limit * 3:
                break
        if len(suggestions) >= limit * 3:
            break

    for keyword in keywords[:4]:
        suggestions.append(
            {
                "question": _clean_prompt_text(f"What does the uploaded evidence clearly support about {keyword}?"),
                "support_level": "supported",
            }
        )
        suggestions.append(
            {
                "question": _clean_prompt_text(f"What might be hard to answer confidently from the evidence about {keyword}?"),
                "support_level": "weak",
            }
        )

    deduped: list[dict[str, str]] = []
    seen: set[str] = set()
    for suggestion in suggestions:
        normalized = _clean_prompt_text(suggestion["question"])
        if len(normalized) < 12:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append({"question": normalized, "support_level": suggestion["support_level"]})
        if len(deduped) >= limit:
            break

    if deduped and not any(item["support_level"] == "weak" for item in deduped):
        weak_fallback = None
        if keywords:
            weak_fallback = {
                "question": _clean_prompt_text(f"What might be hard to answer confidently from the evidence about {keywords[0]}?"),
                "support_level": "weak",
            }
        else:
            weak_fallback = {
                "question": "What important detail might still be weakly supported by the uploaded evidence?",
                "support_level": "weak",
            }

        if all(item["question"].lower() != weak_fallback["question"].lower() for item in deduped):
            if len(deduped) >= limit:
                deduped[-1] = weak_fallback
            else:
                deduped.append(weak_fallback)

    if deduped:
        return deduped

    return [
        {"question": "What are the main requirements described in the uploaded evidence?", "support_level": "supported"},
        {"question": "What steps or procedures are documented in the uploaded evidence?", "support_level": "supported"},
        {"question": "What risks, warnings, or limitations appear in the uploaded evidence?", "support_level": "weak"},
    ][:limit]
