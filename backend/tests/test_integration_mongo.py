from __future__ import annotations

import socket
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.repository import MongoRepository, require_repository
from app.services.embeddings import LexicalEmbedder
from app.services.vector_store import SimpleVectorStore


class MongoIntegrationAPITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            with socket.create_connection(("127.0.0.1", 27018), timeout=1.0):
                pass
        except OSError as exc:  # pragma: no cover - environment-dependent
            raise unittest.SkipTest("Mongo integration test skipped: MongoDB is unavailable at mongodb://127.0.0.1:27018. Start MongoDB or update MONGO_URI.") from exc
        repo = None
        try:
            repo = MongoRepository("mongodb://127.0.0.1:27018", f"truststack_integration_{uuid.uuid4().hex}")
            repo.ping()
            cls.repo = repo
        except Exception as exc:  # pragma: no cover - environment-dependent
            if repo is not None:
                repo.client.close()
            raise unittest.SkipTest(f"Mongo integration test skipped: {exc}") from exc
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        try:
            cls.repo.client.drop_database(cls.repo.db.name)
        finally:
            app.dependency_overrides.pop(require_repository, None)

    def setUp(self):
        self.repo.client.drop_database(self.repo.db.name)
        self.temp_dir = tempfile.TemporaryDirectory()
        self.vector_store = SimpleVectorStore(self.temp_dir.name)
        self.embedder = LexicalEmbedder()
        app.dependency_overrides[require_repository] = lambda: self.repo

    def tearDown(self):
        app.dependency_overrides.pop(require_repository, None)
        self.temp_dir.cleanup()

    def test_real_mongo_end_to_end_ingest_query_and_history(self):
        upload_dir = Path(self.temp_dir.name) / "uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)

        evidence_text = (
            "Operators must complete a documented startup inspection before energizing the system. "
            "Any hazard discovered during the inspection must be logged and reviewed by a supervisor before restart. "
            "Maintenance records must be attached to the inspection packet after corrective work."
        )

        with patch("app.routers.ingest.settings.upload_dir", str(upload_dir)), \
             patch("app.routers.ingest.get_embedder", return_value=self.embedder), \
             patch("app.routers.ingest.get_vector_store", return_value=self.vector_store), \
             patch("app.services.rag.get_repository", return_value=self.repo), \
             patch("app.services.rag.get_embedder", return_value=self.embedder), \
             patch("app.services.rag.get_vector_store", return_value=self.vector_store), \
             patch("app.services.llm.settings.llm_provider", "disabled"):
            ingest_response = self.client.post(
                "/ingest",
                files={"file": ("facility_safety_sop.txt", evidence_text.encode("utf-8"), "text/plain")},
            )
            self.assertEqual(ingest_response.status_code, 200, ingest_response.text)

            documents_response = self.client.get("/documents")
            self.assertEqual(documents_response.status_code, 200, documents_response.text)
            documents_payload = documents_response.json()
            self.assertEqual(len(documents_payload), 1)
            self.assertEqual(documents_payload[0]["filename"], "facility_safety_sop.txt")

            prompts_response = self.client.get("/documents/sample-questions")
            self.assertEqual(prompts_response.status_code, 200, prompts_response.text)
            prompts_payload = prompts_response.json()
            self.assertGreaterEqual(len(prompts_payload), 1)
            self.assertEqual(prompts_payload[0]["source"], "facility_safety_sop.txt")

            query_response = self.client.post(
                "/query",
                json={"question": "What inspection is required before startup?", "top_k": 3},
            )
            self.assertEqual(query_response.status_code, 200, query_response.text)
            query_payload = query_response.json()
            self.assertEqual(query_payload["question"], "What inspection is required before startup?")
            self.assertGreaterEqual(len(query_payload["evidence"]), 1)
            self.assertGreaterEqual(len(query_payload["citations"]), 1)
            self.assertIn("evaluation", query_payload)
            self.assertIn("explanation", query_payload)
            self.assertIn("inspection", query_payload["answer"].lower())
            self.assertIn(query_payload["evaluation"]["verdict"], {"pass", "review", "fail"})

            suite_response = self.client.post("/evaluation/standard-run")
            self.assertEqual(suite_response.status_code, 200, suite_response.text)
            suite_payload = suite_response.json()
            self.assertIn("final_score", suite_payload)
            self.assertGreaterEqual(len(suite_payload["score_breakdown"]), 1)
            self.assertGreaterEqual(len(suite_payload["cases"]), 1)
            self.assertIn("metadata", suite_payload)

            report_response = self.client.post("/evaluation/standard-run/report-artifacts")
            self.assertEqual(report_response.status_code, 200, report_response.text)
            report_payload = report_response.json()
            self.assertIn("executive_summary", report_payload)
            self.assertIn("latex_category_table", report_payload)
            self.assertIn("appendix_markdown", report_payload)

            batch_response = self.client.post("/evaluation/standard-run/batch")
            self.assertEqual(batch_response.status_code, 200, batch_response.text)
            batch_payload = batch_response.json()
            self.assertGreaterEqual(len(batch_payload["dataset_runs"]), 1)
            self.assertIn("aggregate_score", batch_payload)

            runs_response = self.client.get("/runs")
            self.assertEqual(runs_response.status_code, 200, runs_response.text)
            runs_payload = runs_response.json()
            self.assertEqual(len(runs_payload), 1)
            self.assertEqual(runs_payload[0]["question"], "What inspection is required before startup?")


if __name__ == "__main__":
    unittest.main()
