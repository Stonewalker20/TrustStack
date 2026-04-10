from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.repository import get_repository


class FakeRepository:
    def __init__(self):
        self.documents: list[dict] = []
        self.chunks: list[dict] = []
        self.runs: list[dict] = []
        self.document_counter = 0
        self.run_counter = 0

    def reset(self):
        self.documents.clear()
        self.chunks.clear()
        self.runs.clear()
        self.document_counter = 0
        self.run_counter = 0

    def create_document(self, *, filename: str, file_path: str) -> str:
        self.document_counter += 1
        doc_id = f"doc-{self.document_counter}"
        self.documents.append({"id": doc_id, "filename": filename, "file_path": file_path, "uploaded_at": "2026-04-10T00:00:00+00:00"})
        return doc_id

    def create_chunks(self, *, document_id: str, filename: str, chunks: list[dict]) -> list[dict]:
        rows = []
        for index, chunk in enumerate(chunks):
            row = {
                "document_id": document_id,
                "filename": filename,
                "page_num": chunk["page_num"],
                "chunk_uid": f"doc{document_id}_chunk{index}",
                "text": chunk["text"],
            }
            rows.append(row)
        self.chunks.extend(rows)
        return rows

    def create_run(self, *, question: str, answer: str, confidence_score: float, trust_summary: str, risk_flags: list[str], citations: list[str]) -> str:
        self.run_counter += 1
        run_id = f"run-{self.run_counter}"
        self.runs.append(
            {
                "id": run_id,
                "question": question,
                "answer": answer,
                "confidence_score": confidence_score,
                "trust_summary": trust_summary,
                "risk_flags": risk_flags,
                "citations": citations,
                "created_at": "2026-04-10T00:00:00+00:00",
            }
        )
        return run_id

    def list_documents(self) -> list[dict]:
        return [{"id": row["id"], "filename": row["filename"], "uploaded_at": row["uploaded_at"]} for row in self.documents]

    def list_runs(self, limit: int = 100) -> list[dict]:
        return list(reversed(self.runs))[:limit]

    def list_chunks(self) -> list[dict]:
        return list(self.chunks)


class APITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo = FakeRepository()
        app.dependency_overrides[get_repository] = lambda: cls.repo
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def setUp(self):
        self.repo.reset()

    def test_health_endpoint_reports_ok(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_query_endpoint_returns_detailed_explanation_and_persists_run(self):
        fake_result = {
            "question": "What does the SOP require before startup?",
            "answer": "The SOP requires a documented pre-start safety inspection.",
            "citations": ["doc1_chunk0", "doc1_chunk1"],
            "evidence": [
                {
                    "source": "facility_safety_sop.txt",
                    "page": None,
                    "chunk_id": "doc1_chunk0",
                    "score": 0.91,
                    "text": "Perform a pre-start safety inspection before energizing the equipment.",
                }
            ],
            "confidence_score": 88.4,
            "risk_flags": [],
            "trust_summary": "High confidence. The answer is directly supported by relevant evidence.",
            "insufficient_evidence": False,
            "latency_ms": 18,
            "explanation": {
                "overview": "TrustStack scored this answer at 88.4/100 by combining retrieval strength, citation coverage, and whether the model stayed honest about missing evidence.",
                "teaching_points": [
                    "Confidence rises when retrieval quality is strong, multiple chunks support the same answer, and the model cites those chunks clearly."
                ],
                "review_recommendation": "This result is strong enough for low-risk use, but the user should still read the cited material before acting on it.",
                "score_breakdown": [
                    {
                        "label": "Retrieval strength",
                        "value": 91.0,
                        "detail": "Higher similarity between the question and retrieved chunks usually means the answer is grounded in more relevant evidence.",
                    }
                ],
                "evidence_strength": "Average retrieval support is 91.0% across 1 evidence chunks, with 1 chunk(s) clearing the strong-support threshold.",
                "citation_coverage": "The answer cites 2 chunk(s), which helps the user trace the claim back to the indexed source material.",
                "flagged_concerns": [],
            },
        }

        with patch("app.routers.query.answer_question", return_value=fake_result):
            response = self.client.post("/query", json={"question": "What does the SOP require before startup?", "top_k": 3})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("explanation", payload)
        self.assertIn("score_breakdown", payload["explanation"])
        self.assertGreaterEqual(len(payload["explanation"]["teaching_points"]), 1)
        self.assertEqual(len(self.repo.runs), 1)
        self.assertEqual(self.repo.runs[0]["question"], fake_result["question"])

    def test_query_endpoint_turns_value_errors_into_bad_request(self):
        with patch("app.routers.query.answer_question", side_effect=ValueError("No indexed documents found.")):
            response = self.client.post("/query", json={"question": "Where is the evidence?"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "No indexed documents found.")

    def test_ingest_rejects_unsupported_extensions(self):
        response = self.client.post(
            "/ingest",
            files={"file": ("notes.csv", b"col1,col2\nx,y\n", "text/csv")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file type", response.json()["detail"])

    def test_ingest_indexes_text_file_and_lists_document(self):
        temp_dir = tempfile.TemporaryDirectory()
        temp_upload_dir = Path(temp_dir.name) / "uploads"
        temp_upload_dir.mkdir(parents=True, exist_ok=True)

        fake_embedder = Mock()
        fake_embedder.embed_texts.return_value = [[0.1, 0.2, 0.3]]
        fake_store = Mock()

        with patch("app.routers.ingest.settings.upload_dir", str(temp_upload_dir)), \
             patch("app.routers.ingest.parse_uploaded_file", return_value=[{"page_num": None, "text": "Safety inspection before startup."}]), \
             patch("app.routers.ingest.chunk_pages", return_value=[{"filename": "policy.txt", "page_num": None, "text": "Safety inspection before startup."}]), \
             patch("app.routers.ingest.get_embedder", return_value=fake_embedder), \
             patch("app.routers.ingest.get_vector_store", return_value=fake_store):
            response = self.client.post(
                "/ingest",
                files={"file": ("policy.txt", b"Safety inspection before startup.", "text/plain")},
            )

        temp_dir.cleanup()
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "indexed")
        self.assertEqual(payload["num_chunks"], 1)
        self.assertEqual(len(self.repo.documents), 1)
        self.assertEqual(len(self.repo.chunks), 1)
        fake_store.upsert.assert_called_once()

        documents_response = self.client.get("/documents")
        self.assertEqual(documents_response.status_code, 200)
        self.assertEqual(len(documents_response.json()), 1)

    def test_runs_endpoint_returns_saved_runs(self):
        self.repo.create_run(
            question="What is the maintenance interval?",
            answer="Inspect monthly.",
            confidence_score=72.5,
            trust_summary="Moderate confidence. Relevant evidence was found, but review the support before acting.",
            risk_flags=["LOW_RETRIEVAL_SUPPORT"],
            citations=["doc1_chunk0"],
        )

        response = self.client.get("/runs")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["risk_flags"], ["LOW_RETRIEVAL_SUPPORT"])


if __name__ == "__main__":
    unittest.main()
