from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.repository import require_repository
from app.services.evaluation import build_evaluation_report


class FakeRepository:
    def __init__(self):
        self.documents: list[dict] = []
        self.chunks: list[dict] = []
        self.runs: list[dict] = []
        self.document_counter = 0
        self.run_counter = 0
        self.fail_on_create_run = False

    def reset(self):
        self.documents.clear()
        self.chunks.clear()
        self.runs.clear()
        self.document_counter = 0
        self.run_counter = 0
        self.fail_on_create_run = False

    def create_document(self, *, filename: str, file_path: str) -> str:
        if any(row["filename"] == filename for row in self.documents):
            raise ValueError(f'A document named "{filename}" is already indexed. Remove or rename it before uploading again.')
        self.document_counter += 1
        doc_id = f"doc-{self.document_counter}"
        self.documents.append(
            {
                "id": doc_id,
                "filename": filename,
                "file_path": file_path,
                "uploaded_at": f"2026-04-10T00:00:{self.document_counter:02d}+00:00",
            }
        )
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

    def delete_document_tree(self, *, document_id: str) -> None:
        self.documents = [row for row in self.documents if row["id"] != document_id]
        self.chunks = [row for row in self.chunks if row["document_id"] != document_id]

    def create_run(
        self,
        *,
        question: str,
        answer: str,
        confidence_score: float,
        trust_summary: str,
        risk_flags: list[str],
        citations: list[str],
        evaluation: dict | None = None,
    ) -> str:
        if self.fail_on_create_run:
            raise RuntimeError("run persistence unavailable")
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
                "evaluation": evaluation,
                "created_at": "2026-04-10T00:00:00+00:00",
            }
        )
        return run_id

    def list_documents(self) -> list[dict]:
        ordered = sorted(self.documents, key=lambda row: row["uploaded_at"], reverse=True)
        return [{"id": row["id"], "filename": row["filename"], "uploaded_at": row["uploaded_at"]} for row in ordered]

    def list_runs(self, limit: int = 100) -> list[dict]:
        return list(reversed(self.runs))[:limit]

    def list_chunks(self) -> list[dict]:
        return list(self.chunks)

    def ping(self) -> None:
        return None


class APITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo = FakeRepository()
        app.dependency_overrides[require_repository] = lambda: cls.repo
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
        evaluation = build_evaluation_report(
            question="What does the SOP require before startup?",
            answer="The SOP requires a documented pre-start safety inspection.",
            evidence_scores=[0.91],
            citations=["doc1_chunk0", "doc1_chunk1"],
            evidence_ids=["doc1_chunk0"],
            insufficient_evidence=False,
            risk_flags=[],
        )
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
            "evaluation": evaluation,
            "explanation": {
                "overview": evaluation["summary"],
                "teaching_points": evaluation["teaching_points"],
                "review_recommendation": evaluation["next_step"],
                "score_breakdown": [
                    {
                        "label": dimension["label"],
                        "value": dimension["score"],
                        "detail": dimension["rationale"],
                    }
                    for dimension in evaluation["dimensions"]
                ],
                "evidence_strength": "Retrieval alignment scored "
                f"{evaluation['dimensions'][0]['score']}/100 across 1 evidence chunks, with 1 strong-support chunk(s).",
                "citation_coverage": "TrustStack traced the answer through 2 citation(s), and the evaluation framework exposes citation traceability explicitly.",
                "flagged_concerns": [],
            },
        }

        with patch("app.routers.query.answer_question", return_value=fake_result):
            response = self.client.post("/query", json={"question": "What does the SOP require before startup?", "top_k": 3})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("explanation", payload)
        self.assertIn("evaluation", payload)
        self.assertEqual(payload["evaluation"]["framework"]["name"], "TrustStack Evaluation Standard")
        self.assertEqual(payload["evaluation"]["framework"]["version"], "2.0")
        self.assertIn("score_breakdown", payload["explanation"])
        self.assertIn("diagnostics", payload["evaluation"])
        self.assertIn("claims", payload["evaluation"])
        self.assertGreaterEqual(len(payload["explanation"]["teaching_points"]), 3)
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

    def test_query_endpoint_rejects_blank_question_and_invalid_top_k(self):
        blank_response = self.client.post("/query", json={"question": "   "})
        zero_top_k_response = self.client.post("/query", json={"question": "What happened?", "top_k": 0})
        negative_top_k_response = self.client.post("/query", json={"question": "What happened?", "top_k": -3})

        self.assertEqual(blank_response.status_code, 422)
        self.assertEqual(zero_top_k_response.status_code, 422)
        self.assertEqual(negative_top_k_response.status_code, 422)

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
        upsert_kwargs = fake_store.upsert.call_args.kwargs
        self.assertEqual(upsert_kwargs["metadatas"][0]["filename"], "policy.txt")
        self.assertEqual(upsert_kwargs["metadatas"][0]["chunk_uid"], "docdoc-1_chunk0")
        self.assertNotIn("page_num", upsert_kwargs["metadatas"][0])

        documents_response = self.client.get("/documents")
        self.assertEqual(documents_response.status_code, 200)
        self.assertEqual(len(documents_response.json()), 1)

    def test_ingest_rejects_duplicate_filename(self):
        temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(temp_dir.cleanup)
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
            first_response = self.client.post(
                "/ingest",
                files={"file": ("policy.txt", b"Safety inspection before startup.", "text/plain")},
            )
            duplicate_response = self.client.post(
                "/ingest",
                files={"file": ("policy.txt", b"Safety inspection before startup.", "text/plain")},
            )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(duplicate_response.status_code, 409)
        self.assertIn("already indexed", duplicate_response.json()["detail"])
        self.assertEqual(len(self.repo.documents), 1)

    def test_preset_sources_are_not_hidden_by_upload_extension_settings(self):
        with patch("app.routers.ingest.settings.allowed_extensions", ".pdf,.docx,.txt"):
            response = self.client.get("/ingest/presets")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload), 1)
        self.assertTrue(any(item["filename"].endswith(".md") for item in payload))

    def test_ingest_rolls_back_document_state_if_vector_indexing_fails(self):
        temp_dir = tempfile.TemporaryDirectory()
        temp_upload_dir = Path(temp_dir.name) / "uploads"
        temp_upload_dir.mkdir(parents=True, exist_ok=True)

        fake_embedder = Mock()
        fake_embedder.embed_texts.return_value = [[0.1, 0.2, 0.3]]
        fake_store = Mock()
        fake_store.upsert.side_effect = RuntimeError("vector store unavailable")

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
        self.assertEqual(response.status_code, 500)
        self.assertEqual(self.repo.documents, [])
        self.assertEqual(self.repo.chunks, [])

    def test_ingest_turns_parser_failures_into_bad_request_and_cleans_up(self):
        temp_dir = tempfile.TemporaryDirectory()
        temp_upload_dir = Path(temp_dir.name) / "uploads"
        temp_upload_dir.mkdir(parents=True, exist_ok=True)

        with patch("app.routers.ingest.settings.upload_dir", str(temp_upload_dir)), \
             patch("app.routers.ingest.parse_uploaded_file", side_effect=RuntimeError("corrupt pdf")):
            response = self.client.post(
                "/ingest",
                files={"file": ("policy.pdf", b"%PDF-1.4 broken", "application/pdf")},
            )

        temp_dir.cleanup()
        self.assertEqual(response.status_code, 400)
        self.assertIn("Failed to parse uploaded file", response.json()["detail"])
        self.assertEqual(self.repo.documents, [])
        self.assertEqual(self.repo.chunks, [])

    def test_ingest_rolls_back_persisted_records_when_indexing_fails(self):
        temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(temp_dir.cleanup)
        temp_upload_dir = Path(temp_dir.name) / "uploads"
        temp_upload_dir.mkdir(parents=True, exist_ok=True)

        fake_embedder = Mock()
        fake_embedder.embed_texts.return_value = [[0.1, 0.2, 0.3]]
        fake_store = Mock()
        fake_store.upsert.side_effect = RuntimeError("vector store is unavailable")

        with patch("app.routers.ingest.settings.upload_dir", str(temp_upload_dir)), \
             patch("app.routers.ingest.parse_uploaded_file", return_value=[{"page_num": None, "text": "Safety inspection before startup."}]), \
             patch("app.routers.ingest.chunk_pages", return_value=[{"filename": "policy.txt", "page_num": None, "text": "Safety inspection before startup."}]), \
             patch("app.routers.ingest.get_embedder", return_value=fake_embedder), \
             patch("app.routers.ingest.get_vector_store", return_value=fake_store):
            response = self.client.post(
                "/ingest",
                files={"file": ("policy.txt", b"Safety inspection before startup.", "text/plain")},
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(self.repo.documents, [])
        self.assertEqual(self.repo.chunks, [])

    def test_runs_endpoint_returns_saved_runs(self):
        self.repo.create_run(
            question="What is the maintenance interval?",
            answer="Inspect monthly.",
            confidence_score=72.5,
            trust_summary="Moderate confidence. Relevant evidence was found, but review the support before acting.",
            risk_flags=["LOW_RETRIEVAL_SUPPORT"],
            citations=["doc1_chunk0"],
            evaluation=None,
        )

        response = self.client.get("/runs")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["risk_flags"], ["LOW_RETRIEVAL_SUPPORT"])
        self.assertIsNone(payload[0]["evaluation"])

    def test_sample_question_endpoint_uses_most_recent_document(self):
        older_document_id = self.repo.create_document(filename="older.txt", file_path="/tmp/older.txt")
        self.repo.create_chunks(
            document_id=older_document_id,
            filename="older.txt",
            chunks=[
                {
                    "page_num": None,
                    "text": "Older source about maintenance intervals and lubrication schedules.",
                }
            ],
        )

        document_id = self.repo.create_document(filename="policy.txt", file_path="/tmp/policy.txt")
        self.repo.create_chunks(
            document_id=document_id,
            filename="policy.txt",
            chunks=[
                {
                    "page_num": None,
                    "text": "Operators must perform a full startup inspection before energizing the system. The procedure requires documenting any hazard before restart.",
                }
            ],
        )

        response = self.client.get("/documents/sample-questions")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload), 1)
        self.assertIn("question", payload[0])
        self.assertEqual(payload[0]["source"], "policy.txt")

    def test_query_returns_result_even_if_run_persistence_fails(self):
        self.repo.fail_on_create_run = True
        evaluation = build_evaluation_report(
            question="What does the SOP require before startup?",
            answer="The SOP requires a documented pre-start safety inspection.",
            evidence_scores=[0.91],
            citations=["doc1_chunk0"],
            evidence_ids=["doc1_chunk0"],
            insufficient_evidence=False,
            risk_flags=[],
        )
        fake_result = {
            "question": "What does the SOP require before startup?",
            "answer": "The SOP requires a documented pre-start safety inspection.",
            "citations": ["doc1_chunk0"],
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
            "evaluation": evaluation,
            "explanation": {
                "overview": evaluation["summary"],
                "teaching_points": evaluation["teaching_points"],
                "review_recommendation": evaluation["next_step"],
                "score_breakdown": [
                    {
                        "label": dimension["label"],
                        "value": dimension["score"],
                        "detail": dimension["rationale"],
                    }
                    for dimension in evaluation["dimensions"]
                ],
                "evidence_strength": "Retrieval alignment scored 91/100 across 1 evidence chunks, with 1 strong-support chunk(s).",
                "citation_coverage": "TrustStack traced the answer through 1 citation(s), and the evaluation framework exposes citation traceability explicitly.",
                "flagged_concerns": [],
            },
        }

        with patch("app.routers.query.answer_question", return_value=fake_result):
            response = self.client.post("/query", json={"question": "What does the SOP require before startup?", "top_k": 3})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], fake_result["answer"])
        self.assertEqual(self.repo.runs, [])

    def test_query_endpoint_rejects_blank_or_whitespace_questions(self):
        for question in ("", "   ", "\t\n"):
            with self.subTest(question=question):
                response = self.client.post("/query", json={"question": question, "top_k": 3})
                self.assertEqual(response.status_code, 422)

    def test_query_endpoint_rejects_nonpositive_top_k_values(self):
        for top_k in (0, -1, -10):
            with self.subTest(top_k=top_k):
                response = self.client.post("/query", json={"question": "What does the SOP require before startup?", "top_k": top_k})
                self.assertEqual(response.status_code, 422)

    def test_standard_run_endpoint_returns_suite_breakdown(self):
        fake_suite = {
            "framework": {
                "name": "TrustStack Evaluation Standard",
                "version": "2.0",
                "description": "A weighted, evidence-first evaluation standard for TrustStack answers with claim support, contradiction scanning, and calibration diagnostics.",
                "score_range": "0-100",
                "pass_threshold": 80.0,
                "review_threshold": 60.0,
                "dimensions": [
                    {"key": "retrieval_relevance", "label": "Retrieval relevance", "weight": 0.16, "purpose": "Measures retrieval quality."}
                ],
            },
            "metadata": {
                "suite_id": "suite-123",
                "generated_at": "2026-04-12T00:00:00+00:00",
                "suite_label": "active-corpus",
                "document_count": 1,
                "chunk_count": 3,
                "source_filenames": ["facility_safety_sop.txt"],
                "retrieval_backend": "simple-vector-benchmark",
                "embedding_provider": "lexical",
                "embedding_model": "lexical",
                "llm_provider": "disabled",
                "llm_model": "disabled",
                "top_k": 5,
                "max_context_chunks": 5,
            },
            "final_score": 84.2,
            "verdict": "pass",
            "summary": "TrustStack Standard Suite scored the system at 84.2/100.",
            "score_breakdown": [
                {
                    "key": "grounding",
                    "label": "Grounding and retrieval",
                    "weight": 0.22,
                    "score": 86.0,
                    "verdict": "pass",
                    "summary": "Grounding performed strongly.",
                }
            ],
            "cases": [
                {
                    "id": "grounded-1",
                    "label": "Direct evidence retrieval",
                    "category": "grounding",
                    "question": "What inspection is required before startup?",
                    "score": 88.0,
                    "verdict": "pass",
                    "trust_summary": "High confidence.",
                    "risk_flags": [],
                    "citations": ["doc-1-chunk-0"],
                    "evidence_count": 1,
                    "supported_claim_ratio": 1.0,
                    "citation_alignment_ratio": 1.0,
                }
            ],
            "recommended_actions": ["Review weak categories before presenting the system as deployment-ready."],
        }

        with patch("app.routers.evaluation.run_standard_suite", return_value=fake_suite):
            response = self.client.post("/evaluation/standard-run")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["framework"]["version"], "2.0")
        self.assertEqual(payload["verdict"], "pass")
        self.assertEqual(len(payload["score_breakdown"]), 1)
        self.assertEqual(len(payload["cases"]), 1)

    def test_report_artifacts_endpoint_exports_existing_suite_payload(self):
        fake_suite = {
            "framework": {
                "name": "TrustStack Evaluation Standard",
                "version": "2.0",
                "description": "A weighted, evidence-first evaluation standard for TrustStack answers with claim support, contradiction scanning, and calibration diagnostics.",
                "score_range": "0-100",
                "pass_threshold": 80.0,
                "review_threshold": 60.0,
                "dimensions": [
                    {"key": "retrieval_relevance", "label": "Retrieval relevance", "weight": 0.16, "purpose": "Measures retrieval quality."}
                ],
            },
            "metadata": {
                "suite_id": "suite-123",
                "generated_at": "2026-04-12T00:00:00+00:00",
                "suite_label": "active-corpus",
                "document_count": 1,
                "chunk_count": 3,
                "source_filenames": ["facility_safety_sop.txt"],
                "retrieval_backend": "simple-vector-benchmark",
                "embedding_provider": "lexical",
                "embedding_model": "lexical",
                "llm_provider": "disabled",
                "llm_model": "disabled",
                "top_k": 5,
                "max_context_chunks": 5,
            },
            "final_score": 84.2,
            "verdict": "pass",
            "summary": "summary",
            "score_breakdown": [
                {
                    "key": "grounding",
                    "label": "Grounding and retrieval",
                    "weight": 0.22,
                    "score": 86.0,
                    "verdict": "pass",
                    "summary": "Grounding performed strongly.",
                }
            ],
            "cases": [
                {
                    "id": "grounded-1",
                    "label": "Direct evidence retrieval",
                    "category": "grounding",
                    "question": "What inspection is required before startup?",
                    "score": 88.0,
                    "verdict": "pass",
                    "trust_summary": "High confidence.",
                    "risk_flags": [],
                    "citations": ["doc-1-chunk-0"],
                    "evidence_count": 1,
                    "supported_claim_ratio": 1.0,
                    "citation_alignment_ratio": 1.0,
                }
            ],
            "recommended_actions": ["Review weak categories before presenting the system as deployment-ready."],
        }
        fake_artifacts = {
            "suite": fake_suite,
            "executive_summary": "TrustStack scored the active evaluation stack at 84.2/100.",
            "latex_category_table": "\\begin{table*}[t]\\n\\rowcolor{TrustStackBlue!12}",
            "latex_case_table": "\\begin{table*}[p]\\n\\rowcolor{TrustStackBlue!12}",
            "appendix_markdown": "### Appendix: Standardized Case Results",
        }

        with patch("app.routers.evaluation.build_report_artifacts", return_value=fake_artifacts) as build_report_artifacts_mock:
            response = self.client.post("/evaluation/report-artifacts", json={"suite": fake_suite})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["suite"]["verdict"], "pass")
        self.assertEqual(payload["suite"]["metadata"]["suite_label"], "active-corpus")
        self.assertIn("executive_summary", payload)
        self.assertIn("latex_category_table", payload)
        self.assertIn("appendix_markdown", payload)
        build_report_artifacts_mock.assert_called_once()

    def test_report_artifacts_endpoint_returns_export_content(self):
        fake_artifacts = {
            "suite": {
                "framework": {
                    "name": "TrustStack Evaluation Standard",
                    "version": "2.0",
                    "description": "desc",
                    "score_range": "0-100",
                    "pass_threshold": 80.0,
                    "review_threshold": 60.0,
                    "dimensions": [
                        {"key": "retrieval_relevance", "label": "Retrieval relevance", "weight": 0.16, "purpose": "Measures retrieval quality."}
                    ],
                },
                "metadata": {
                    "suite_id": "suite-123",
                    "generated_at": "2026-04-12T00:00:00+00:00",
                    "suite_label": "active-corpus",
                    "document_count": 1,
                    "chunk_count": 3,
                    "source_filenames": ["facility_safety_sop.txt"],
                    "retrieval_backend": "simple-vector-benchmark",
                    "embedding_provider": "lexical",
                    "embedding_model": "lexical",
                    "llm_provider": "disabled",
                    "llm_model": "disabled",
                    "top_k": 5,
                    "max_context_chunks": 5,
                },
                "final_score": 84.2,
                "verdict": "pass",
                "summary": "summary",
                "score_breakdown": [
                    {"key": "grounding", "label": "Grounding and retrieval", "weight": 0.22, "score": 86.0, "verdict": "pass", "summary": "Grounding performed strongly."}
                ],
                "cases": [
                    {"id": "grounded-1", "label": "Direct evidence retrieval", "category": "grounding", "question": "What inspection is required before startup?", "score": 88.0, "verdict": "pass", "trust_summary": "High confidence.", "risk_flags": [], "citations": ["doc-1-chunk-0"], "evidence_count": 1, "supported_claim_ratio": 1.0, "citation_alignment_ratio": 1.0}
                ],
                "recommended_actions": ["Review weak categories before presenting the system as deployment-ready."],
            },
            "executive_summary": "TrustStack scored the active evaluation stack at 84.2/100.",
            "latex_category_table": "\\begin{table*}[t]",
            "latex_case_table": "\\begin{table*}[t]",
            "appendix_markdown": "### Appendix: Standardized Case Results",
        }

        with patch("app.routers.evaluation.run_standard_suite", return_value=fake_artifacts["suite"]), \
             patch("app.routers.evaluation.build_report_artifacts", return_value=fake_artifacts):
            response = self.client.post("/evaluation/standard-run/report-artifacts")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("executive_summary", payload)
        self.assertIn("latex_category_table", payload)
        self.assertIn("appendix_markdown", payload)

    def test_batch_benchmark_endpoint_returns_dataset_runs(self):
        fake_batch = {
            "framework": {
                "name": "TrustStack Evaluation Standard",
                "version": "2.0",
                "description": "desc",
                "score_range": "0-100",
                "pass_threshold": 80.0,
                "review_threshold": 60.0,
                "dimensions": [],
            },
            "generated_at": "2026-04-12T00:00:00+00:00",
            "dataset_runs": [
                {
                    "dataset_label": "facility_safety_sop.txt",
                    "final_score": 84.2,
                    "verdict": "pass",
                    "document_count": 1,
                    "chunk_count": 3,
                    "source_filenames": ["facility_safety_sop.txt"],
                }
            ],
            "aggregate_score": 84.2,
            "verdict": "pass",
            "recommended_actions": ["Compare lower-scoring datasets directly."],
        }

        with patch("app.routers.evaluation.run_standard_batch_benchmark", return_value=fake_batch):
            response = self.client.post("/evaluation/standard-run/batch")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["dataset_runs"]), 1)
        self.assertEqual(payload["aggregate_score"], 84.2)

    def test_real_benchmark_endpoint_returns_dataset_runs(self):
        fake_benchmark = {
            "framework": {
                "name": "TrustStack Evaluation Standard",
                "version": "2.0",
                "description": "desc",
                "score_range": "0-100",
                "pass_threshold": 80.0,
                "review_threshold": 60.0,
                "dimensions": [],
            },
            "generated_at": "2026-04-13T00:00:00+00:00",
            "dataset_runs": [
                {
                    "dataset_key": "fever",
                    "dataset_label": "FEVER",
                    "task_type": "verification",
                    "example_count": 5,
                    "task_metric_label": "label_accuracy",
                    "task_metric_score": 0.8,
                    "truststack_score": 74.6,
                    "supported_claim_ratio": 0.9,
                    "citation_alignment_ratio": 0.85,
                    "flagged_case_rate": 0.4,
                    "verdict": "review",
                }
            ],
            "aggregate_score": 74.6,
            "aggregate_task_metric": 0.8,
            "verdict": "review",
            "recommended_actions": ["Inspect weak citation alignment before publication."],
            "cases": [
                {
                    "dataset_key": "fever",
                    "dataset_label": "FEVER",
                    "task_type": "verification",
                    "example_id": "1",
                    "question": "Claim: x",
                    "predicted_answer": "supported",
                    "gold_answer": None,
                    "gold_label": "supported",
                    "task_score": 1.0,
                    "task_metric_label": "label_accuracy",
                    "truststack_score": 81.0,
                    "verdict": "pass",
                    "supported_claim_ratio": 1.0,
                    "citation_alignment_ratio": 1.0,
                    "risk_flags": [],
                }
            ],
        }

        with patch("app.routers.evaluation.run_real_dataset_benchmark", return_value=fake_benchmark):
            response = self.client.post("/evaluation/real-benchmark", json={"dataset_keys": ["fever"], "sample_limit": 5})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["dataset_runs"][0]["dataset_key"], "fever")
        self.assertEqual(payload["aggregate_task_metric"], 0.8)


if __name__ == "__main__":
    unittest.main()
