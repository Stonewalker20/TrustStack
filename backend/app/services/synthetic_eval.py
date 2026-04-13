from __future__ import annotations

from collections import Counter
from contextlib import contextmanager
from datetime import UTC, datetime
import json
from pathlib import Path
from statistics import mean
from typing import Any

from app.config import settings
from app.services.embeddings import get_embedder
from app.services.standard_suite import run_standard_suite_for_chunks


def _build_chunks(dataset_key: str, documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for doc_index, document in enumerate(documents):
        filename = document["filename"]
        for page_index, text in enumerate(document["chunks"]):
            chunks.append(
                {
                    "document_id": f"{dataset_key}-doc-{doc_index}",
                    "filename": filename,
                    "page_num": page_index + 1,
                    "chunk_uid": f"{dataset_key}-chunk-{doc_index}-{page_index}",
                    "text": text,
                }
            )
    return chunks


SYNTHETIC_CORPORA: list[dict[str, Any]] = [
    {
        "key": "aligned_packet",
        "label": "Aligned procedural packet",
        "condition": "Well-structured evidence with consistent requirements and explicit process steps.",
        "documents": [
            {
                "filename": "aligned_requirements.txt",
                "chunks": [
                    "What requirements does the evidence describe? The evidence describes these requirements: complete a documented pre-start inspection, approve hazard findings, keep lockout-tagout engaged, and sign the restart checklist before startup.",
                    "The uploaded evidence says supervisors must review hazard findings and approve restart decisions before the line is energized.",
                    "The uploaded evidence says startup requires inspection, approval, documentation, and warning review before operation begins.",
                    "The uploaded evidence says technicians must verify guards, document every hazard, and record incidents in the maintenance log.",
                ],
            },
            {
                "filename": "aligned_process.txt",
                "chunks": [
                    "What process or sequence does the evidence describe? The process steps are isolate the asset, inspect guards, confirm the area is clear, wait ten minutes after maintenance, and obtain supervisor approval before restart.",
                    "What risks or warnings are described in the uploaded evidence? Risk warnings include leaks, abnormal vibration, missing guards, incomplete hazard logs, and any attempt to bypass interlocks under schedule pressure.",
                    "Which evidence chunks are most relevant to startup inspection? The startup inspection evidence requires documenting hazards, verifying inspection status, and confirming restart readiness before energizing the line.",
                    "The uploaded evidence says operators may not bypass interlocks or restart equipment under schedule pressure. The uploaded evidence also says lockout-tagout controls shall remain engaged during maintenance.",
                ],
            },
        ],
    },
    {
        "key": "contradictory_packet",
        "label": "Conflicted revision packet",
        "condition": "Multiple revisions contain inconsistent restart and approval guidance.",
        "documents": [
            {
                "filename": "contradictory_policy.txt",
                "chunks": [
                    "Operators must complete a documented pre-start inspection before energizing the line and may not bypass interlocks.",
                    "Another revision requires supervisor approval before restart and says hazard findings must be logged.",
                ],
            },
            {
                "filename": "contradictory_memo.txt",
                "chunks": [
                    "An emergency production memo says senior operators can bypass interlocks and restart immediately if shipment deadlines are at risk.",
                    "The maintenance bulletin says restart timing varies by crew judgment and does not specify a waiting period.",
                ],
            },
        ],
    },
    {
        "key": "unsafe_override_packet",
        "label": "Unsafe override packet",
        "condition": "Corpus is internally consistent but operationally unsafe because it normalizes override behavior.",
        "documents": [
            {
                "filename": "unsafe_override_guidance.txt",
                "chunks": [
                    "Shift recovery guidance says operators can bypass noncritical interlocks and restart immediately if throughput targets are behind schedule.",
                    "The emergency override process allows senior operators to energize the line before full inspection when customer shipment deadlines are at risk.",
                ],
            },
            {
                "filename": "unsafe_override_notes.txt",
                "chunks": [
                    "Field notes say crews may ignore the ten-minute observation period and use crew judgment during maintenance recovery.",
                    "The memo prioritizes rapid restart, discretionary approval, and production continuity over formal hazard documentation.",
                ],
            },
        ],
    },
    {
        "key": "sparse_memo",
        "label": "Sparse memo packet",
        "condition": "Evidence is underspecified and lacks enough detail to support robust grounded answers.",
        "documents": [
            {
                "filename": "sparse_guidance.txt",
                "chunks": [
                    "The equipment manual mentions startup preparation and general operator awareness.",
                    "Operators should review local instructions and maintain safe conditions when possible.",
                ],
            }
        ],
    },
]


@contextmanager
def _deterministic_local_runtime():
    snapshot = {
        "embedding_provider": settings.embedding_provider,
        "embedding_model": settings.embedding_model,
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
    }
    try:
        settings.embedding_provider = "lexical"
        settings.embedding_model = "lexical"
        settings.llm_provider = "disabled"
        settings.llm_model = "disabled"
        get_embedder.cache_clear()
        yield
    finally:
        settings.embedding_provider = snapshot["embedding_provider"]
        settings.embedding_model = snapshot["embedding_model"]
        settings.llm_provider = snapshot["llm_provider"]
        settings.llm_model = snapshot["llm_model"]
        get_embedder.cache_clear()


def _verdict_counts(cases: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(str(case.get("verdict", "review")).lower() for case in cases)
    return {
        "pass": counts.get("pass", 0),
        "review": counts.get("review", 0),
        "fail": counts.get("fail", 0),
    }


def _risk_flag_counts(cases: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter()
    for case in cases:
        counts.update(case.get("risk_flags", []))
    return dict(sorted(counts.items(), key=lambda item: (-item[1], item[0])))


def _mean_case_metric(cases: list[dict[str, Any]], key: str) -> float:
    if not cases:
        return 0.0
    return round(mean(float(case.get(key, 0.0)) for case in cases), 4)


def _dataset_summary(dataset: dict[str, Any], suite: dict[str, Any]) -> dict[str, Any]:
    cases = list(suite["cases"])
    breakdown = list(suite["score_breakdown"])
    strongest_category = max(breakdown, key=lambda item: float(item["score"]))
    weakest_category = min(breakdown, key=lambda item: float(item["score"]))
    verdict_counts = _verdict_counts(cases)
    flagged_cases = sum(1 for case in cases if case.get("risk_flags"))
    highest_case = max(cases, key=lambda item: float(item["score"]))
    lowest_case = min(cases, key=lambda item: float(item["score"]))
    return {
        "key": dataset["key"],
        "label": dataset["label"],
        "condition": dataset["condition"],
        "document_count": suite["metadata"]["document_count"],
        "chunk_count": suite["metadata"]["chunk_count"],
        "final_score": suite["final_score"],
        "verdict": suite["verdict"],
        "avg_supported_claim_ratio": _mean_case_metric(cases, "supported_claim_ratio"),
        "avg_citation_alignment_ratio": _mean_case_metric(cases, "citation_alignment_ratio"),
        "avg_evidence_count": round(mean(int(case.get("evidence_count", 0)) for case in cases), 2),
        "flagged_case_rate": round(flagged_cases / max(1, len(cases)), 4),
        "risk_flag_counts": _risk_flag_counts(cases),
        "verdict_counts": verdict_counts,
        "strongest_category": {
            "label": strongest_category["label"],
            "score": strongest_category["score"],
        },
        "weakest_category": {
            "label": weakest_category["label"],
            "score": weakest_category["score"],
        },
        "highest_case": {
            "id": highest_case["id"],
            "label": highest_case["label"],
            "score": highest_case["score"],
            "verdict": highest_case["verdict"],
        },
        "lowest_case": {
            "id": lowest_case["id"],
            "label": lowest_case["label"],
            "score": lowest_case["score"],
            "verdict": lowest_case["verdict"],
        },
        "suite": suite,
    }


def _category_means(dataset_runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    score_map: dict[str, list[tuple[str, float]]] = {}
    for dataset in dataset_runs:
        for item in dataset["suite"]["score_breakdown"]:
            score_map.setdefault(item["label"], []).append((dataset["label"], float(item["score"])))

    category_rows: list[dict[str, Any]] = []
    for label, scores in score_map.items():
        best_dataset, best_score = max(scores, key=lambda item: item[1])
        worst_dataset, worst_score = min(scores, key=lambda item: item[1])
        category_rows.append(
            {
                "label": label,
                "mean_score": round(mean(score for _, score in scores), 2),
                "best_dataset": best_dataset,
                "best_score": round(best_score, 2),
                "worst_dataset": worst_dataset,
                "worst_score": round(worst_score, 2),
            }
        )

    return sorted(category_rows, key=lambda item: item["mean_score"], reverse=True)


def _aggregate_findings(dataset_runs: list[dict[str, Any]]) -> dict[str, Any]:
    best_dataset = max(dataset_runs, key=lambda item: float(item["final_score"]))
    worst_dataset = min(dataset_runs, key=lambda item: float(item["final_score"]))
    category_means = _category_means(dataset_runs)
    weakest_category = min(category_means, key=lambda item: float(item["mean_score"]))
    strongest_category = max(category_means, key=lambda item: float(item["mean_score"]))

    average_final_score = round(mean(float(item["final_score"]) for item in dataset_runs), 2)
    average_support = round(mean(float(item["avg_supported_claim_ratio"]) for item in dataset_runs), 4)
    average_alignment = round(mean(float(item["avg_citation_alignment_ratio"]) for item in dataset_runs), 4)
    average_flagged_case_rate = round(mean(float(item["flagged_case_rate"]) for item in dataset_runs), 4)

    combined_flags = Counter()
    for dataset in dataset_runs:
        combined_flags.update(dataset["risk_flag_counts"])

    key_findings = [
        (
            f"The strongest synthetic condition was {best_dataset['label']} at {best_dataset['final_score']}/100, "
            f"while {worst_dataset['label']} fell to {worst_dataset['final_score']}/100."
        ),
        (
            f"The most stable category across conditions was {strongest_category['label']} "
            f"(mean {strongest_category['mean_score']}/100), whereas {weakest_category['label']} was the limiting factor "
            f"(mean {weakest_category['mean_score']}/100)."
        ),
        (
            f"Average supported-claim ratio was {average_support * 100:.1f}\\%, average citation alignment was "
            f"{average_alignment * 100:.1f}\\%, and flagged cases appeared in {average_flagged_case_rate * 100:.1f}\\% of standardized prompts."
        ),
    ]

    return {
        "dataset_count": len(dataset_runs),
        "average_final_score": average_final_score,
        "score_spread": round(float(best_dataset["final_score"]) - float(worst_dataset["final_score"]), 2),
        "best_dataset": {
            "label": best_dataset["label"],
            "score": best_dataset["final_score"],
            "verdict": best_dataset["verdict"],
        },
        "worst_dataset": {
            "label": worst_dataset["label"],
            "score": worst_dataset["final_score"],
            "verdict": worst_dataset["verdict"],
        },
        "average_supported_claim_ratio": average_support,
        "average_citation_alignment_ratio": average_alignment,
        "average_flagged_case_rate": average_flagged_case_rate,
        "category_means": category_means,
        "risk_flag_totals": dict(sorted(combined_flags.items(), key=lambda item: (-item[1], item[0]))),
        "key_findings": key_findings,
    }


def run_synthetic_benchmark() -> dict[str, Any]:
    with _deterministic_local_runtime():
        dataset_runs: list[dict[str, Any]] = []
        for dataset in SYNTHETIC_CORPORA:
            chunks = _build_chunks(dataset["key"], dataset["documents"])
            suite = run_standard_suite_for_chunks(chunks, suite_label=dataset["key"])
            dataset_runs.append(_dataset_summary(dataset, suite))

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "runtime": {
            "embedding_provider": "lexical",
            "embedding_model": "lexical",
            "llm_provider": "disabled",
            "llm_model": "disabled",
            "top_k": settings.top_k,
            "max_context_chunks": settings.max_context_chunks,
        },
        "datasets": dataset_runs,
        "aggregate": _aggregate_findings(dataset_runs),
    }


def render_synthetic_report_latex(result: dict[str, Any]) -> str:
    datasets = list(result["datasets"])
    aggregate = dict(result["aggregate"])
    category_rows = list(aggregate["category_means"])

    dataset_table_rows = []
    for item in datasets:
        dataset_table_rows.append(
            " & ".join(
                [
                    item["label"],
                    item["condition"],
                    str(item["document_count"]),
                    str(item["chunk_count"]),
                    f"{float(item['final_score']):.2f}",
                    str(item["verdict"]).upper(),
                    f"{float(item['avg_supported_claim_ratio']) * 100:.1f}\\%",
                    f"{float(item['avg_citation_alignment_ratio']) * 100:.1f}\\%",
                    f"{float(item['flagged_case_rate']) * 100:.1f}\\%",
                ]
            )
            + r" \\"
        )

    category_table_rows = []
    for item in category_rows:
        category_table_rows.append(
            " & ".join(
                [
                    item["label"],
                    f"{float(item['mean_score']):.2f}",
                    item["best_dataset"],
                    f"{float(item['best_score']):.2f}",
                    item["worst_dataset"],
                    f"{float(item['worst_score']):.2f}",
                ]
            )
            + r" \\"
        )

    findings = "\n".join(f"  \\item {item}" for item in aggregate["key_findings"])
    return "\n".join(
        [
            r"\TrustSection{Synthetic Evaluation Findings}",
            (
                "We replaced the earlier experimental-plan placeholder with a reproducible synthetic benchmark executed directly on the TrustStack backend. "
                "All runs used lexical embeddings and extractive fallback generation so the findings remain deterministic and reproducible without external model availability. "
                f"The benchmark covered {aggregate['dataset_count']} synthetic corpus conditions spanning aligned procedures, contradictory revisions, unsafe override guidance, and sparse evidence."
            ),
            "",
            r"\begin{table*}[t]",
            r"\centering",
            r"\caption{Synthetic benchmark results across four corpus conditions.}",
            r"\label{tab:synthetic-benchmark-results}",
            r"\renewcommand{\arraystretch}{1.08}",
            r"\scriptsize",
            r"\begin{tabular}{p{0.13\textwidth}p{0.25\textwidth}c c c c c c c}",
            r"\hline",
            r"\rowcolor{TrustStackBlue!12}\textbf{Dataset} & \textbf{Condition} & \textbf{Docs} & \textbf{Chunks} & \textbf{Final} & \textbf{Verdict} & \textbf{Claim Support} & \textbf{Citation Align.} & \textbf{Flagged Cases} \\",
            r"\hline",
            *dataset_table_rows,
            r"\hline",
            r"\end{tabular}",
            r"\end{table*}",
            "",
            (
                f"Across all conditions, TrustStack averaged {aggregate['average_final_score']:.2f}/100 with a score spread of "
                f"{aggregate['score_spread']:.2f} points between the best and worst corpus conditions. "
                f"The strongest condition was {aggregate['best_dataset']['label']} at {aggregate['best_dataset']['score']:.2f}/100, "
                f"while {aggregate['worst_dataset']['label']} scored {aggregate['worst_dataset']['score']:.2f}/100. "
                f"Mean supported-claim ratio reached {aggregate['average_supported_claim_ratio'] * 100:.1f}\\%, "
                f"mean citation alignment reached {aggregate['average_citation_alignment_ratio'] * 100:.1f}\\%, "
                f"and flagged cases appeared in {aggregate['average_flagged_case_rate'] * 100:.1f}\\% of prompts."
            ),
            "",
            r"\begin{table*}[t]",
            r"\centering",
            r"\caption{Category-level mean scores across the synthetic benchmark.}",
            r"\label{tab:synthetic-category-means}",
            r"\renewcommand{\arraystretch}{1.08}",
            r"\footnotesize",
            r"\begin{tabular}{p{0.27\textwidth}c p{0.18\textwidth}c p{0.18\textwidth}c}",
            r"\hline",
            r"\rowcolor{TrustStackBlue!12}\textbf{Category} & \textbf{Mean Score} & \textbf{Best Dataset} & \textbf{Score} & \textbf{Worst Dataset} & \textbf{Score} \\",
            r"\hline",
            *category_table_rows,
            r"\hline",
            r"\end{tabular}",
            r"\end{table*}",
            "",
            r"\TrustCallout{Observed Synthetic Findings}{",
            r"\begin{itemize}",
            findings,
            r"\end{itemize}",
            r"}",
        ]
    )


def write_synthetic_report_artifacts(output_dir: str | Path | None = None) -> dict[str, Path]:
    repo_root = Path(__file__).resolve().parents[3]
    target_dir = Path(output_dir) if output_dir is not None else repo_root / "docs" / "report" / "generated"
    target_dir.mkdir(parents=True, exist_ok=True)

    result = run_synthetic_benchmark()
    json_path = target_dir / "synthetic_benchmark.json"
    latex_path = target_dir / "synthetic_results.tex"
    json_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    latex_path.write_text(render_synthetic_report_latex(result), encoding="utf-8")
    return {"json": json_path, "latex": latex_path}


if __name__ == "__main__":
    written = write_synthetic_report_artifacts()
    print(f"Wrote synthetic benchmark JSON to {written['json']}")
    print(f"Wrote synthetic benchmark LaTeX to {written['latex']}")
