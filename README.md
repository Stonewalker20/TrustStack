# TrustStack

> A cinematic trust layer for grounded AI systems.

TrustStack turns AI evaluation into a guided mission. Users can upload source material, run grounded queries, inspect evidence, review confidence and risk signals, and move through the workflow in a solar-system-inspired interface.

---

## What TrustStack Does

TrustStack is built to answer one practical question:

**Can a user understand not only what the model said, but why it should or should not be trusted?**

It combines:

- Document ingestion and indexing
- Retrieval-augmented answering
- Confidence scoring
- Risk flag generation
- Evidence inspection
- Run history tracking
- A visual frontend that walks the user through each evaluation stage

---

## Course Project Fit

TrustStack is a comprehensive model-evaluation and grounded-AI analysis project for CSI-4130/5130. It fits the course brief in three ways:

- `Comprehensive Model Evaluation`
  TrustStack evaluates generative AI outputs with a standardized evidence-first scoring framework, traceability checks, contradiction analysis, and benchmarkable report artifacts.
- `Application Development with Modern AI`
  The system is a working full-stack application with a browser frontend, FastAPI backend, MongoDB persistence, retrieval, local model integration, and reproducible export/report paths.
- `Real-World Problem Focus`
  The project targets a practical deployment problem: users often receive fluent AI outputs without a reliable way to judge whether those outputs are sufficiently grounded to trust.

---

## Problem Statement

Modern LLM systems are easy to demo but difficult to trust. In policy, research, safety, and compliance settings, users need more than an answer: they need evidence traceability, contradiction checks, confidence calibration, and explicit guidance on whether the response is safe to operationalize.

TrustStack addresses that problem by treating trust as a first-class evaluation output rather than a vague subjective impression.

---

## Proposed Method

TrustStack uses a local-first retrieval and evaluation workflow:

1. ingest user evidence and chunk it into indexed passages
2. retrieve the most relevant passages for a question
3. generate a grounded answer with citations
4. score the answer with the TrustStack Evaluation Standard v2.0
5. return evidence diagnostics, risk flags, explanations, and exportable report artifacts

This makes the system both an application and an evaluation framework.

---

## Data Sources

TrustStack currently uses two categories of data:

- user-uploaded evidence files in `.pdf`, `.docx`, `.txt`, and `.md`
- controlled benchmark corpora for evaluation

Benchmark support currently includes:

- synthetic evidence packets for reproducible stress testing
- `FEVER` for claim verification
- `SciFact` for scientific claim verification
- `HotpotQA` for multi-hop grounded question answering

The backend supports normalized local benchmark files in `backend/data/benchmarks/` and optional Hugging Face dataset loading for supported public datasets.

---

## Feature Map

### Frontend Experience

- Solar-system landing page with guided planet-based workflow
- Focused pages for ingestion, live query, evidence review, risk summary, history, blueprint, and methodology
- Mission Control mode for users who want the full workflow on one screen

### Backend Capabilities

- File upload and parsing for `.pdf`, `.docx`, `.txt`, and `.md`
- Chunking and indexing of source material
- Retrieval over stored chunks
- Grounded answer generation
- Trust scoring and risk labeling
- Detailed explanation payloads that teach the user how the score was formed

### Reliability Layer

- Confidence scoring based on retrieval quality, citation coverage, and answer behavior
- Flags for weak support, missing citations, insufficient evidence, and operational-risk language
- Explanation payloads that show:
  - score breakdown
  - evidence strength
  - citation coverage
  - flagged concerns
  - review recommendation

---

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React, Vite, TypeScript |
| Backend API | FastAPI |
| Document Store | MongoDB |
| Vector Retrieval | ChromaDB or simple local vector store fallback |
| Embeddings | Ollama embeddings, local sentence-transformers, or lexical fallback |
| LLM | Ollama, OpenAI-compatible API, or extractive fallback |
| Tests | Python `unittest` |

---

## Quick Start

### 1. Pull local models

```bash
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
```

If your machine is tighter on memory:

```bash
ollama pull qwen2.5:3b-instruct
```

### 2. Start MongoDB

TrustStack now expects MongoDB for documents, chunks, and run history.

Default connection:

```bash
mongodb://127.0.0.1:27018
```

Default database:

```bash
truststack
```

Recommended local runtime with Docker:

```bash
docker compose up -d mongo
docker compose ps
```

To stop it later:

```bash
docker compose stop mongo
```

### 3. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

If you are using the included Docker Mongo setup, the default `.env` values already point at it:

```env
MONGO_URI=mongodb://127.0.0.1:27018
MONGO_DB_NAME=truststack
```

Optional retrieval upgrade:

```bash
pip install -r requirements-optional.txt
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default:

```text
http://127.0.0.1:5173
```

Backend default:

```text
http://127.0.0.1:8000
```

---

## API Surface

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Check backend availability |
| `POST /ingest` | Upload and index a document |
| `POST /query` | Run a grounded query and receive answer, evidence, score, risks, and explanation |
| `GET /runs` | Retrieve recent evaluation history |
| `GET /documents` | Retrieve indexed document list |
| `POST /evaluation/standard-run` | Run the TrustStack standardized suite over the active indexed corpus |
| `POST /evaluation/standard-run/batch` | Compare TrustStack across each indexed source file independently |
| `POST /evaluation/real-benchmark` | Run TrustStack against real benchmark datasets such as FEVER, SciFact, and HotpotQA |

---

## Running Tests

Backend tests:

```bash
cd backend
./.venv/bin/python -m unittest discover -s tests -v
```

Real Mongo integration test:

```bash
docker compose up -d mongo
cd backend
./.venv/bin/python -m unittest tests.test_integration_mongo -v
```

Project-level verification:

```bash
npm run verify:frontend
npm run verify:backend:unit
npm run verify:backend:integration
npm run verify:e2e
npm run verify:smoke
```

The backend suite currently covers:

- health endpoint behavior
- ingest validation
- query success and failure paths
- run history retrieval

Real benchmark datasets:

- install `backend/requirements-optional.txt` to enable Hugging Face dataset loading
- or place normalized JSONL benchmark files in `backend/data/benchmarks/`
- supported benchmark keys currently include `fever`, `scifact`, and `hotpotqa`
- real Mongo-backed ingest, query, document, and run-history integration
- hit extraction
- confidence scoring
- risk flags
- explanation generation
- repository-driven index rebuild behavior

Browser E2E coverage now includes:

- real frontend against the live local backend
- real document upload from the UI
- sample-question generation in the UI
- grounded query execution through the browser
- downstream risk and run-history views after a live evaluation

Production-like smoke coverage now includes:

- built frontend assets served through `vite preview`
- live FastAPI backend served through `uvicorn`
- live MongoDB container runtime
- end-to-end browser validation against the served stack

---

## Evaluation Summary

TrustStack currently evaluates:

- retrieval relevance
- evidence sufficiency
- citation traceability
- claim support
- contradiction risk
- completeness
- honesty and abstention
- answer discipline
- safety and operational risk
- calibration and consistency

The repository also includes:

- backend unit tests
- real Mongo integration tests
- browser E2E tests
- served-stack smoke tests
- synthetic benchmark generation for the IEEE report
- real benchmark support for FEVER, SciFact, and HotpotQA

---

## Presentation Assets

The in-class presentation is supported by:

- the interactive frontend in `frontend/`
- the final report PDF in `docs/report/main.pdf`
- the planet-view presentation flow built into the frontend experience

Video Presentation Link: 

---

## Environment Notes

Important backend settings in `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27018
MONGO_DB_NAME=truststack
CHROMA_PERSIST_DIR=./data/chroma
UPLOAD_DIR=./data/uploads
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:7b-instruct
```

The backend includes fallbacks for constrained local environments:

- lexical embedding fallback if external embeddings are unavailable
- extractive answer fallback if model generation is unavailable
- vector index rebuild from persisted chunks when the retrieval index is empty

---

## Security Notes

Current protections include:

- filename sanitization
- unique stored upload names
- upload size limits
- extension allow-listing
- safer fallback execution paths when providers are unavailable

Before public deployment, add:

- authentication
- rate limiting
- stricter CORS
- upload malware scanning
- safer file parsing isolation
- secrets management

---

## Project Structure

```text
TrustStack/
├── backend/
│   ├── app/
│   ├── data/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── public/
│   └── src/
├── docs/
├── sample_data/
└── README.md
```

---

## Current Direction

TrustStack is moving toward a polished local-first AI evaluation platform with:

- a stronger Mongo-backed document layer
- richer explanation and teaching output
- resilient offline fallback behavior
- a more production-ready guided frontend

If you are working on the repo next, the highest-leverage areas are:

1. live Mongo runtime validation
2. backend integration tests against a real database
3. richer frontend rendering of the backend explanation payload
4. tighter ingestion and retrieval observability

---

## Citations & Acknowledgements

TrustStack builds on published work and open-source tools. Key research references are documented in [references.bib](docs/report/references.bib) and cited in the final report. Major software and dataset dependencies include:

- FastAPI
- React and Vite
- MongoDB
- ChromaDB
- Ollama
- Hugging Face datasets
- FEVER
- SciFact
- HotpotQA

The final report source is in [main.tex](docs/report/main.tex) and the compiled PDF is in [main.pdf](docs/report/main.pdf). All benchmark tables in the report are generated from project artifacts rather than manually transcribed.
