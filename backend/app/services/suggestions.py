from __future__ import annotations

import re
from collections import Counter
from typing import Any


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
    "operator",
    "system",
    "equipment",
    "evidence",
    "document",
    "uploaded",
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


def _topic_from_sentence(sentence: str, fallback_keywords: list[str]) -> str:
    tokens = [token for token in _tokenize(sentence) if token not in STOPWORDS]
    topic_tokens = tokens[:5] or fallback_keywords[:3] or ["the procedure"]
    return " ".join(topic_tokens)


def _clip_topic(topic: str, max_words: int = 6) -> str:
    parts = topic.split()
    return " ".join(parts[:max_words]).strip() or topic


CALIBRATED_SCORE_BANDS = (
    ("80-90", 80.0, 90.0),
    ("65-79", 65.0, 79.99),
    ("50-64", 50.0, 64.99),
    ("30-45", 30.0, 45.0),
)


def _make_prompt(question: str, support_level: str, target_score_range: str) -> dict[str, str]:
    return {
        "question": _clean_prompt_text(question),
        "support_level": support_level,
        "target_score_range": target_score_range,
    }


def _band_for_score(score: float) -> str | None:
    for label, low, high in CALIBRATED_SCORE_BANDS:
        if low <= score <= high:
            return label
    return None


def _default_prompt_scorer(question: str) -> dict[str, Any]:
    from app.services.rag import answer_question

    return answer_question(question)


def calibrate_sample_questions(
    chunks: list[dict],
    *,
    limit: int = 4,
    scorer=None,
) -> list[dict[str, Any]]:
    scorer = scorer or _default_prompt_scorer
    candidates = build_sample_questions(chunks, limit=max(16, limit * 4))
    scored_candidates: list[dict[str, Any]] = []

    for candidate in candidates:
        try:
            result = scorer(candidate["question"])
        except Exception:
            continue

        actual_score = round(float(result.get("confidence_score", 0.0)), 2)
        band = _band_for_score(actual_score)
        if not band:
            continue

        scored_candidates.append(
            {
                "question": candidate["question"],
                "support_level": "supported" if actual_score >= 60.0 else "weak",
                "target_score_range": band,
                "actual_score": actual_score,
            }
        )

    selected: list[dict[str, Any]] = []
    used_questions: set[str] = set()
    for label, low, high in CALIBRATED_SCORE_BANDS:
        band_center = (low + high) / 2.0
        matches = [
            item for item in scored_candidates
            if item["target_score_range"] == label and item["question"].lower() not in used_questions
        ]
        if not matches:
            continue

        pick = min(
            matches,
            key=lambda item: (abs(item["actual_score"] - band_center), len(item["question"])),
        )
        used_questions.add(pick["question"].lower())
        selected.append(pick)
        if len(selected) >= limit:
            break

    return selected


def build_sample_questions(chunks: list[dict], limit: int = 6) -> list[dict[str, str]]:
    if not chunks:
        return []

    combined_text = " ".join(chunk.get("text", "") for chunk in chunks[:18])
    keyword_counts = Counter(token for token in _tokenize(combined_text) if token not in STOPWORDS)
    keywords = [token for token, _ in keyword_counts.most_common(12)]

    requirement_topics: list[str] = []
    process_topics: list[str] = []
    warning_topics: list[str] = []
    descriptive_topics: list[str] = []

    for chunk in chunks[:10]:
        sentences = re.split(r"(?<=[.!?])\s+", chunk.get("text", ""))
        for sentence in sentences:
            cleaned = _clean_sentence(sentence)
            if len(cleaned) < 48:
                continue

            lower = cleaned.lower()
            topic = _clip_topic(_topic_from_sentence(cleaned, keywords))
            if any(term in lower for term in ["must", "required", "require", "shall", "should"]):
                requirement_topics.append(topic)
            if any(term in lower for term in ["before", "after", "during", "process", "procedure", "step"]):
                process_topics.append(topic)
            if any(term in lower for term in ["risk", "hazard", "warning", "danger", "unsafe"]):
                warning_topics.append(topic)
            if any(term in lower for term in ["define", "means", "indicates", "represents"]):
                descriptive_topics.append(topic)

    suggestion_candidates: list[dict[str, str]] = []

    primary_requirement = requirement_topics[0] if requirement_topics else _clip_topic(" ".join(keywords[:4]) or "startup inspection")
    primary_process = process_topics[0] if process_topics else primary_requirement
    primary_warning = warning_topics[0] if warning_topics else primary_requirement
    primary_descriptive = descriptive_topics[0] if descriptive_topics else primary_requirement

    suggestion_candidates.extend(
        [
            _make_prompt(
                f"According to the evidence, what is explicitly required for {primary_requirement}?",
                "supported",
                "80-90",
            ),
            _make_prompt(
                f"What step-by-step process does the evidence describe for {primary_process}?",
                "supported",
                "70-82",
            ),
            _make_prompt(
                f"What risks, warnings, or constraints does the evidence state about {primary_warning}?",
                "supported",
                "60-75",
            ),
            _make_prompt(
                f"What exact numeric threshold, timing detail, or exception is stated for {primary_requirement}?",
                "weak",
                "30-45",
            ),
            _make_prompt(
                f"What remains unclear or only weakly supported in the evidence about {primary_descriptive}?",
                "weak",
                "40-55",
            ),
        ]
    )

    for keyword in keywords[:3]:
        topic = _clip_topic(keyword)
        suggestion_candidates.append(
            _make_prompt(
                f"What does the evidence directly support about {topic}?",
                "supported",
                "75-88",
            )
        )
        suggestion_candidates.append(
            _make_prompt(
                f"What would still be difficult to answer confidently about {topic} from this evidence?",
                "weak",
                "35-50",
            )
        )

    deduped: list[dict[str, str]] = []
    seen: set[str] = set()
    for suggestion in suggestion_candidates:
        normalized = _clean_prompt_text(suggestion["question"])
        if len(normalized) < 12:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(
            {
                "question": normalized,
                "support_level": suggestion["support_level"],
                "target_score_range": suggestion["target_score_range"],
            }
        )
        if len(deduped) >= limit:
            break

    if deduped and not any(item["support_level"] == "weak" for item in deduped):
        weak_fallback = None
        if keywords:
            weak_fallback = _make_prompt(
                f"What would still be hard to answer confidently about {keywords[0]} from this evidence?",
                "weak",
                "35-50",
            )
        else:
            weak_fallback = _make_prompt(
                "What important detail might still be only weakly supported by the uploaded evidence?",
                "weak",
                "35-50",
            )

        if all(item["question"].lower() != weak_fallback["question"].lower() for item in deduped):
            if len(deduped) >= limit:
                deduped[-1] = weak_fallback
            else:
                deduped.append(weak_fallback)

    if deduped:
        return deduped

    return [
        _make_prompt("What are the main requirements described in the uploaded evidence?", "supported", "80-90"),
        _make_prompt("What steps or procedures are documented in the uploaded evidence?", "supported", "70-82"),
        _make_prompt("What exact detail appears least supported by the uploaded evidence?", "weak", "30-45"),
    ][:limit]
