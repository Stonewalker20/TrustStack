from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class RealBenchmarkExample:
    dataset_key: str
    dataset_label: str
    task_type: str
    example_id: str
    question: str
    chunks: list[dict[str, Any]]
    gold_answer: str | None = None
    gold_label: str | None = None
    metadata: dict[str, Any] | None = None


DATASET_LABELS = {
    "fever": "FEVER",
    "scifact": "SciFact",
    "hotpotqa": "HotpotQA",
}


def _benchmarks_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "benchmarks"


def _normalized_path(dataset_key: str) -> Path:
    return _benchmarks_dir() / f"{dataset_key}.jsonl"


def _normalize_chunks(dataset_key: str, example_id: str, raw_chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for index, item in enumerate(raw_chunks):
        chunks.append(
            {
                "document_id": item.get("document_id", f"{dataset_key}-{example_id}-doc"),
                "filename": item.get("filename", f"{dataset_key}_{example_id}.txt"),
                "page_num": item.get("page_num"),
                "chunk_uid": item.get("chunk_uid", f"{dataset_key}-{example_id}-chunk-{index}"),
                "text": item["text"],
            }
        )
    return chunks


def _parse_normalized_record(dataset_key: str, record: dict[str, Any]) -> RealBenchmarkExample:
    example_id = str(record["example_id"])
    task_type = str(record["task_type"])
    return RealBenchmarkExample(
        dataset_key=dataset_key,
        dataset_label=DATASET_LABELS.get(dataset_key, dataset_key.upper()),
        task_type=task_type,
        example_id=example_id,
        question=str(record["question"]),
        chunks=_normalize_chunks(dataset_key, example_id, list(record["chunks"])),
        gold_answer=record.get("gold_answer"),
        gold_label=record.get("gold_label"),
        metadata=dict(record.get("metadata", {})),
    )


def load_local_real_dataset(dataset_key: str, *, sample_limit: int) -> list[RealBenchmarkExample]:
    path = _normalized_path(dataset_key)
    if not path.exists():
        return []

    examples: list[RealBenchmarkExample] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            examples.append(_parse_normalized_record(dataset_key, json.loads(line)))
            if len(examples) >= sample_limit:
                break
    return examples


def _load_hf_datasets_module():
    try:
        from datasets import load_dataset  # type: ignore
    except ImportError as exc:  # pragma: no cover - exercised through caller fallback
        raise RuntimeError(
            "The optional 'datasets' package is not installed. Install backend/requirements-optional.txt and cache the dataset, "
            "or place normalized JSONL files in backend/data/benchmarks/."
        ) from exc
    return load_dataset


def _fever_examples(sample_limit: int) -> list[RealBenchmarkExample]:
    load_dataset = _load_hf_datasets_module()
    split = load_dataset("fever", "v1.0", split="labelled_dev[:{}]".format(sample_limit))
    examples: list[RealBenchmarkExample] = []
    for row in split:
        evidence_texts = []
        for evidence_group in row.get("evidence", []) or []:
            for evidence_item in evidence_group or []:
                if len(evidence_item) >= 3:
                    page = evidence_item[2]
                    sentence_id = evidence_item[3] if len(evidence_item) > 3 else None
                    evidence_texts.append(
                        {
                            "filename": f"{page}.txt",
                            "page_num": sentence_id if isinstance(sentence_id, int) else None,
                            "text": f"Evidence page {page}, sentence {sentence_id}: {page}",
                        }
                    )
        if not evidence_texts:
            continue
        label_map = {"SUPPORTS": "supported", "REFUTES": "contradicted", "NOT ENOUGH INFO": "not_enough_info"}
        examples.append(
            RealBenchmarkExample(
                dataset_key="fever",
                dataset_label="FEVER",
                task_type="verification",
                example_id=str(row["id"]),
                question=f"Claim: {row['claim']}. Based only on the evidence, is this claim supported, contradicted, or not enough information?",
                chunks=_normalize_chunks("fever", str(row["id"]), evidence_texts),
                gold_label=label_map.get(str(row.get("label", "")).upper(), "not_enough_info"),
                metadata={"source": "huggingface:fever"},
            )
        )
    return examples


def _scifact_examples(sample_limit: int) -> list[RealBenchmarkExample]:
    load_dataset = _load_hf_datasets_module()
    split = load_dataset("allenai/scifact", split="validation[:{}]".format(sample_limit))
    examples: list[RealBenchmarkExample] = []
    for row in split:
        abstracts = row.get("evidence_abstracts") or row.get("abstract") or []
        if isinstance(abstracts, str):
            abstracts = [abstracts]
        chunks = [
            {
                "filename": f"scifact_{row['id']}.txt",
                "page_num": index + 1,
                "text": abstract,
            }
            for index, abstract in enumerate(abstracts)
            if abstract
        ]
        if not chunks:
            continue
        label_map = {"SUPPORT": "supported", "CONTRADICT": "contradicted", "NOT_ENOUGH_INFO": "not_enough_info"}
        examples.append(
            RealBenchmarkExample(
                dataset_key="scifact",
                dataset_label="SciFact",
                task_type="verification",
                example_id=str(row["id"]),
                question=f"Claim: {row['claim']}. Based only on the evidence, is this claim supported, contradicted, or not enough information?",
                chunks=_normalize_chunks("scifact", str(row["id"]), chunks),
                gold_label=label_map.get(str(row.get("label", "")).upper(), "not_enough_info"),
                metadata={"source": "huggingface:allenai/scifact"},
            )
        )
    return examples


def _hotpotqa_examples(sample_limit: int) -> list[RealBenchmarkExample]:
    load_dataset = _load_hf_datasets_module()
    split = load_dataset("hotpot_qa", "distractor", split="validation[:{}]".format(sample_limit))
    examples: list[RealBenchmarkExample] = []
    for row in split:
        contexts = row.get("context", {})
        titles = contexts.get("title", []) if isinstance(contexts, dict) else []
        sentences = contexts.get("sentences", []) if isinstance(contexts, dict) else []
        chunks = []
        for title, sentence_list in zip(titles, sentences):
            text = " ".join(sentence_list)
            if text:
                chunks.append({"filename": f"{title}.txt", "text": text, "page_num": None})
        if not chunks:
            continue
        examples.append(
            RealBenchmarkExample(
                dataset_key="hotpotqa",
                dataset_label="HotpotQA",
                task_type="qa",
                example_id=str(row["_id"]),
                question=str(row["question"]),
                chunks=_normalize_chunks("hotpotqa", str(row["_id"]), chunks),
                gold_answer=str(row.get("answer", "")),
                metadata={"source": "huggingface:hotpot_qa"},
            )
        )
    return examples


HF_LOADERS = {
    "fever": _fever_examples,
    "scifact": _scifact_examples,
    "hotpotqa": _hotpotqa_examples,
}


def load_real_benchmark_examples(dataset_key: str, *, sample_limit: int = 10) -> list[RealBenchmarkExample]:
    local_examples = load_local_real_dataset(dataset_key, sample_limit=sample_limit)
    if local_examples:
        return local_examples

    loader = HF_LOADERS.get(dataset_key)
    if loader is None:
        raise ValueError(f"Unsupported real benchmark dataset: {dataset_key}")
    return loader(sample_limit)
