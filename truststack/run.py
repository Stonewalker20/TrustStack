from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from truststack.config import RunConfig
from truststack.providers import get_provider
from truststack.reporting.render_html import render_report_html
from truststack.suites import get_suite
from truststack.types import EvaluationResult


def load_config(config_path: str | None = None) -> RunConfig:
    if not config_path:
        return RunConfig()

    try:
        import yaml
    except ModuleNotFoundError as exc:
        raise RuntimeError("PyYAML is required to load config files.") from exc

    payload = yaml.safe_load(Path(config_path).read_text(encoding="utf-8")) or {}
    return RunConfig(**payload)


def _build_summary_rows(results: list[dict[str, object]], key: str) -> list[dict[str, object]]:
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for result in results:
        grouped[str(result[key])].append(result)

    summary_rows = []
    for value in sorted(grouped):
        group = grouped[value]
        passed = sum(1 for item in group if item["passed"])
        total = len(group)
        score = sum(int(item["score"]) for item in group)
        max_score = sum(int(item["max_score"]) for item in group)
        summary_rows.append(
            {
                key: value,
                "id": value,
                "name": value,
                "total": total,
                "passed": passed,
                "failed": total - passed,
                "score": score,
                "max_score": max_score,
                "pass_rate": passed / total if total else 0.0,
            }
        )
    return summary_rows


def execute_run(config: RunConfig) -> tuple[dict[str, object], Path]:
    timestamp = datetime.now(timezone.utc)
    run_id = f"{config.run_name}_{timestamp.strftime('%Y%m%dT%H%M%SZ')}"
    run_dir = Path(config.out_dir) / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    results: list[dict[str, object]] = []
    for provider_id in config.models:
        provider = get_provider(provider_id)
        for suite_id in config.suites:
            suite = get_suite(suite_id)
            for item in suite.items():
                response = provider.generate(item.prompt)
                score = suite.score_item(item, response)
                result = EvaluationResult(
                    provider_id=provider.provider_id,
                    suite_id=suite.suite_id,
                    item_id=item.id,
                    prompt=item.prompt,
                    response_text=response.text,
                    passed=score.passed,
                    score=score.score,
                    max_score=score.max_score,
                    reason=score.reason,
                    details=score.details,
                    raw_response=response.raw,
                )
                results.append(result.to_dict())

    total = len(results)
    passed = sum(1 for result in results if result["passed"])
    payload: dict[str, object] = {
        "run_id": run_id,
        "run_name": config.run_name,
        "generated_at": timestamp.isoformat(),
        "config": config.to_dict(),
        "summary": {
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": passed / total if total else 0.0,
        },
        "provider_summaries": _build_summary_rows(results, "provider_id"),
        "suite_summaries": _build_summary_rows(results, "suite_id"),
        "results": results,
    }

    results_path = run_dir / "results.json"
    results_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    report_path = render_report_html(run_dir, payload)

    if config.dashboard_json_path:
        dashboard_path = Path(config.dashboard_json_path)
        dashboard_path.parent.mkdir(parents=True, exist_ok=True)
        dashboard_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"Wrote JSON results to {results_path}")
    print(f"Wrote HTML report to {report_path}")
    if config.dashboard_json_path:
        print(f"Updated dashboard data at {config.dashboard_json_path}")
    return payload, run_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a TrustStack guardrail evaluation.")
    parser.add_argument("--config", help="Optional YAML config path.")
    parser.add_argument("--run-name", help="Override the run name.")
    parser.add_argument("--out-dir", help="Override the output directory.")
    parser.add_argument(
        "--dashboard-json-path",
        help="Optional path to mirror the latest results JSON for the dashboard.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    overrides = {}
    if args.run_name:
        overrides["run_name"] = args.run_name
    if args.out_dir:
        overrides["out_dir"] = args.out_dir
    if args.dashboard_json_path:
        overrides["dashboard_json_path"] = args.dashboard_json_path
    if overrides:
        config = config.with_overrides(**overrides)
    execute_run(config)


if __name__ == "__main__":
    main()
