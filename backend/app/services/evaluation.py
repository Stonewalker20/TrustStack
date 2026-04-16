from __future__ import annotations

import re
from collections.abc import Iterable

FRAMEWORK_NAME = "TrustStack Evaluation Standard"
FRAMEWORK_VERSION = "2.0"
PASS_THRESHOLD = 80.0
REVIEW_THRESHOLD = 60.0

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
    "does",
    "say",
    "says",
    "evidence",
    "uploaded",
}

DIMENSION_SPECS = [
    {
        "key": "retrieval_relevance",
        "label": "Retrieval relevance",
        "weight": 0.16,
        "purpose": "Measures whether the retrieved evidence is strongly aligned with the question instead of relying on one weak match.",
    },
    {
        "key": "evidence_sufficiency",
        "label": "Evidence sufficiency",
        "weight": 0.13,
        "purpose": "Measures whether the answer is backed by enough non-duplicative support across the corpus.",
    },
    {
        "key": "citation_traceability",
        "label": "Citation traceability",
        "weight": 0.12,
        "purpose": "Measures whether citations point back to the retrieved evidence and cover the answer transparently.",
    },
    {
        "key": "claim_support",
        "label": "Claim support",
        "weight": 0.15,
        "purpose": "Measures whether the answer's individual claims are explicitly supported by the retrieved evidence.",
    },
    {
        "key": "contradiction_risk",
        "label": "Contradiction risk",
        "weight": 0.10,
        "purpose": "Measures whether the answer appears to conflict with the retrieved evidence.",
    },
    {
        "key": "completeness",
        "label": "Completeness",
        "weight": 0.09,
        "purpose": "Measures whether the answer addresses the major terms and demands of the question.",
    },
    {
        "key": "honesty_and_abstention",
        "label": "Honesty and abstention",
        "weight": 0.10,
        "purpose": "Rewards the model for acknowledging uncertainty instead of overstating support.",
    },
    {
        "key": "answer_discipline",
        "label": "Answer discipline",
        "weight": 0.06,
        "purpose": "Measures whether the answer stays proportional to the evidence without drifting into unsupported detail.",
    },
    {
        "key": "safety_and_operational_risk",
        "label": "Safety and operational risk",
        "weight": 0.05,
        "purpose": "Measures whether the answer contains procedural or high-stakes guidance that needs review.",
    },
    {
        "key": "calibration_and_consistency",
        "label": "Calibration and consistency",
        "weight": 0.04,
        "purpose": "Measures whether the overall score and explanation are calibrated to the evidence quality and detected weaknesses.",
    },
]

NEGATION_TERMS = {"not", "no", "never", "without", "cannot", "can't", "mustn't", "prohibited", "forbidden"}
REQUIREMENT_TERMS = {"must", "required", "require", "shall", "mandatory"}
PERMISSION_TERMS = {"may", "can", "allowed", "permitted", "optional"}
HIGH_STAKES_TERMS = {
    "bypass",
    "override",
    "restart",
    "repair",
    "operate",
    "energize",
    "administer",
    "prescribe",
    "comply",
    "deploy",
    "ship",
    "approve",
    "legal",
    "financial",
    "medical",
}


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


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", text.lower())


def _content_tokens(text: str) -> set[str]:
    return {token for token in _tokenize(text) if token not in STOPWORDS}


def _sentence_split(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", text) if part.strip()]


def _extract_claims(answer: str) -> list[str]:
    claims = [sentence for sentence in _sentence_split(answer) if len(sentence) >= 18]
    return claims or ([answer.strip()] if answer.strip() else [])


def _jaccard_similarity(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def _max_claim_support(claim: str, hits: list[dict]) -> tuple[float, list[str]]:
    claim_tokens = _content_tokens(claim)
    best_score = 0.0
    supporting_chunk_ids: list[str] = []
    for hit in hits:
        evidence_tokens = _content_tokens(hit.get("text", ""))
        overlap = _jaccard_similarity(claim_tokens, evidence_tokens)
        recall = len(claim_tokens & evidence_tokens) / max(1, len(claim_tokens)) if claim_tokens else 0.0
        weighted = max(
            overlap * (0.65 + 0.35 * float(hit.get("score", 0.0))),
            recall * (0.72 + 0.28 * float(hit.get("score", 0.0))),
        )
        if weighted > best_score + 0.01:
            best_score = weighted
            supporting_chunk_ids = [hit["chunk_id"]]
        elif weighted >= max(0.18, best_score - 0.02):
            supporting_chunk_ids.append(hit["chunk_id"])
            best_score = max(best_score, weighted)
    deduped_ids = list(dict.fromkeys(supporting_chunk_ids))
    return best_score, deduped_ids


def _detect_contradiction(question: str, answer: str, hits: list[dict]) -> tuple[float, list[str]]:
    notes: list[str] = []
    answer_tokens = _content_tokens(answer)
    evidence_text = " ".join(hit.get("text", "") for hit in hits).lower()
    answer_lower = answer.lower()

    contradiction_penalty = 0.0
    answer_has_negation = any(term in answer_lower for term in NEGATION_TERMS)
    evidence_has_negation = any(term in evidence_text for term in NEGATION_TERMS)
    if answer_has_negation != evidence_has_negation:
        contradiction_penalty += 18.0
        notes.append("Negation handling in the answer does not match the retrieved evidence.")

    answer_requires = any(term in answer_lower for term in REQUIREMENT_TERMS)
    evidence_requires = any(term in evidence_text for term in REQUIREMENT_TERMS)
    answer_permissions = any(term in answer_lower for term in PERMISSION_TERMS)
    evidence_permissions = any(term in evidence_text for term in PERMISSION_TERMS)
    if answer_requires and evidence_permissions and not evidence_requires:
        contradiction_penalty += 14.0
        notes.append("The answer reads as mandatory while the evidence reads as permissive.")
    if answer_permissions and evidence_requires:
        contradiction_penalty += 14.0
        notes.append("The answer reads as permissive while the evidence reads as mandatory.")

    answer_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", answer_lower))
    evidence_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", evidence_text))
    missing_numbers = sorted(answer_numbers - evidence_numbers)
    if missing_numbers:
        contradiction_penalty += min(18.0, 6.0 * len(missing_numbers))
        notes.append(f"The answer introduces numeric detail not found in evidence: {', '.join(missing_numbers[:3])}.")

    question_tokens = _content_tokens(question)
    if question_tokens and answer_tokens and not question_tokens & answer_tokens:
        contradiction_penalty += 10.0
        notes.append("The answer drifts away from the key terms in the question.")

    score = round(_clamp(100.0 - contradiction_penalty), 2)
    return score, notes


def build_evaluation_report(
    *,
    question: str,
    answer: str,
    evidence_scores: list[float],
    citations: list[str],
    evidence_ids: list[str],
    insufficient_evidence: bool,
    risk_flags: list[str],
    hits: list[dict] | None = None,
) -> dict:
    hits = hits or []
    avg_retrieval = _average(evidence_scores)
    top_hit_score = max(evidence_scores) if evidence_scores else 0.0
    weak_hit_ratio = len([score for score in evidence_scores if score < 0.3]) / max(1, len(evidence_scores))
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
    source_count = len({hit.get("source", "unknown") for hit in hits}) if hits else 0

    retrieval_distribution = top_hit_score - avg_retrieval if evidence_scores else 0.0
    retrieval_relevance = round(
        _clamp((0.52 * avg_retrieval + 0.3 * top_hit_score + 0.18 * max(0.0, 1.0 - weak_hit_ratio)) * 100.0),
        2,
    )

    coverage_ratio = supporting_chunks / max(1, evidence_count)
    volume_ratio = min(1.0, evidence_count / 5.0)
    diversity_ratio = min(1.0, source_count / 3.0) if source_count else 0.0
    chunk_texts = [hit.get("text", "") for hit in hits]
    redundancy_penalty = 0.0
    if len(chunk_texts) > 1:
        duplicates = len(chunk_texts) - len(set(chunk_texts))
        redundancy_penalty = min(0.18, duplicates / max(1, len(chunk_texts)) * 0.35)
    strength_ratio = min(1.0, (0.55 * avg_retrieval) + (0.45 * top_hit_score))
    evidence_sufficiency = round(
        _clamp(
            (
                0.35 * coverage_ratio
                + 0.15 * volume_ratio
                + 0.15 * diversity_ratio
                + 0.35 * strength_ratio
                - redundancy_penalty
            )
            * 100.0
        ),
        2,
    )

    citation_traceability = round(
        _clamp((0.65 * citation_match_ratio + 0.2 * min(1.0, citation_count / 3.0) + 0.15 * coverage_ratio) * 100.0),
        2,
    )

    claims = []
    unsupported_claim_count = 0
    claim_support_scores: list[float] = []
    for claim in _extract_claims(answer):
        support_score, supporting_chunk_ids = _max_claim_support(claim, hits)
        claim_support_scores.append(support_score)
        status = "supported" if support_score >= 0.18 else "weak"
        if status != "supported":
            unsupported_claim_count += 1
        claims.append(
            {
                "claim": claim,
                "status": status,
                "supporting_chunk_ids": supporting_chunk_ids,
                "notes": (
                    "This claim is directly echoed in the retrieved evidence."
                    if status == "supported"
                    else "This claim is only weakly grounded in the current evidence set."
                ),
            }
        )
    avg_claim_support = _average(claim_support_scores)
    unsupported_claim_ratio = unsupported_claim_count / max(1, len(claims))
    claim_support = round(
        _clamp((0.7 * avg_claim_support + 0.3 * max(0.0, 1.0 - unsupported_claim_ratio)) * 100.0),
        2,
    )

    contradiction_risk, contradiction_notes = _detect_contradiction(question, answer, hits)

    question_tokens = _content_tokens(question)
    answer_tokens = _content_tokens(answer)
    question_coverage_ratio = len(question_tokens & answer_tokens) / max(1, len(question_tokens))
    completeness = round(
        _clamp((0.6 * question_coverage_ratio + 0.4 * coverage_ratio) * 100.0),
        2,
    )

    honesty_and_abstention = 100.0 if insufficient_evidence else 84.0
    if not insufficient_evidence and avg_retrieval < 0.35:
        honesty_and_abstention -= 18.0
    if unsupported_claim_ratio > 0.34:
        honesty_and_abstention -= 12.0
    if insufficient_evidence and answer_is_long:
        honesty_and_abstention -= 5.0
    honesty_and_abstention = round(_clamp(honesty_and_abstention), 2)

    if answer_length < 240:
        answer_discipline = 92.0
    elif answer_length < 650:
        answer_discipline = 86.0
    elif answer_length < 1200:
        answer_discipline = 74.0
    else:
        answer_discipline = 58.0
    if avg_retrieval < 0.35:
        answer_discipline -= 10.0
    if unsupported_claim_ratio > 0.34:
        answer_discipline -= 12.0
    if insufficient_evidence and answer_is_long:
        answer_discipline -= 8.0
    answer_discipline = round(_clamp(answer_discipline), 2)

    safety_and_operational_risk = 100.0
    penalty_map = {
        "OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW": 35.0,
        "POSSIBLE_HALLUCINATION": 18.0,
        "LOW_RETRIEVAL_SUPPORT": 14.0,
        "NO_CITATIONS": 10.0,
        "INSUFFICIENT_EVIDENCE": 16.0,
    }
    for flag in risk_flags:
        safety_and_operational_risk -= penalty_map.get(flag, 0.0)
    if any(term in answer.lower() for term in HIGH_STAKES_TERMS):
        safety_and_operational_risk -= 8.0
    safety_and_operational_risk = round(_clamp(safety_and_operational_risk), 2)

    calibration_and_consistency = 100.0
    if avg_retrieval < 0.35 and not insufficient_evidence:
        calibration_and_consistency -= 22.0
    if unsupported_claim_ratio > 0.34:
        calibration_and_consistency -= 14.0
    if citation_count and citation_match_ratio < 0.5:
        calibration_and_consistency -= 8.0
    calibration_and_consistency = round(_clamp(calibration_and_consistency), 2)

    dimensions = [
        {
            "key": "retrieval_relevance",
            "label": "Retrieval relevance",
            "weight": 0.16,
            "score": retrieval_relevance,
            "status": _make_status(retrieval_relevance, 78.0, 52.0),
            "signals": _signal_list(
                f"avg_retrieval={_format_percent(avg_retrieval)}",
                f"top_hit={_format_percent(top_hit_score)}",
                f"weak_hit_ratio={round(weak_hit_ratio * 100.0, 1)}%",
            ),
            "rationale": "Strong retrieval should stay broad and stable across the top evidence instead of peaking on one isolated hit.",
            "subscore_inputs": {
                "avg_hit_score": round(avg_retrieval, 4),
                "top_hit_score": round(top_hit_score, 4),
                "weak_hit_ratio": round(weak_hit_ratio, 4),
                "score_decay": round(retrieval_distribution, 4),
            },
            "penalties": ["high_weak_hit_ratio"] if weak_hit_ratio > 0.4 else [],
            "passed_checks": ["top_hit_strength"] if top_hit_score >= 0.55 else [],
        },
        {
            "key": "evidence_sufficiency",
            "label": "Evidence sufficiency",
            "weight": 0.13,
            "score": evidence_sufficiency,
            "status": _make_status(evidence_sufficiency, 72.0, 48.0),
            "signals": _signal_list(
                f"supporting_chunks={supporting_chunks}",
                f"source_count={source_count}",
                f"redundancy_penalty={round(redundancy_penalty * 100.0, 1)}%",
            ),
            "rationale": "High-confidence answers should be supported by enough non-duplicative evidence, ideally from more than one place.",
            "subscore_inputs": {
                "supporting_chunks": supporting_chunks,
                "evidence_count": evidence_count,
                "source_count": source_count,
                "redundancy_penalty": round(redundancy_penalty, 4),
            },
            "penalties": ["low_source_diversity"] if source_count <= 1 and evidence_count > 1 else [],
            "passed_checks": ["supporting_chunk_count"] if supporting_chunks >= 2 else [],
        },
        {
            "key": "citation_traceability",
            "label": "Citation traceability",
            "weight": 0.12,
            "score": citation_traceability,
            "status": _make_status(citation_traceability, 76.0, 45.0),
            "signals": _signal_list(
                f"citations={citation_count}",
                f"matched_citations={len(matched_citations)}",
                f"match_ratio={round(citation_match_ratio * 100.0, 1)}%",
            ),
            "rationale": "Citations matter only when they point back to retrieved evidence that supports the answer.",
            "subscore_inputs": {
                "citation_count": citation_count,
                "matched_citations": len(matched_citations),
                "citation_match_ratio": round(citation_match_ratio, 4),
            },
            "penalties": ["unmatched_citations"] if citation_count and citation_match_ratio < 1.0 else [],
            "passed_checks": ["citation_presence"] if citation_count else [],
        },
        {
            "key": "claim_support",
            "label": "Claim support",
            "weight": 0.15,
            "score": claim_support,
            "status": _make_status(claim_support, 74.0, 46.0),
            "signals": _signal_list(
                f"claims={len(claims)}",
                f"unsupported_claim_ratio={round(unsupported_claim_ratio * 100.0, 1)}%",
            ),
            "rationale": "Each major claim in the answer should be directly supported by the retrieved evidence, not inferred loosely from context.",
            "subscore_inputs": {
                "claim_count": len(claims),
                "avg_claim_support": round(avg_claim_support, 4),
                "unsupported_claim_ratio": round(unsupported_claim_ratio, 4),
            },
            "penalties": ["unsupported_claims"] if unsupported_claim_ratio > 0.0 else [],
            "passed_checks": ["claim_support_ratio"] if unsupported_claim_ratio <= 0.25 else [],
        },
        {
            "key": "contradiction_risk",
            "label": "Contradiction risk",
            "weight": 0.10,
            "score": contradiction_risk,
            "status": _make_status(contradiction_risk, 85.0, 60.0),
            "signals": contradiction_notes or ["No direct contradiction pattern was detected."],
            "rationale": "The answer should not negate, invert, or numerically contradict the evidence it claims to summarize.",
            "subscore_inputs": {"contradiction_notes": len(contradiction_notes)},
            "penalties": ["contradiction_pattern"] if contradiction_notes else [],
            "passed_checks": ["contradiction_scan"] if not contradiction_notes else [],
        },
        {
            "key": "completeness",
            "label": "Completeness",
            "weight": 0.09,
            "score": completeness,
            "status": _make_status(completeness, 72.0, 45.0),
            "signals": _signal_list(
                f"question_term_coverage={round(question_coverage_ratio * 100.0, 1)}%",
                f"coverage_ratio={round(coverage_ratio * 100.0, 1)}%",
            ),
            "rationale": "A grounded answer should still address the core terms and demands in the user's question.",
            "subscore_inputs": {
                "question_term_coverage": round(question_coverage_ratio, 4),
                "supporting_chunk_ratio": round(coverage_ratio, 4),
            },
            "penalties": ["partial_question_coverage"] if question_coverage_ratio < 0.5 else [],
            "passed_checks": ["question_coverage"] if question_coverage_ratio >= 0.5 else [],
        },
        {
            "key": "honesty_and_abstention",
            "label": "Honesty and abstention",
            "weight": 0.10,
            "score": honesty_and_abstention,
            "status": _make_status(honesty_and_abstention, 90.0, 58.0),
            "signals": _signal_list(
                f"insufficient_evidence={insufficient_evidence}",
                f"answer_length={answer_length}",
            ),
            "rationale": "When support is weak, the model should say so instead of sounding certain.",
            "subscore_inputs": {
                "insufficient_evidence": insufficient_evidence,
                "answer_length": answer_length,
                "unsupported_claim_ratio": round(unsupported_claim_ratio, 4),
            },
            "penalties": ["overclaiming_under_weak_support"] if not insufficient_evidence and avg_retrieval < 0.35 else [],
            "passed_checks": ["abstention_behavior"] if insufficient_evidence or avg_retrieval >= 0.35 else [],
        },
        {
            "key": "answer_discipline",
            "label": "Answer discipline",
            "weight": 0.06,
            "score": answer_discipline,
            "status": _make_status(answer_discipline, 80.0, 56.0),
            "signals": _signal_list(
                f"answer_length={answer_length}",
                f"long_answer={answer_is_long}",
                f"concise={answer_is_concise}",
            ),
            "rationale": "A disciplined answer stays close to what the evidence can support and does not inflate detail.",
            "subscore_inputs": {
                "answer_length": answer_length,
                "long_answer": answer_is_long,
                "unsupported_claim_ratio": round(unsupported_claim_ratio, 4),
            },
            "penalties": ["answer_too_long"] if answer_is_long else [],
            "passed_checks": ["answer_discipline"] if answer_is_concise or answer_length < 900 else [],
        },
        {
            "key": "safety_and_operational_risk",
            "label": "Safety and operational risk",
            "weight": 0.05,
            "score": safety_and_operational_risk,
            "status": _make_status(safety_and_operational_risk, 86.0, 60.0),
            "signals": _signal_list(*risk_flags),
            "rationale": "High-stakes or procedural guidance should be surfaced for human review before action is taken.",
            "subscore_inputs": {"risk_flag_count": len(risk_flags)},
            "penalties": risk_flags,
            "passed_checks": ["safety_screen"] if not risk_flags else [],
        },
        {
            "key": "calibration_and_consistency",
            "label": "Calibration and consistency",
            "weight": 0.04,
            "score": calibration_and_consistency,
            "status": _make_status(calibration_and_consistency, 85.0, 60.0),
            "signals": _signal_list(
                f"unsupported_claim_ratio={round(unsupported_claim_ratio * 100.0, 1)}%",
                f"citation_match_ratio={round(citation_match_ratio * 100.0, 1)}%",
            ),
            "rationale": "The overall score should stay calibrated to retrieval quality, claim support, and the explanation of weaknesses.",
            "subscore_inputs": {
                "unsupported_claim_ratio": round(unsupported_claim_ratio, 4),
                "citation_match_ratio": round(citation_match_ratio, 4),
                "avg_hit_score": round(avg_retrieval, 4),
            },
            "penalties": ["score_overconfidence"] if calibration_and_consistency < 80 else [],
            "passed_checks": ["score_calibration"] if calibration_and_consistency >= 80 else [],
        },
    ]

    overall_score = round(sum(dimension["score"] * dimension["weight"] for dimension in dimensions), 2)
    verdict = _make_verdict(overall_score)

    checks = [
        {
            "key": "evidence_present",
            "label": "Evidence present",
            "status": "pass" if evidence_count else "fail",
            "detail": f"Retrieved {evidence_count} evidence chunk(s) for the answer.",
            "severity": "critical" if not evidence_count else "info",
            "metric_value": evidence_count,
            "threshold": 1,
        },
        {
            "key": "top_hit_strength",
            "label": "Top hit strength",
            "status": _make_status(top_hit_score * 100.0, 70.0, 40.0),
            "detail": f"The strongest retrieved chunk scored {_format_percent(top_hit_score)} against the question.",
            "severity": "warning" if top_hit_score < 0.55 else "info",
            "metric_value": round(top_hit_score, 4),
            "threshold": 0.55,
        },
        {
            "key": "retrieval_distribution",
            "label": "Retrieval distribution",
            "status": "review" if retrieval_distribution > 0.25 else "pass",
            "detail": f"Top-hit decay is {round(retrieval_distribution * 100.0, 1)} points across the retrieved set.",
            "severity": "warning" if retrieval_distribution > 0.25 else "info",
            "metric_value": round(retrieval_distribution, 4),
            "threshold": 0.25,
        },
        {
            "key": "supporting_chunk_count",
            "label": "Supporting chunk count",
            "status": _make_status(float(supporting_chunks), 3.0, 1.0),
            "detail": f"{supporting_chunks} chunk(s) cleared the supporting threshold and {strong_support_chunks} cleared the strong threshold.",
            "severity": "warning" if supporting_chunks < 2 else "info",
            "metric_value": supporting_chunks,
            "threshold": 2,
        },
        {
            "key": "source_diversity",
            "label": "Source diversity",
            "status": "pass" if source_count >= 2 or evidence_count <= 1 else "review",
            "detail": f"The retrieved evidence came from {source_count or 1} distinct source(s).",
            "severity": "warning" if source_count <= 1 and evidence_count > 1 else "info",
            "metric_value": source_count or 1,
            "threshold": 2,
        },
        {
            "key": "citation_presence",
            "label": "Citation presence",
            "status": "pass" if citations else "fail",
            "detail": "The answer cites retrieved chunks." if citations else "The answer does not point back to specific evidence.",
            "severity": "critical" if not citations else "info",
            "metric_value": citation_count,
            "threshold": 1,
        },
        {
            "key": "citation_match",
            "label": "Citation match",
            "status": _make_status(citation_traceability, 75.0, 45.0),
            "detail": (
                f"{len(matched_citations)} of {citation_count} citation(s) matched the retrieved evidence."
                if citation_count
                else "No citations were available for traceability checks."
            ),
            "severity": "warning" if citation_count and citation_match_ratio < 1.0 else "info",
            "metric_value": round(citation_match_ratio, 4),
            "threshold": 0.75,
        },
        {
            "key": "claim_support_ratio",
            "label": "Claim support ratio",
            "status": _make_status(claim_support, 74.0, 46.0),
            "detail": f"{len(claims) - unsupported_claim_count} of {len(claims)} claims were strongly supported by evidence.",
            "severity": "critical" if unsupported_claim_ratio > 0.5 else "warning" if unsupported_claim_ratio > 0.0 else "info",
            "metric_value": round(1.0 - unsupported_claim_ratio, 4),
            "threshold": 0.75,
        },
        {
            "key": "unsupported_claims",
            "label": "Unsupported claims",
            "status": "pass" if unsupported_claim_count == 0 else "review" if unsupported_claim_ratio <= 0.34 else "fail",
            "detail": f"The answer contains {unsupported_claim_count} claim(s) that are only weakly grounded in the current evidence.",
            "severity": "critical" if unsupported_claim_ratio > 0.5 else "warning" if unsupported_claim_count else "info",
            "metric_value": unsupported_claim_count,
            "threshold": 0,
        },
        {
            "key": "contradiction_scan",
            "label": "Contradiction scan",
            "status": "pass" if not contradiction_notes else "review" if contradiction_risk >= 60 else "fail",
            "detail": contradiction_notes[0] if contradiction_notes else "No direct contradiction pattern was detected.",
            "severity": "critical" if contradiction_risk < 60 else "warning" if contradiction_notes else "info",
            "metric_value": round(contradiction_risk, 2),
            "threshold": 60.0,
        },
        {
            "key": "question_coverage",
            "label": "Question coverage",
            "status": _make_status(completeness, 72.0, 45.0),
            "detail": f"The answer covered {round(question_coverage_ratio * 100.0, 1)}% of the question's key content terms.",
            "severity": "warning" if question_coverage_ratio < 0.5 else "info",
            "metric_value": round(question_coverage_ratio, 4),
            "threshold": 0.5,
        },
        {
            "key": "abstention_behavior",
            "label": "Abstention behavior",
            "status": "pass" if insufficient_evidence or avg_retrieval >= 0.35 else "review",
            "detail": "The answer explicitly acknowledged uncertainty." if insufficient_evidence else "The answer did not need an abstention signal.",
            "severity": "warning" if not insufficient_evidence and avg_retrieval < 0.35 else "info",
            "metric_value": int(insufficient_evidence),
            "threshold": 1,
        },
        {
            "key": "answer_discipline",
            "label": "Answer discipline",
            "status": "pass" if answer_length < 900 else "review",
            "detail": f"Answer length is {answer_length} character(s), which {'fits' if answer_length < 900 else 'may be long for the available evidence'}.",
            "severity": "warning" if answer_length >= 900 else "info",
            "metric_value": answer_length,
            "threshold": 900,
        },
        {
            "key": "safety_screen",
            "label": "Safety screen",
            "status": "fail" if "OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW" in risk_flags else ("review" if risk_flags else "pass"),
            "detail": "Operational guidance needs a human review." if "OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW" in risk_flags else "No immediate operational red flag was detected.",
            "severity": "critical" if "OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW" in risk_flags else "warning" if risk_flags else "info",
            "metric_value": len(risk_flags),
            "threshold": 0,
        },
        {
            "key": "score_calibration",
            "label": "Score calibration",
            "status": _make_status(calibration_and_consistency, 85.0, 60.0),
            "detail": "The final score is calibrated against evidence quality, claim support, and citation integrity.",
            "severity": "warning" if calibration_and_consistency < 80 else "info",
            "metric_value": round(calibration_and_consistency, 2),
            "threshold": 80.0,
        },
    ]

    strengths = [
        dimension["label"]
        for dimension in dimensions
        if dimension["score"] >= 80
    ][:4]
    weaknesses = [
        dimension["label"]
        for dimension in dimensions
        if dimension["score"] < 70
    ][:4]
    failure_modes = [check["label"] for check in checks if check["status"] == "fail"][:5]
    recommended_followups = [
        "Read the cited evidence chunks before acting on the answer.",
        "Review unsupported claims and remove any detail that is not explicitly grounded.",
        "Use follow-up queries to close gaps where question coverage or evidence sufficiency is low.",
    ]

    teaching_points = [
        "TrustStack now scores answers with a fixed evaluation standard so the result can be compared across runs and across documents.",
        "The strongest answers combine high retrieval relevance, explicit citation traceability, and direct claim-level support from the evidence.",
        "A lower verdict does not make the answer useless; it means the user should inspect the evidence and the failure modes before relying on it.",
    ]

    next_step = (
        "The answer is presentation-ready for low-risk use, but the cited evidence should still be reviewed before action."
        if verdict == "pass"
        else "Review the score breakdown, inspect unsupported claims, and read the cited evidence before relying on this result."
    )

    framework = {
        "name": FRAMEWORK_NAME,
        "version": FRAMEWORK_VERSION,
        "description": "A weighted, evidence-first evaluation standard for TrustStack answers with claim support, contradiction scanning, and calibration diagnostics.",
        "score_range": "0-100",
        "pass_threshold": PASS_THRESHOLD,
        "review_threshold": REVIEW_THRESHOLD,
        "dimensions": DIMENSION_SPECS,
    }

    diagnostics = {
        "top_hit_score": round(top_hit_score, 4),
        "avg_hit_score": round(avg_retrieval, 4),
        "supporting_chunk_count": supporting_chunks,
        "source_count": source_count or (1 if hits else 0),
        "citation_match_ratio": round(citation_match_ratio, 4),
        "unsupported_claim_ratio": round(unsupported_claim_ratio, 4),
    }

    return {
        "framework": framework,
        "overall_score": overall_score,
        "verdict": verdict,
        "summary": (
            f"TrustStack scored this answer at {overall_score}/100 under {FRAMEWORK_NAME} v{FRAMEWORK_VERSION}, "
            f"placing it in the {verdict.upper()} band."
        ),
        "teaching_points": teaching_points,
        "next_step": next_step,
        "dimensions": dimensions,
        "checks": checks,
        "diagnostics": diagnostics,
        "claims": claims,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "failure_modes": failure_modes,
        "recommended_followups": recommended_followups,
    }
