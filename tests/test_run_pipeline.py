import json
import tempfile
import unittest
from pathlib import Path

from truststack.config import RunConfig
from truststack.providers import get_provider
from truststack.run import execute_run
from truststack.suites import get_suite


class RegistryTests(unittest.TestCase):
    def test_provider_registry_resolves_known_provider(self) -> None:
        provider = get_provider("mock:safe")
        self.assertEqual(provider.provider_id, "mock:safe")

    def test_suite_registry_resolves_known_suite(self) -> None:
        suite = get_suite("injection")
        self.assertEqual(suite.suite_id, "injection")


class PipelineTests(unittest.TestCase):
    def test_execute_run_writes_json_html_and_dashboard_payload(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            temp_path = Path(tmp_dir)
            dashboard_path = temp_path / "dashboard" / "latest.json"
            config = RunConfig(
                run_name="test_run",
                out_dir=str(temp_path / "runs"),
                dashboard_json_path=str(dashboard_path),
            )

            payload, run_dir = execute_run(config)

            self.assertEqual(payload["summary"]["total"], 10)
            self.assertEqual(payload["summary"]["passed"], 5)
            self.assertTrue((run_dir / "results.json").exists())
            self.assertTrue((run_dir / "report.html").exists())
            self.assertTrue(dashboard_path.exists())

            mirrored = json.loads(dashboard_path.read_text(encoding="utf-8"))
            self.assertEqual(mirrored["run_id"], payload["run_id"])


if __name__ == "__main__":
    unittest.main()
