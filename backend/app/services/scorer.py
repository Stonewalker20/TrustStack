def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def compute_confidence(evidence_scores: list[float], citations: list[str], insufficient_evidence: bool, answer: str = "") -> float:
    if not evidence_scores:
        return 5.0

    retrieval_strength = sum(evidence_scores) / len(evidence_scores)
    retrieval_norm = _clamp(retrieval_strength)
    evidence_count_score = _clamp(len([s for s in evidence_scores if s >= 0.3]) / 5.0)
    citation_score = _clamp(len(citations) / 3.0)
    honesty_score = 1.0 if insufficient_evidence else 0.85
    verbosity_penalty = 0.0 if len(answer) < 900 else 0.08

    confidence = (
        0.45 * retrieval_norm
        + 0.20 * evidence_count_score
        + 0.20 * citation_score
        + 0.15 * honesty_score
        - verbosity_penalty
    ) * 100.0

    if insufficient_evidence:
        confidence = min(confidence, 55.0)

    return round(max(1.0, confidence), 2)
