from __future__ import annotations

import json
from pathlib import Path
from statistics import mean
from typing import Any

from app.config import settings
from app.services.embeddings import get_embedder
from app.services.real_benchmark import run_real_dataset_benchmark
from app.services.synthetic_eval import _deterministic_local_runtime


def _latex_escape(text: Any) -> str:
    value = "" if text is None else str(text)
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
    }
    for source, replacement in replacements.items():
        value = value.replace(source, replacement)
    return value


def _mean(values: list[float]) -> float:
    return round(mean(values), 4) if values else 0.0


def _display_case_id(value: str) -> str:
    if len(value) <= 12:
        return value
    return f"{value[:6]}..{value[-4:]}"


def _pearson(pairs: list[tuple[float, float]]) -> float:
    if len(pairs) < 2:
        return 0.0
    xs = [item[0] for item in pairs]
    ys = [item[1] for item in pairs]
    mean_x = mean(xs)
    mean_y = mean(ys)
    cov = sum((x - mean_x) * (y - mean_y) for x, y in pairs)
    var_x = sum((x - mean_x) ** 2 for x in xs)
    var_y = sum((y - mean_y) ** 2 for y in ys)
    if var_x <= 0 or var_y <= 0:
        return 0.0
    return round(cov / ((var_x ** 0.5) * (var_y ** 0.5)), 4)


def _dataset_metrics(result: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    cases = list(result["cases"])
    datasets = list(result["dataset_runs"])
    metrics_by_dataset: list[dict[str, Any]] = []
    pairwise_scores: list[tuple[float, float]] = []

    for dataset in datasets:
        dataset_cases = [case for case in cases if case["dataset_key"] == dataset["dataset_key"]]
        pairwise_scores.extend((float(case["task_score"]), float(case["truststack_score"]) / 100.0) for case in dataset_cases)
        calibration_gap = _mean([abs(float(case["task_score"]) - float(case["truststack_score"]) / 100.0) for case in dataset_cases])
        verdict_counts = {
            "pass": sum(1 for case in dataset_cases if str(case["verdict"]).lower() == "pass"),
            "review": sum(1 for case in dataset_cases if str(case["verdict"]).lower() == "review"),
            "fail": sum(1 for case in dataset_cases if str(case["verdict"]).lower() == "fail"),
        }
        metrics_by_dataset.append(
            {
                **dataset,
                "calibration_gap": round(calibration_gap, 4),
                "pass_count": verdict_counts["pass"],
                "review_count": verdict_counts["review"],
                "fail_count": verdict_counts["fail"],
            }
        )

    aggregate = {
        "dataset_count": len(metrics_by_dataset),
        "case_count": len(cases),
        "mean_truststack_score": round(mean(float(item["truststack_score"]) for item in metrics_by_dataset), 2),
        "mean_task_metric": round(mean(float(item["task_metric_score"]) for item in metrics_by_dataset), 4),
        "mean_supported_claim_ratio": round(mean(float(item["supported_claim_ratio"]) for item in metrics_by_dataset), 4),
        "mean_citation_alignment_ratio": round(mean(float(item["citation_alignment_ratio"]) for item in metrics_by_dataset), 4),
        "mean_flagged_case_rate": round(mean(float(item["flagged_case_rate"]) for item in metrics_by_dataset), 4),
        "mean_calibration_gap": round(mean(float(item["calibration_gap"]) for item in metrics_by_dataset), 4),
        "task_trust_correlation": _pearson(pairwise_scores),
        "best_dataset": max(metrics_by_dataset, key=lambda item: float(item["truststack_score"])),
        "worst_dataset": min(metrics_by_dataset, key=lambda item: float(item["truststack_score"])),
    }
    return metrics_by_dataset, aggregate


def render_real_benchmark_report_latex(result: dict[str, Any]) -> str:
    dataset_rows, aggregate = _dataset_metrics(result)
    cases = list(result["cases"])

    dataset_table_rows = []
    for item in dataset_rows:
        dataset_table_rows.append(
            " & ".join(
                [
                    _latex_escape(item["dataset_label"]),
                    _latex_escape(item["task_metric_label"]),
                    str(item["example_count"]),
                    f"{float(item['task_metric_score']):.3f}",
                    f"{float(item['truststack_score']):.2f}",
                    f"{float(item['calibration_gap']):.3f}",
                    f"{float(item['supported_claim_ratio']) * 100:.1f}\\%",
                    f"{float(item['citation_alignment_ratio']) * 100:.1f}\\%",
                    f"{float(item['flagged_case_rate']) * 100:.1f}\\%",
                ]
            )
            + r" \\"
        )

    case_rows = []
    for case in cases:
        gold = case["gold_label"] if case["gold_label"] else case["gold_answer"]
        gold_display = (str(gold)[:28] + "...") if gold and len(str(gold)) > 31 else (gold or "--")
        pred_display = (str(case["predicted_answer"])[:28] + "...") if len(str(case["predicted_answer"])) > 31 else str(case["predicted_answer"])
        case_rows.append(
            " & ".join(
                [
                    _latex_escape(case["dataset_label"]),
                    _latex_escape(_display_case_id(case["example_id"])),
                    f"{float(case['task_score']):.3f}",
                    f"{float(case['truststack_score']):.2f}",
                    _latex_escape(str(case["verdict"]).upper()),
                    _latex_escape(gold_display),
                    _latex_escape(pred_display),
                ]
            )
            + r" \\"
        )

    return "\n".join(
        [
            r"\TrustSection{Real Benchmark Evaluation}",
            (
                "To reduce the validity threat of relying on synthetic corpora alone, TrustStack was also evaluated on normalized subsets of public grounded-answer benchmarks. "
                "These subsets are frozen into the repository so the reported results remain reproducible without requiring live network access at paper-compilation time."
            ),
            (
                "The current external benchmark slice covers scientific claim verification and multi-hop question answering. "
                "These tasks pressure complementary properties of TrustStack: whether it can score evidence-backed label judgments on structured claims, and whether it can preserve groundedness under answer synthesis across multiple supporting passages."
            ),
            "",
            r"\begin{table*}[t]",
            r"\centering",
            r"\caption{Real benchmark results on checked-in public dataset subsets.}",
            r"\label{tab:real-benchmark-results}",
            r"\renewcommand{\arraystretch}{1.08}",
            r"\footnotesize",
            r"\begin{tabular}{@{}L{0.11\textwidth}L{0.10\textwidth}C{0.05\textwidth}C{0.08\textwidth}C{0.08\textwidth}C{0.08\textwidth}C{0.09\textwidth}C{0.09\textwidth}C{0.09\textwidth}@{}}",
            r"\hline",
            r"\rowcolor{TrustStackBlue!12}\textbf{Dataset} & \textbf{Metric} & \textbf{N} & \textbf{Task} & \textbf{Trust} & \textbf{Cal Gap} & \textbf{Claim \%} & \textbf{Cite \%} & \textbf{Flagged \%} \\",
            r"\hline",
            *dataset_table_rows,
            r"\hline",
            r"\end{tabular}",
            r"\end{table*}",
            "",
            (
                f"Across {aggregate['dataset_count']} public benchmark subsets and {aggregate['case_count']} total examples, "
                f"TrustStack averaged {aggregate['mean_truststack_score']:.2f}/100 while the task-level benchmark metric averaged {aggregate['mean_task_metric']:.3f}. "
                f"Mean supported-claim ratio reached {aggregate['mean_supported_claim_ratio'] * 100:.1f}\\%, "
                f"mean citation alignment reached {aggregate['mean_citation_alignment_ratio'] * 100:.1f}\\%, "
                f"flagged-case prevalence was {aggregate['mean_flagged_case_rate'] * 100:.1f}\\%, "
                f"and the mean calibration gap between benchmark task success and TrustStack score was {aggregate['mean_calibration_gap']:.3f}. "
                f"The case-level correlation between benchmark success and normalized TrustStack score was {aggregate['task_trust_correlation']:.3f}."
            ),
            "",
            (
                f"The strongest public subset under the current local runtime was {_latex_escape(aggregate['best_dataset']['dataset_label'])} "
                f"at {float(aggregate['best_dataset']['truststack_score']):.2f}/100, while "
                f"{_latex_escape(aggregate['worst_dataset']['dataset_label'])} scored {float(aggregate['worst_dataset']['truststack_score']):.2f}/100. "
                "This result matters because it exposes a real external-validity stress case: TrustStack preserves strong citation alignment on public tasks, "
                "but the current local runtime still shows a weak relationship between task success and final trust score."
            ),
            "",
            r"\begin{table*}[t]",
            r"\centering",
            r"\caption{Case-level real benchmark outcomes used for the paper.}",
            r"\label{tab:real-benchmark-cases}",
            r"\renewcommand{\arraystretch}{1.05}",
            r"\scriptsize",
            r"\begin{tabular}{@{}L{0.10\textwidth}L{0.08\textwidth}C{0.08\textwidth}C{0.08\textwidth}C{0.08\textwidth}L{0.18\textwidth}L{0.20\textwidth}@{}}",
            r"\hline",
            r"\rowcolor{TrustStackBlue!12}\textbf{Dataset} & \textbf{ID} & \textbf{Task} & \textbf{Trust} & \textbf{Verdict} & \textbf{Gold} & \textbf{Predicted} \\",
            r"\hline",
            *case_rows,
            r"\hline",
            r"\end{tabular}",
            r"\end{table*}",
            "",
            (
                "The public benchmark results narrow a major threat to validity in the earlier draft: the system is no longer evaluated only on internally constructed stress packets. "
                "At the same time, these results should still be interpreted as a subset study rather than a final leaderboard claim. "
                "The value of the section is that TrustStack now demonstrates evidence-traceable behavior on external tasks, not that the present local runtime exhausts the performance ceiling of stronger semantic retrieval or larger generation models."
            ),
        ]
    )


def write_real_benchmark_report_artifacts(*, dataset_keys: list[str], sample_limit: int = 5, output_dir: str | Path | None = None) -> dict[str, Path]:
    repo_root = Path(__file__).resolve().parents[3]
    target_dir = Path(output_dir) if output_dir is not None else repo_root / "docs" / "report" / "generated"
    target_dir.mkdir(parents=True, exist_ok=True)

    with _deterministic_local_runtime():
        settings.top_k = 5
        settings.max_context_chunks = 5
        get_embedder.cache_clear()
        result = run_real_dataset_benchmark(dataset_keys=dataset_keys, sample_limit=sample_limit)
    json_path = target_dir / "real_benchmark.json"
    latex_path = target_dir / "real_benchmark_results.tex"
    json_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    latex_path.write_text(render_real_benchmark_report_latex(result), encoding="utf-8")
    return {"json": json_path, "latex": latex_path}
