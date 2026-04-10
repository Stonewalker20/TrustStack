from __future__ import annotations

from dataclasses import asdict, dataclass, field


@dataclass
class RunConfig:
    run_name: str = "truststack_local"
    models: list[str] = field(default_factory=lambda: ["mock:safe", "mock:unsafe"])
    suites: list[str] = field(default_factory=lambda: ["injection", "secrets"])
    out_dir: str = "runs"
    dashboard_json_path: str | None = "dashboard/public/data/latest.json"

    def to_dict(self) -> dict[str, object]:
        return asdict(self)

    def with_overrides(self, **overrides: object) -> "RunConfig":
        payload = self.to_dict()
        payload.update({key: value for key, value in overrides.items() if value is not None})
        return RunConfig(**payload)
