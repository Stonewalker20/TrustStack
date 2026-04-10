from __future__ import annotations


FLAG_EXPLANATIONS = {
    "LOW_RETRIEVAL_SUPPORT": "The retrieved passages are only weakly similar to the question, so the answer should be treated as tentative.",
    "NO_CITATIONS": "The answer did not point back to specific evidence chunks, which reduces traceability for the user.",
    "INSUFFICIENT_EVIDENCE": "The system explicitly detected that the indexed material was not strong enough to support a firm conclusion.",
    "POSSIBLE_HALLUCINATION": "The answer is relatively long compared with the available evidence, so the model may be filling gaps with unsupported detail.",
    "OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW": "The answer contains operational or procedural language that should be reviewed by a qualified human before action is taken.",
}


def _format_percent(value: float) -> str:
    return f"{round(value * 100, 1)}%"


def build_query_explanation(
    *,
    confidence_score: float,
    evidence_scores: list[float],
    citations: list[str],
    insufficient_evidence: bool,
    risk_flags: list[str],
    answer: str,
) -> dict:
    avg_retrieval = sum(evidence_scores) / len(evidence_scores) if evidence_scores else 0.0
    supporting_chunks = len([score for score in evidence_scores if score >= 0.3])
    citation_coverage = len(citations)
    honesty_score = 1.0 if insufficient_evidence else 0.85
    verbosity_penalty = 0.0 if len(answer) < 900 else 0.08

    evidence_strength = (
        f"Average retrieval support is {_format_percent(avg_retrieval)} across {len(evidence_scores)} evidence chunks, "
        f"with {supporting_chunks} chunk(s) clearing the strong-support threshold."
    )
    citation_summary = (
        f"The answer cites {citation_coverage} chunk(s), which helps the user trace the claim back to the indexed source material."
        if citations
        else "The answer does not cite any retrieved chunk, so the user cannot easily verify where the claim came from."
    )

    if confidence_score >= 80 and not risk_flags:
        review_recommendation = "This result is strong enough for low-risk use, but the user should still read the cited material before acting on it."
    elif confidence_score >= 60:
        review_recommendation = "This result is useful for orientation, but the user should verify the citations and check any flagged concerns before relying on it."
    else:
        review_recommendation = "This result should be treated as a starting point only. The user should inspect the evidence directly and avoid taking action without human review."

    teaching_points = [
        "Confidence rises when retrieval quality is strong, multiple chunks support the same answer, and the model cites those chunks clearly.",
        "Confidence falls when support is weak, citations are missing, or the model admits that the evidence is insufficient.",
        "Risk flags are not failures by themselves. They explain what the user should inspect before trusting or operationalizing the answer.",
    ]

    return {
        "overview": (
            f"TrustStack scored this answer at {confidence_score}/100 by combining retrieval strength, citation coverage, "
            "and whether the model stayed honest about missing evidence."
        ),
        "teaching_points": teaching_points,
        "review_recommendation": review_recommendation,
        "score_breakdown": [
            {
                "label": "Retrieval strength",
                "value": round(avg_retrieval * 100, 2),
                "detail": "Higher similarity between the question and retrieved chunks usually means the answer is grounded in more relevant evidence.",
            },
            {
                "label": "Supporting evidence count",
                "value": float(supporting_chunks),
                "detail": "Multiple supporting chunks are better than a single isolated match because they reduce dependence on one fragment of text.",
            },
            {
                "label": "Citation coverage",
                "value": float(citation_coverage),
                "detail": "Citations let the user audit the answer. More citations are useful only when they point to relevant evidence.",
            },
            {
                "label": "Honesty bonus",
                "value": round(honesty_score * 100, 2),
                "detail": "TrustStack rewards the model for admitting when the evidence is not sufficient instead of pretending certainty.",
            },
            {
                "label": "Verbosity penalty",
                "value": round(verbosity_penalty * 100, 2),
                "detail": "Long answers with weak evidence are riskier because they are more likely to include unsupported detail.",
            },
        ],
        "evidence_strength": evidence_strength,
        "citation_coverage": citation_summary,
        "flagged_concerns": [FLAG_EXPLANATIONS.get(flag, flag) for flag in risk_flags],
    }
