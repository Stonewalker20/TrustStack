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
    evaluation: dict | None = None,
) -> dict:
    avg_retrieval = sum(evidence_scores) / len(evidence_scores) if evidence_scores else 0.0
    supporting_chunks = len([score for score in evidence_scores if score >= 0.3])
    citation_count = len(citations)
    honesty_score = 1.0 if insufficient_evidence else 0.85
    verbosity_penalty = 0.0 if len(answer) < 900 else 0.08

    evidence_strength = (
        f"Average retrieval support is {_format_percent(avg_retrieval)} across {len(evidence_scores)} evidence chunks, "
        f"with {supporting_chunks} chunk(s) clearing the strong-support threshold."
    )
    citation_summary = (
        f"The answer cites {citation_count} chunk(s), which helps the user trace the claim back to the indexed source material."
        if citations
        else "The answer does not cite any retrieved chunk, so the user cannot easily verify where the claim came from."
    )

    review_recommendation = (
        "This result is strong enough for low-risk use, but the user should still read the cited material before acting on it."
        if confidence_score >= 80 and not risk_flags
        else "This result is useful for orientation, but the user should verify the citations and check any flagged concerns before relying on it."
        if confidence_score >= 60
        else "This result should be treated as a starting point only. The user should inspect the evidence directly and avoid taking action without human review."
    )

    teaching_points = [
        "Confidence rises when retrieval quality is strong, multiple chunks support the same answer, and the model cites those chunks clearly.",
        "Confidence falls when support is weak, citations are missing, or the model admits that the evidence is insufficient.",
        "Risk flags are not failures by themselves. They explain what the user should inspect before trusting or operationalizing the answer.",
    ]

    score_breakdown = [
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
            "value": float(citation_count),
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
    ]

    overview = (
        f"TrustStack scored this answer at {confidence_score}/100 by combining a fixed evaluation standard, "
        "citation traceability, and whether the model stayed honest about missing evidence."
    )

    if evaluation and evaluation.get("dimensions"):
        dimensions = evaluation["dimensions"]
        retrieval_dimension = next((dimension for dimension in dimensions if dimension["key"] == "retrieval_alignment"), None)
        citation_dimension = next((dimension for dimension in dimensions if dimension["key"] == "citation_traceability"), None)
        honesty_dimension = next((dimension for dimension in dimensions if dimension["key"] == "honesty_and_abstention"), None)
        support_dimension = next((dimension for dimension in dimensions if dimension["key"] == "support_consistency"), None)

        if evaluation.get("summary"):
            overview = evaluation["summary"]
        if evaluation.get("next_step"):
            review_recommendation = evaluation["next_step"]
        if retrieval_dimension:
            evidence_strength = (
                f"Retrieval alignment scored {retrieval_dimension['score']}/100 across {len(evidence_scores)} evidence chunk(s), "
                f"with {supporting_chunks} strong-support chunk(s)."
            )
        if citation_dimension:
            citation_summary = (
                f"TrustStack traced the answer through {citation_count} citation(s), and the evaluation framework exposes citation traceability explicitly."
            )

        teaching_points = list(evaluation.get("teaching_points", []))
        if retrieval_dimension:
            teaching_points.append(
                f"Retrieval alignment is {retrieval_dimension['score']}/100, which ties the score to how closely the evidence matched the question."
            )
        if citation_dimension:
            teaching_points.append(
                f"Citation traceability is {citation_dimension['score']}/100, so the user can see whether the answer points back to the actual retrieved chunks."
            )
        if honesty_dimension:
            teaching_points.append(
                f"Honesty and abstention are scored at {honesty_dimension['score']}/100, which rewards the model for admitting when support is limited."
            )
        if support_dimension:
            teaching_points.append(
                f"Support consistency is {support_dimension['score']}/100, showing whether the retrieved evidence and final answer reinforce each other."
            )

        score_breakdown = [
            {
                "label": dimension["label"],
                "value": float(dimension["score"]),
                "detail": dimension["rationale"],
            }
            for dimension in dimensions
        ]

    strengths = list(evaluation.get("strengths", [])) if evaluation else []
    weaknesses = list(evaluation.get("weaknesses", [])) if evaluation else []
    failure_modes = list(evaluation.get("failure_modes", [])) if evaluation else []
    recommended_followups = list(evaluation.get("recommended_followups", [])) if evaluation else []

    return {
        "overview": overview,
        "teaching_points": teaching_points,
        "review_recommendation": review_recommendation,
        "score_breakdown": score_breakdown,
        "evidence_strength": evidence_strength,
        "citation_coverage": citation_summary,
        "flagged_concerns": [FLAG_EXPLANATIONS.get(flag, flag) for flag in risk_flags],
        "strengths": strengths,
        "weaknesses": weaknesses,
        "failure_modes": failure_modes,
        "recommended_followups": recommended_followups,
    }
