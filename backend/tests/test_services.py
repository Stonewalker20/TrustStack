from __future__ import annotations

import unittest
from unittest.mock import Mock, patch

from app.services.evaluation import build_evaluation_report
from app.services.explanations import build_query_explanation
from app.services.rag import _extract_hits, _rebuild_index_from_chunks
from app.services.report_export import build_report_artifacts
from app.services.risk import build_risk_flags, summarize_trust
from app.services.scorer import compute_confidence
from app.services.standard_suite import run_standard_batch_benchmark, run_standard_suite
from app.services.suggestions import build_sample_questions


class ServiceBehaviorTests(unittest.TestCase):
    def test_extract_hits_normalizes_store_output(self):
        raw = {
            "documents": [["A supported answer.", "Another supporting excerpt."]],
            "metadatas": [[{"filename": "policy.txt", "page_num": 2}, {"filename": "manual.txt", "page_num": 4}]],
            "distances": [[0.1, 0.35]],
            "ids": [["doc1_chunk0", "doc2_chunk1"]],
        }

        hits = _extract_hits(raw)

        self.assertEqual(len(hits), 2)
        self.assertEqual(hits[0]["source"], "policy.txt")
        self.assertAlmostEqual(hits[0]["score"], 0.9, places=3)
        self.assertEqual(hits[1]["page"], 4)

    def test_compute_confidence_rewards_support_and_caps_insufficient_evidence(self):
        strong_confidence = compute_confidence([0.92, 0.84, 0.8], ["c1", "c2", "c3"], False, "Short grounded answer.")
        weak_confidence = compute_confidence([0.28], [], True, "Long answer " * 120)

        self.assertGreater(strong_confidence, weak_confidence)
        self.assertLessEqual(weak_confidence, 55.0)
        self.assertGreaterEqual(weak_confidence, 1.0)

    def test_build_risk_flags_deduplicates_and_detects_operational_advice(self):
        flags = build_risk_flags(
            evidence_scores=[0.2, 0.25],
            citations=[],
            insufficient_evidence=True,
            answer="You should bypass the lockout and repair the unit immediately.",
        )

        self.assertEqual(len(flags), len(set(flags)))
        self.assertIn("LOW_RETRIEVAL_SUPPORT", flags)
        self.assertIn("NO_CITATIONS", flags)
        self.assertIn("INSUFFICIENT_EVIDENCE", flags)
        self.assertIn("OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW", flags)

    def test_summarize_trust_matches_score_bands(self):
        self.assertIn("High confidence", summarize_trust(88, []))
        self.assertIn("Moderate confidence", summarize_trust(68, ["LOW_RETRIEVAL_SUPPORT"]))
        self.assertIn("Low confidence", summarize_trust(42, ["LOW_RETRIEVAL_SUPPORT"]))

    def test_build_query_explanation_teaches_user_how_score_was_formed(self):
        evaluation = build_evaluation_report(
            question="What does the SOP require before startup?",
            answer="The source indicates inspections happen before startup and after maintenance.",
            evidence_scores=[0.82, 0.7, 0.55],
            citations=["doc1_chunk0", "doc1_chunk1"],
            evidence_ids=["doc1_chunk0", "doc1_chunk1", "doc1_chunk2"],
            insufficient_evidence=False,
            risk_flags=["LOW_RETRIEVAL_SUPPORT"],
        )
        explanation = build_query_explanation(
            confidence_score=74.5,
            evidence_scores=[0.82, 0.7, 0.55],
            citations=["doc1_chunk0", "doc1_chunk1"],
            insufficient_evidence=False,
            risk_flags=["LOW_RETRIEVAL_SUPPORT"],
            answer="The source indicates inspections happen before startup and after maintenance.",
            evaluation=evaluation,
        )

        self.assertIn("TrustStack scored this answer", explanation["overview"])
        self.assertGreaterEqual(len(explanation["teaching_points"]), 4)
        self.assertEqual(explanation["score_breakdown"][0]["label"], "Retrieval relevance")
        self.assertEqual(len(explanation["flagged_concerns"]), 1)
        self.assertIn("retrieved passages", explanation["flagged_concerns"][0].lower())
        self.assertIn("strengths", explanation)
        self.assertIn("recommended_followups", explanation)

    def test_build_evaluation_report_exposes_standardized_dimensions_and_checks(self):
        report = build_evaluation_report(
            question="What does the SOP require before startup?",
            answer="The SOP requires a documented pre-start safety inspection.",
            evidence_scores=[0.92, 0.84, 0.8],
            citations=["doc1_chunk0", "doc1_chunk1"],
            evidence_ids=["doc1_chunk0", "doc1_chunk1", "doc1_chunk2"],
            insufficient_evidence=False,
            risk_flags=[],
        )

        self.assertEqual(report["framework"]["name"], "TrustStack Evaluation Standard")
        self.assertEqual(report["framework"]["version"], "2.0")
        self.assertGreaterEqual(len(report["dimensions"]), 10)
        self.assertGreaterEqual(len(report["checks"]), 10)
        self.assertIn(report["verdict"], {"pass", "review", "fail"})
        self.assertIn("teaching_points", report)
        self.assertIn("diagnostics", report)
        self.assertIn("claims", report)
        self.assertIn("strengths", report)

    def test_rebuild_index_from_repository_chunks(self):
        fake_repo = Mock()
        fake_repo.list_chunks.return_value = [
            {
                "document_id": "doc-1",
                "filename": "policy.txt",
                "page_num": None,
                "chunk_uid": "docdoc-1_chunk0",
                "text": "Inspect the system before startup.",
            }
        ]
        fake_store = Mock()
        fake_embedder = Mock()
        fake_embedder.embed_texts.return_value = [[0.2, 0.3, 0.4]]

        with patch("app.services.rag.get_repository", return_value=fake_repo):
            indexed = _rebuild_index_from_chunks(fake_store, fake_embedder)

        self.assertEqual(indexed, 1)
        fake_store.upsert.assert_called_once()

    def test_build_sample_questions_returns_grounded_prompts(self):
        questions = build_sample_questions(
            [
                {
                    "filename": "policy.txt",
                    "text": "Operators must complete a startup inspection before energizing the system. The procedure requires documenting every hazard and warning before restart.",
                }
            ]
        )

        self.assertGreaterEqual(len(questions), 1)
        self.assertTrue(any("what" in question.lower() for question in questions))

    def test_run_standard_suite_aggregates_cases_and_breakdown(self):
        fake_chunks = [
            {
                "document_id": "doc-1",
                "filename": "policy.txt",
                "page_num": None,
                "chunk_uid": "doc-1-chunk-0",
                "text": "Operators must complete a startup inspection before energizing the system.",
            }
        ]
        fake_repo = Mock()
        fake_repo.list_chunks.return_value = fake_chunks

        with patch("app.services.standard_suite.get_repository", return_value=fake_repo), \
             patch("app.services.standard_suite.get_embedder") as get_embedder_mock, \
             patch("app.services.standard_suite.retrieve_hits") as retrieve_hits_mock, \
             patch("app.services.standard_suite._answer_from_hits") as answer_from_hits_mock:
            fake_embedder = Mock()
            fake_embedder.embed_texts.return_value = [[0.2, 0.3, 0.4]]
            get_embedder_mock.return_value = fake_embedder
            retrieve_hits_mock.return_value = [
                {"source": "policy.txt", "page": None, "chunk_id": "doc-1-chunk-0", "score": 0.91, "text": fake_chunks[0]["text"]}
            ]
            answer_from_hits_mock.return_value = {
                "question": "What inspection is required before startup?",
                "answer": "The evidence requires a startup inspection before energizing the system.",
                "citations": ["doc-1-chunk-0"],
                "evidence": retrieve_hits_mock.return_value,
                "confidence_score": 88.0,
                "risk_flags": [],
                "trust_summary": "High confidence.",
                "insufficient_evidence": False,
                "latency_ms": 10,
                "evaluation": build_evaluation_report(
                    question="What inspection is required before startup?",
                    answer="The evidence requires a startup inspection before energizing the system.",
                    evidence_scores=[0.91],
                    citations=["doc-1-chunk-0"],
                    evidence_ids=["doc-1-chunk-0"],
                    insufficient_evidence=False,
                    risk_flags=[],
                    hits=retrieve_hits_mock.return_value,
                ),
                "explanation": {},
            }
            result = run_standard_suite()

        self.assertGreaterEqual(len(result["cases"]), 4)
        self.assertGreaterEqual(len(result["score_breakdown"]), 4)
        self.assertIn(result["verdict"], {"pass", "review", "fail"})
        self.assertIn("final_score", result)
        self.assertIn("metadata", result)

    def test_build_report_artifacts_returns_exportable_content(self):
        fake_suite = {
            "framework": {
                "name": "TrustStack Evaluation Standard",
                "version": "2.0",
                "description": "desc",
                "score_range": "0-100",
                "pass_threshold": 80.0,
                "review_threshold": 60.0,
                "dimensions": [],
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
                {"id": "case-1", "label": "Direct evidence retrieval", "category": "grounding", "question": "What is required?", "score": 88.0, "verdict": "pass", "trust_summary": "High confidence.", "risk_flags": [], "citations": ["c1"], "evidence_count": 2, "supported_claim_ratio": 1.0, "citation_alignment_ratio": 1.0}
            ],
            "recommended_actions": ["Review weak categories before presentation."],
        }

        artifacts = build_report_artifacts(fake_suite)

        self.assertIn("executive_summary", artifacts)
        self.assertIn(r"\begin{table*}", artifacts["latex_category_table"])
        self.assertIn(r"\begin{table*}", artifacts["latex_case_table"])
        self.assertIn("Appendix: Standardized Case Results", artifacts["appendix_markdown"])

    def test_run_standard_batch_benchmark_returns_dataset_runs(self):
        fake_chunks = [
            {"chunk_uid": "a-1", "filename": "a.txt", "page_num": 1, "text": "Operators must inspect valves before startup."},
            {"chunk_uid": "b-1", "filename": "b.txt", "page_num": 1, "text": "Supervisors review maintenance records after repairs."},
        ]
        fake_suite = {
            "framework": {"name": "TrustStack Evaluation Standard", "version": "2.0", "description": "desc", "score_range": "0-100", "pass_threshold": 80.0, "review_threshold": 60.0, "dimensions": []},
            "metadata": {
                "suite_id": "suite-123",
                "generated_at": "2026-04-12T00:00:00+00:00",
                "suite_label": "a.txt",
                "document_count": 1,
                "chunk_count": 1,
                "source_filenames": ["a.txt"],
                "retrieval_backend": "simple-vector-benchmark",
                "embedding_provider": "lexical",
                "embedding_model": "lexical",
                "llm_provider": "disabled",
                "llm_model": "disabled",
                "top_k": 5,
                "max_context_chunks": 5,
            },
            "final_score": 82.0,
            "verdict": "pass",
            "summary": "summary",
            "score_breakdown": [],
            "cases": [],
            "recommended_actions": [],
        }

        with patch("app.services.standard_suite.get_repository") as get_repository_mock, \
             patch("app.services.standard_suite.run_standard_suite_for_chunks", return_value=fake_suite):
            get_repository_mock.return_value.list_chunks.return_value = fake_chunks
            result = run_standard_batch_benchmark()

        self.assertEqual(len(result["dataset_runs"]), 2)
        self.assertIn("aggregate_score", result)


if __name__ == "__main__":
    unittest.main()
