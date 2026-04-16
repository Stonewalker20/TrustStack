def build_risk_flags(evidence_scores: list[float], citations: list[str], insufficient_evidence: bool, answer: str) -> list[str]:
    flags = []
    avg_score = sum(evidence_scores) / len(evidence_scores) if evidence_scores else 0.0

    if not evidence_scores or avg_score < 0.35:
        flags.append("LOW_RETRIEVAL_SUPPORT")
    if not citations and not insufficient_evidence:
        flags.append("NO_CITATIONS")
    if insufficient_evidence:
        flags.append("INSUFFICIENT_EVIDENCE")
    if len(answer) > 700 and avg_score < 0.50:
        flags.append("POSSIBLE_HALLUCINATION")
    if any(term in answer.lower() for term in ["replace", "repair", "shut off", "override", "bypass"]):
        flags.append("OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW")

    return list(dict.fromkeys(flags))


def summarize_trust(confidence_score: float, risk_flags: list[str]) -> str:
    if confidence_score >= 80 and not risk_flags:
        return "High confidence. The answer is directly supported by relevant evidence."
    if confidence_score >= 60:
        return "Moderate confidence. Relevant evidence was found, but review the support before acting."
    return "Low confidence. The answer may be weakly supported or missing adequate evidence."
