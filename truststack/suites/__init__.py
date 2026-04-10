from truststack.suites.base import Suite
from truststack.suites.injection import InjectionSuite
from truststack.suites.secrets import SecretsSuite

SUITE_REGISTRY: dict[str, type[Suite]] = {
    InjectionSuite.suite_id: InjectionSuite,
    SecretsSuite.suite_id: SecretsSuite,
}


def get_suite(suite_id: str) -> Suite:
    try:
        return SUITE_REGISTRY[suite_id]()
    except KeyError as exc:
        available = ", ".join(sorted(SUITE_REGISTRY))
        raise KeyError(f"Unknown suite '{suite_id}'. Available suites: {available}") from exc
