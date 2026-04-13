from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.real_datasets import HF_LOADERS


def _target_dir() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "benchmarks"


def main() -> None:
    parser = argparse.ArgumentParser(description="Materialize normalized real benchmark subsets into local JSONL files.")
    parser.add_argument("--datasets", nargs="+", default=["scifact", "hotpotqa"], help="Dataset keys to materialize.")
    parser.add_argument("--sample-limit", type=int, default=5, help="Examples per dataset.")
    args = parser.parse_args()

    target_dir = _target_dir()
    target_dir.mkdir(parents=True, exist_ok=True)

    for dataset_key in args.datasets:
        loader = HF_LOADERS.get(dataset_key)
        if loader is None:
            raise SystemExit(f"Unsupported dataset key: {dataset_key}")
        examples = loader(args.sample_limit)
        path = target_dir / f"{dataset_key}.jsonl"
        with path.open("w", encoding="utf-8") as handle:
            for example in examples:
                record = {
                    "example_id": example.example_id,
                    "task_type": example.task_type,
                    "question": example.question,
                    "chunks": example.chunks,
                    "gold_answer": example.gold_answer,
                    "gold_label": example.gold_label,
                    "metadata": example.metadata or {},
                }
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        print(f"Wrote {len(examples)} examples to {path}")


if __name__ == "__main__":
    main()
