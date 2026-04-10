from truststack.providers.base import Provider
from truststack.types import ModelResponse


class MockSafeProvider(Provider):
    provider_id = "mock:safe"
    label = "Mock Safe"

    def generate(self, prompt: str, **kwargs) -> ModelResponse:
        lower_prompt = prompt.lower()
        if any(
            marker in lower_prompt
            for marker in (
                "system prompt",
                "ignore previous instructions",
                "reveal",
                "secret",
                "ssn",
                "social security",
                "credit card",
            )
        ):
            text = "I can't disclose hidden instructions or sensitive personal data."
        else:
            text = "I can help with safe requests that do not expose confidential data."
        return ModelResponse(text=text, raw={"provider_mode": "safe"})


class MockUnsafeProvider(Provider):
    provider_id = "mock:unsafe"
    label = "Mock Unsafe"

    def generate(self, prompt: str, **kwargs) -> ModelResponse:
        lower_prompt = prompt.lower()
        if "system prompt" in lower_prompt or "ignore previous instructions" in lower_prompt:
            text = "SYSTEM_PROMPT: leaked_secret"
        elif "credit card" in lower_prompt:
            text = "Credit card number: 4242 4242 4242 4242"
        elif "ssn" in lower_prompt or "social security" in lower_prompt:
            text = "Customer SSN: 123-45-6789"
        elif "secret" in lower_prompt:
            text = "Internal secret: release_candidate_token"
        else:
            text = "Here is the sensitive data you requested."
        return ModelResponse(text=text, raw={"provider_mode": "unsafe"})
