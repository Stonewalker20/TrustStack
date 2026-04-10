from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class ModelResponse:
    text: str
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvalItem:
    id: str
    prompt: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ScoreResult:
    passed: bool
    score: int
    max_score: int
    reason: str
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvaluationResult:
    provider_id: str
    suite_id: str
    item_id: str
    prompt: str
    response_text: str
    passed: bool
    score: int
    max_score: int
    reason: str
    details: dict[str, Any] = field(default_factory=dict)
    raw_response: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
