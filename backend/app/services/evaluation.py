from __future__ import annotations

from collections.abc import Iterable

FRAMEWORK_NAME = "TrustStack Evaluation Standard"
FRAMEWORK_VERSION = "1.0"
PASS_THRESHOLD = 80.0
REVIEW_THRESHOLD = 60.0

DIMENSION_SPECS = [
    {
        "key": "retrieval_alignment",
        "label": "Retrieval alignment",
        "weight": 0.25,
        "purpose": "Measures how closely the retrieved evidence matches the user question.",
    },
    {
        "key": "evidence_coverage",
        "label": "Evidence coverage",
        "weight": 0.18,
        "purpose": "Measures whether enough supporting chunks were found to justify the answer.",
    },
    {
        "key": "citation_traceability",
        "label": "Citation traceability",
        "weight": 0.16,
        "purpose": "Measures whether the answer cites the retrieved evidence that supports it.",
    },
    {
        "key": "honesty_and_abstention",
        "label": "Honesty and abstention",
        "weight": 0.17,
        "purpose": "Rewards the model for acknowledging uncertainty instead of overstating support.",
    },
    {
        "key": "answer_parsimony",
        "label": "Answer parsimony",
        "weight": 0.10,
        "purpose": "Measures whether the answer length is proportional to the strength of the evidence.",
    },
    {
        "key": "safety_and_operational_review",
        "label": "Safety and operational review",
        "weight": 0.08,
        "purpose": "Measures whether the answer contains procedural advice that should be reviewed by a human.",
    },
    {
        "key": "support_consistency",
        "label": "Support consistency",
        "weight": 0.06,
        "purpose": "Measures whether the retrieved evidence, citations, and answer reinforce each other.",
    },
]


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _format_percent(value: float) -> str:
    return f"{round(value * 100, 1)}%"


def _make_verdict(score: float) -> str:
    if score >= PASS_THRESHOLD:
        return "pass"
    if score >= REVIEW_THRESHOLD:
        return "review"
    return "fail"


def _make_status(score: float, high: float, medium: float) -> str:
    if score >= high:
        return "pass"
    if score >= medium:
        return "review"
    return "fail"


def _signal_list(*signals: str) -> list[str]:
    return [signal for signal in signals if signal]


def _average(values: Iterable[float]) -> float:
    values = list(values)
    return sum(values) / len(values) if values else 0.0


def build_evaluation_report(
    *,
    question: str,
    answer: str,
    evidence_scores: list[float],
    citations: list[str],
    evidence_ids: list[str],
    insufficient_evidence: bool,
    risk_flags: list[str],
) -> dict:
    avg_retrieval = _average(evidence_scores)
    supporting_chunks = len([score for score in evidence_scores if score >= 0.3])
    strong_support_chunks = len([score for score in evidence_scores if score >= 0.55])
    citation_count = len(citations)
    evidence_id_set = set(evidence_ids)
    matched_citations = [citation for citation in citations if citation in evidence_id_set]
    citation_match_ratio = len(matched_citations) / citation_count if citation_count else 0.0
    answer_length = len(answer.strip())
    answer_is_long = answer_length >= 900
    answer_is_concise = answer_length < 650
    evidence_count = len(evidence_scores)

    retrieval_alignment = round(_clamp(avg_retrieval * 100.0), 2)

    coverage_ratio = supporting_chunks / max(1, evidence_count)
    volume_ratio = min(1.0, evidence_count / 5.0)
    evidence_coverage = round(_clamp((0.62 * coverage_ratio + 0.38 * volume_ratio) * 100.0), 2)

    citation_traceability = round(_clamp((0.75 * citation_match_ratio + 0.25 * min(1.0, citation_count / 3.0)) * 100.0), 2)

    honesty_and_abstention = 100.0 if insufficient_evidence else 85.0
    if not insufficient_evidence and avg_retrieval < 0.35:
        honesty_and_abstention -= 18.0
    if not insufficient_evidence and answer_is_long and avg_retrieval < 0.5:
        honesty_and_abstention -= 12.0
    if insufficient_evidence and answer_is_long:
        honesty_and_abstention -= 4.0
    honesty_and_abstention = round(_clamp(honesty_and_abstention), 2)

    if answer_length < 240:
        answer_parsimony = 92.0
    elif answer_length < 650:
        answer_parsimony = 86.0
    elif answer_length < 1200:
        answer_parsimony = 74.0
    else:
        answer_parsimony = 60.0
    if avg_retrieval < 0.35:
        answer_parsimony -= 10.0
    if insufficient_evidence and answer_is_long:
        answer_parsimony -= 8.0
    answer_parsimony = round(_clamp(answer_parsimony), 2)

    safety_and_operational_review = 100.0
    penalty_map = {
        "OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW": 35.0,
        "POSSIBLE_HALLUCINATION": 20.0,
        "LOW_RETRIEVAL_SUPPORT": 12.0,
        "NO_CITATIONS": 10.0,
        "INSUFFICIENT_EVIDENCE": 15.0,
    }
    for flag in risk_flags:
        safety_and_operational_review -= penalty_map.get(flag, 0.0)
    safety_and_operational_review = round(_clamp(safety_and_operational_review), 2)

    support_consistency = 0.0
    if evidence_count:
        coverage_bonus = min(1.0, strong_support_chunks / 3.0)
        trace_bonus = 1.0 if citation_match_ratio >= 0.75 else citation_match_ratio
        support_consistency = (0.55 * coverage_bonus + 0.45 * trace_bonus) * 100.0
        if citations and not matched_citations:
            support_consistency -= 15.0
    support_consistency = round(_clamp(support_consistency), 2)

    dimensions = [
        {
            "key": "retrieval_alignment",
            "label": "Retrieval alignment",
            "weight": 0.25,
            "score": retrieval_alignment,
            "status": _make_status(retrieval_alignment, 75.0, 50.0),
            "signals": _signal_list(
                f"average_retrieval={_format_percent(avg_retrieval)}",
                f"supporting_chunks={supporting_chunks}",
                f"strong_support_chunks={strong_support_chunks}",
            ),
            "rationale": "Grounded answers start with evidence that actually matches the user's question.",
        },
        {
            "key": "evidence_coverage",
            "label": "Evidence coverage",
            "weight": 0.18,
            "score": evidence_coverage,
            "status": _make_status(evidence_coverage, 70.0, 45.0),
            "signals": _signal_list(
                f"evidence_chunks={evidence_count}",
                f"supporting_chunk_ratio={round(coverage_ratio * 100.0, 1)}%",
                f"volume_ratio={round(volume_ratio * 100.0, 1)}%",
            ),
            "rationale": "Multiple aligned evidence chunks reduce the chance that the answer depends on one weak fragment.",
        },
        {
            "key": "citation_traceability",
            "label": "Citation traceability",
            "weight": 0.16,
            "score": citation_traceability,
            "status": _make_status(citation_traceability, 75.0, 40.0),
            "signals": _signal_list(
                f"citations={citation_count}",
                f"matched_citations={len(matched_citations)}",
                f"trace_ratio={round(citation_match_ratio * 100.0, 1)}%",
            ),
            "rationale": "Citations should point back to retrieved chunks so a user can audit the answer.",
        },
        {
            "key": "honesty_and_abstention",
            "label": "Honesty and abstention",
            "weight": 0.17,
            "score": honesty_and_abstention,
            "status": _make_status(honesty_and_abstention, 90.0, 55.0),
            "signals": _signal_list(
                f"insufficient_evidence={insufficient_evidence}",
                f"answer_length={answer_length}",
                f"question_length={len(question.strip())}",
            ),
            "rationale": "A trustworthy model should say when it is missing support instead of overstating certainty.",
        },
        {
            "key": "answer_parsimony",
            "label": "Answer parsimony",
            "weight": 0.10,
            "score": answer_parsimony,
            "status": _make_status(answer_parsimony, 80.0, 55.0),
            "signals": _signal_list(
                f"answer_length={answer_length}",
                f"concise={answer_is_concise}",
                f"long_answer={answer_is_long}",
            ),
            "rationale": "Long answers are not always bad, but they become riskier when the evidence is weak.",
        },
        {
            "key": "safety_and_operational_review",
            "label": "Safety and operational review",
            "weight": 0.08,
            "score": safety_and_operational_review,
            "status": _make_status(safety_and_operational_review, 85.0, 60.0),
            "signals": _signal_list(*risk_flags),
            "rationale": "Operational or procedural guidance deserves a human check before anyone acts on it.",
        },
        {
            "key": "support_consistency",
            "label": "Support consistency",
            "weight": 0.06,
            "score": support_consistency,
            "status": _make_status(support_consistency, 75.0, 45.0),
            "signals": _signal_list(
                f"matched_citations={len(matched_citations)}",
                f"supporting_chunks={supporting_chunks}",
            ),
            "rationale": "The retrieved evidence, citations, and final answer should reinforce one another.",
        },
    ]

    overall_score = round(
        sum(dimension["score"] * dimension["weight"] for dimension in dimensions),
        2,
    )
    verdict = _make_verdict(overall_score)

    checks = [
        {
            "key": "evidence_present",
            "label": "Evidence present",
            "status": "pass" if evidence_count else "fail",
            "detail": f"Retrieved {evidence_count} evidence chunk(s) for the answer.",
        },
        {
            "key": "retrieval_strength",
            "label": "Retrieval strength",
            "status": _make_status(retrieval_alignment, 70.0, 40.0),
            "detail": f"Average retrieval support is {_format_percent(avg_retrieval)}.",
        },
        {
            "key": "supporting_chunk_count",
            "label": "Supporting chunk count",
            "status": _make_status(float(supporting_chunks), 3.0, 1.0),
            "detail": f"{supporting_chunks} chunk(s) cleared the strong-support threshold.",
        },
        {
            "key": "citation_presence",
            "label": "Citation presence",
            "status": "pass" if citations else "fail",
            "detail": "The answer cites retrieved chunks." if citations else "The answer does not point back to specific evidence.",
        },
        {
            "key": "citation_traceability",
            "label": "Citation traceability",
            "status": _make_status(citation_traceability, 75.0, 40.0),
            "detail": (
                f"{len(matched_citations)} of {citation_count} citation(s) matched the retrieved evidence."
                if citation_count
                else "No citations were available for traceability checks."
            ),
        },
        {
            "key": "honesty_signal",
            "label": "Honesty signal",
            "status": "pass" if insufficient_evidence or avg_retrieval >= 0.35 else "review",
            "detail": "The answer explicitly acknowledged uncertainty." if insufficient_evidence else "The answer did not need an abstention signal.",
        },
        {
            "key": "parsimony",
            "label": "Parsimony",
            "status": "pass" if answer_is_concise else ("review" if answer_is_long else "pass"),
            "detail": f"Answer length is {answer_length} character(s), which {'fits' if answer_is_concise else 'may be long for the evidence available'}.",
        },
        {
            "key": "safety_review",
            "label": "Safety review",
            "status": "fail" if "OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW" in risk_flags else ("review" if risk_flags else "pass"),
            "detail": "Operational guidance needs a human review." if "OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW" in risk_flags else "No immediate operational red flag was detected.",
        },
    ]

    teaching_points = [
        "TrustStack now scores answers with a fixed evaluation standard so the result can be compared across runs.",
        "The strongest results combine high retrieval alignment, traceable citations, and a clear honesty signal when evidence is thin.",
        "A lower verdict does not mean the answer is useless; it means the user should inspect the evidence before acting on it.",
    ]

    next_step = (
        "Review the cited chunks and use the answer as a starting point before making a decision."
        if verdict != "pass"
        else "The result is strong enough for low-risk use, but the cited material should still be read before acting."
    )

    framework = {
        "name": FRAMEWORK_NAME,
        "version": FRAMEWORK_VERSION,
        "description": "A weighted, evidence-first evaluation standard for TrustStack answers.",
        "score_range": "0-100",
        "pass_threshold": PASS_THRESHOLD,
        "review_threshold": REVIEW_THRESHOLD,
        "dimensions": DIMENSION_SPECS,
    }

    return {
        "framework": framework,
        "overall_score": overall_score,
        "verdict": verdict,
        "summary": (
            f"TrustStack scored this answer at {overall_score}/100 under {FRAMEWORK_NAME} v{FRAMEWORK_VERSION}, "
            f"which places it in the {verdict.upper()} band."
        ),
        "teaching_points": teaching_points,
        "next_step": next_step,
        "dimensions": dimensions,
        "checks": checks,
    }
