import time

from app.config import settings
from app.repository import get_repository
from app.services.evaluation import build_evaluation_report
from app.services.embeddings import get_embedder
from app.services.explanations import build_query_explanation
from app.services.llm import client as llm_client
from app.services.risk import build_risk_flags, summarize_trust
from app.services.vector_store import get_vector_store


def _extract_hits(raw: dict) -> list[dict]:
    docs = raw.get("documents", [[]])[0]
    metas = raw.get("metadatas", [[]])[0]
    distances = raw.get("distances", [[]])[0]
    ids = raw.get("ids", [[]])[0]

    results = []
    for doc, meta, distance, hit_id in zip(docs, metas, distances, ids):
        score = max(0.0, 1.0 - float(distance)) if distance is not None else 0.0
        results.append(
            {
                "source": meta.get("filename", "unknown"),
                "page": meta.get("page_num"),
                "chunk_id": hit_id,
                "score": round(score, 4),
                "text": doc,
            }
        )
    return results


def _rebuild_index_from_chunks(vector_store, embedder) -> int:
    chunks = get_repository().list_chunks()
    if not chunks:
        return 0

    ids = [chunk["chunk_uid"] for chunk in chunks]
    documents = [chunk["text"] for chunk in chunks]
    metadatas = [
        {
            "filename": chunk["filename"],
            "page_num": chunk["page_num"],
            "chunk_uid": chunk["chunk_uid"],
        }
        for chunk in chunks
    ]

    embeddings = embedder.embed_texts(documents)
    vector_store.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
    return len(ids)


def answer_question(question: str, top_k: int | None = None) -> dict:
    start = time.perf_counter()
    top_k = top_k or settings.top_k
    embedder = get_embedder()
    vector_store = get_vector_store()

    collection_size = vector_store.count()
    if collection_size == 0:
        collection_size = _rebuild_index_from_chunks(vector_store, embedder)
    if collection_size == 0:
        raise ValueError("No indexed documents found. Upload and index at least one document first.")

    query_embedding = embedder.embed_query(question)
    raw_results = vector_store.query(query_embedding=query_embedding, top_k=top_k)
    hits = _extract_hits(raw_results)
    if not hits:
        raise ValueError("No evidence was retrieved for this question.")

    context_chunks = hits[: settings.max_context_chunks]
    context = "\n\n".join(
        f"[{item['chunk_id']}] {item['source']} page={item['page']}\n{item['text']}" for item in context_chunks
    )

    llm_output = llm_client.generate_answer(question=question, context=context, hits=context_chunks)
    answer = llm_output.get("answer", "No answer returned.")
    citations = llm_output.get("citations", []) or []
    insufficient_evidence = bool(llm_output.get("insufficient_evidence", False))

    evidence_scores = [item["score"] for item in hits]
    risk_flags = build_risk_flags(evidence_scores, citations, insufficient_evidence, answer)
    evaluation = build_evaluation_report(
        question=question,
        answer=answer,
        evidence_scores=evidence_scores,
        citations=citations,
        evidence_ids=[item["chunk_id"] for item in hits],
        insufficient_evidence=insufficient_evidence,
        risk_flags=risk_flags,
    )
    confidence_score = evaluation["overall_score"]
    trust_summary = summarize_trust(confidence_score, risk_flags)
    explanation = build_query_explanation(
        confidence_score=confidence_score,
        evidence_scores=evidence_scores,
        citations=citations,
        insufficient_evidence=insufficient_evidence,
        risk_flags=risk_flags,
        answer=answer,
        evaluation=evaluation,
    )
    latency_ms = int((time.perf_counter() - start) * 1000)

    return {
        "question": question,
        "answer": answer,
        "citations": citations,
        "evidence": hits,
        "confidence_score": confidence_score,
        "risk_flags": risk_flags,
        "trust_summary": trust_summary,
        "insufficient_evidence": insufficient_evidence,
        "latency_ms": latency_ms,
        "evaluation": evaluation,
        "explanation": explanation,
    }
