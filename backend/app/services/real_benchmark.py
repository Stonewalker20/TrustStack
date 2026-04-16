from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
import re
import tempfile
from statistics import mean
from typing import Any

from app.services.embeddings import get_embedder
from app.services.real_datasets import RealBenchmarkExample, load_real_benchmark_examples
from app.services.rag import _answer_from_hits, retrieve_hits
from app.services.standard_suite import _build_framework
from app.services.vector_store import SimpleVectorStore, sanitize_metadatas


@dataclass(frozen=True)
class RealBenchmarkCaseResult:
    dataset_key: str
    dataset_label: str
    task_type: str
    example_id: str
    question: str
    predicted_answer: str
    gold_answer: str | None
    gold_label: str | None
    task_score: float
    task_metric_label: str
    truststack_score: float
    verdict: str
    supported_claim_ratio: float | None
    citation_alignment_ratio: float | None
    risk_flags: list[str]


def _normalize_text(value: str) -> str:
    normalized = re.sub(r"\b(a|an|the)\b", " ", value.lower())
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    return " ".join(normalized.split())


def _token_f1(predicted: str, gold: str) -> float:
    pred_tokens = _normalize_text(predicted).split()
    gold_tokens = _normalize_text(gold).split()
    if not pred_tokens and not gold_tokens:
        return 1.0
    if not pred_tokens or not gold_tokens:
        return 0.0
    overlap = defaultdict(int)
    for token in gold_tokens:
        overlap[token] += 1
    matches = 0
    for token in pred_tokens:
        if overlap[token] > 0:
            matches += 1
            overlap[token] -= 1
    if matches == 0:
        return 0.0
    precision = matches / len(pred_tokens)
    recall = matches / len(gold_tokens)
    return 2 * precision * recall / (precision + recall)


def _grade_verification_answer(answer: str, gold_label: str | None) -> tuple[float, str]:
    normalized = _normalize_text(answer)
    if "not enough information" in normalized or "insufficient evidence" in normalized:
        predicted = "not_enough_info"
    elif "contradict" in normalized or "refute" in normalized or "false" in normalized:
        predicted = "contradicted"
    elif "support" in normalized or "true" in normalized:
        predicted = "supported"
    else:
        predicted = "unknown"
    return (1.0 if predicted == gold_label else 0.0), predicted


def _build_store_for_example(example: RealBenchmarkExample):
    embedder = get_embedder()
    temp_dir = tempfile.TemporaryDirectory()
    vector_store = SimpleVectorStore(temp_dir.name)
    documents = [chunk["text"] for chunk in example.chunks]
    embeddings = embedder.embed_texts(documents)
    vector_store.upsert(
        ids=[chunk["chunk_uid"] for chunk in example.chunks],
        documents=documents,
        embeddings=embeddings,
        metadatas=sanitize_metadatas([
            {
                "filename": chunk.get("filename", "unknown"),
                "page_num": chunk.get("page_num"),
                "chunk_uid": chunk["chunk_uid"],
            }
            for chunk in example.chunks
        ]),
    )
    return temp_dir, vector_store, embedder


def _format_question(example: RealBenchmarkExample) -> str:
    if example.task_type == "verification":
        return example.question + " Respond with exactly one label: supported, contradicted, or not enough information."
    return example.question + " Answer with the shortest grounded phrase possible. If the evidence is insufficient, answer: not enough information."


def _run_example(example: RealBenchmarkExample) -> RealBenchmarkCaseResult:
    temp_dir, vector_store, embedder = _build_store_for_example(example)
    try:
        question = _format_question(example)
        hits = retrieve_hits(question, vector_store=vector_store, embedder=embedder)
        result = _answer_from_hits(question, hits, 0.0)
    finally:
        temp_dir.cleanup()

    evaluation = result["evaluation"]
    if example.task_type == "verification":
        task_score, predicted_label = _grade_verification_answer(result["answer"], example.gold_label)
        predicted_answer = predicted_label
        metric_label = "label_accuracy"
    else:
        task_score = _token_f1(result["answer"], example.gold_answer or "")
        predicted_answer = result["answer"]
        metric_label = "answer_f1"

    claims = list(evaluation.get("claims", []))
    supported_claims = [claim for claim in claims if claim.get("status") == "supported"]
    supported_claim_ratio = round(len(supported_claims) / len(claims), 4) if claims else 0.0
    citation_ids = set(result["citations"])
    aligned_claims = sum(1 for claim in claims if citation_ids & set(claim.get("supporting_chunk_ids", [])))
    citation_alignment_ratio = round(aligned_claims / len(claims), 4) if claims else 0.0

    return RealBenchmarkCaseResult(
        dataset_key=example.dataset_key,
        dataset_label=example.dataset_label,
        task_type=example.task_type,
        example_id=example.example_id,
        question=question,
        predicted_answer=predicted_answer,
        gold_answer=example.gold_answer,
        gold_label=example.gold_label,
        task_score=round(task_score, 4),
        task_metric_label=metric_label,
        truststack_score=float(evaluation["overall_score"]),
        verdict=evaluation["verdict"],
        supported_claim_ratio=supported_claim_ratio,
        citation_alignment_ratio=citation_alignment_ratio,
        risk_flags=list(result["risk_flags"]),
    )


def run_real_dataset_benchmark(*, dataset_keys: list[str], sample_limit: int = 10) -> dict[str, Any]:
    if not dataset_keys:
        raise ValueError("At least one dataset key is required.")

    all_examples: list[RealBenchmarkExample] = []
    load_errors: list[str] = []
    for dataset_key in dataset_keys:
        try:
            examples = load_real_benchmark_examples(dataset_key, sample_limit=sample_limit)
        except Exception as exc:
            load_errors.append(f"{dataset_key}: {exc}")
            continue
        all_examples.extend(examples)

    if not all_examples:
        detail = "; ".join(load_errors) if load_errors else "No examples were loaded."
        raise ValueError(
            "No real benchmark examples were loaded. Provide normalized dataset files in backend/data/benchmarks/ "
            f"or install/cache supported Hugging Face datasets. Details: {detail}"
        )

    case_results = [_run_example(example) for example in all_examples]
    by_dataset: dict[str, list[RealBenchmarkCaseResult]] = defaultdict(list)
    for case in case_results:
        by_dataset[case.dataset_key].append(case)

    dataset_runs = []
    for dataset_key, cases in by_dataset.items():
        first = cases[0]
        task_metric_label = first.task_metric_label
        task_metric_score = round(mean(case.task_score for case in cases), 4)
        truststack_score = round(mean(case.truststack_score for case in cases), 2)
        verdict = "pass" if truststack_score >= 80 else "review" if truststack_score >= 60 else "fail"
        dataset_runs.append(
            {
                "dataset_key": dataset_key,
                "dataset_label": first.dataset_label,
                "task_type": first.task_type,
                "example_count": len(cases),
                "task_metric_label": task_metric_label,
                "task_metric_score": task_metric_score,
                "truststack_score": truststack_score,
                "supported_claim_ratio": round(mean(case.supported_claim_ratio or 0.0 for case in cases), 4),
                "citation_alignment_ratio": round(mean(case.citation_alignment_ratio or 0.0 for case in cases), 4),
                "flagged_case_rate": round(mean(1.0 if case.risk_flags else 0.0 for case in cases), 4),
                "verdict": verdict,
            }
        )

    dataset_runs.sort(key=lambda item: item["truststack_score"], reverse=True)
    aggregate_task_metric = round(mean(item["task_metric_score"] for item in dataset_runs), 4)
    aggregate_score = round(mean(item["truststack_score"] for item in dataset_runs), 2)
    verdict = "pass" if aggregate_score >= 80 else "review" if aggregate_score >= 60 else "fail"

    recommended_actions = [
        "Compare task-level benchmark accuracy to TrustStack score to identify where groundedness and task success diverge.",
        "Inspect datasets with weak citation alignment before claiming strong evidence traceability on public benchmarks.",
        "Use FEVER and SciFact to pressure contradiction handling, and HotpotQA to pressure multi-hop evidence synthesis.",
    ]
    if load_errors:
        recommended_actions.append("Dataset loading fell back or failed for some sources: " + "; ".join(load_errors))

    return {
        "framework": _build_framework(),
        "generated_at": datetime.now(UTC).isoformat(),
        "dataset_runs": dataset_runs,
        "aggregate_score": aggregate_score,
        "aggregate_task_metric": aggregate_task_metric,
        "verdict": verdict,
        "recommended_actions": recommended_actions,
        "cases": [asdict(case) for case in case_results],
    }
