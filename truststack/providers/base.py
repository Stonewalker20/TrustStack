from truststack.types import ModelResponse


class Provider:
    provider_id = "provider:base"
    label = "Base Provider"

    def generate(self, prompt: str, **kwargs) -> ModelResponse:
        raise NotImplementedError
