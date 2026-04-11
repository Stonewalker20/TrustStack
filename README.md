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
mongodb://127.0.0.1:27017
```

Default database:

```bash
truststack
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

---

## Running Tests

Backend tests:

```bash
cd backend
./.venv/bin/python -m unittest discover -s tests -v
```

The backend suite currently covers:

- health endpoint behavior
- ingest validation
- query success and failure paths
- run history retrieval
- hit extraction
- confidence scoring
- risk flags
- explanation generation
- repository-driven index rebuild behavior

---

## Environment Notes

Important backend settings in `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017
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
