from truststack.providers.base import Provider
from truststack.providers.mock import MockSafeProvider, MockUnsafeProvider

PROVIDER_REGISTRY: dict[str, type[Provider]] = {
    MockSafeProvider.provider_id: MockSafeProvider,
    MockUnsafeProvider.provider_id: MockUnsafeProvider,
}


def get_provider(provider_id: str) -> Provider:
    try:
        return PROVIDER_REGISTRY[provider_id]()
    except KeyError as exc:
        available = ", ".join(sorted(PROVIDER_REGISTRY))
        raise KeyError(f"Unknown provider '{provider_id}'. Available providers: {available}") from exc
