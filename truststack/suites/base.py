from truststack.types import EvalItem, ModelResponse, ScoreResult


class Suite:
    suite_id = "suite:base"
    title = "Base Suite"
    description = "Abstract evaluation suite."

    def items(self) -> list[EvalItem]:
        raise NotImplementedError

    def score_item(self, item: EvalItem, resp: ModelResponse) -> ScoreResult:
        raise NotImplementedError
