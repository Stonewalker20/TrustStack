# TrustStack

TrustStack is a full-stack reliability layer for retrieval-augmented and agentic AI workflows. It ingests documents, retrieves supporting evidence, generates grounded answers, scores confidence, and surfaces risk flags so users can assess whether an AI output is trustworthy.

## Recommended local model stack

For a free and practical 2026 local MVP, use:
- **LLM:** `qwen2.5:7b-instruct` via Ollama
- **Embeddings:** `nomic-embed-text` via Ollama
- **Fallback if hardware is tight:** `qwen2.5:3b-instruct`
- **Offline emergency fallback:** built-in lexical embedder + extractive answer mode

Why these defaults:
- Ollama exposes a broad local model library, including Qwen2.5 instruct variants and embedding models. citeturn845767search0turn845767search1turn845767search8
- `nomic-embed-text` is published as an embedding-only model optimized for retrieval tasks. citeturn845767search4
- `all-MiniLM-L6-v2` remains a lightweight sentence-transformer option for local semantic retrieval, though its default intended use is sentence/short paragraph encoding and longer inputs are truncated. citeturn845767search2turn845767search7turn845767search16

## MVP Features
- Document upload and indexing
- Retrieval-augmented question answering
- Reliability scoring and risk flags
- Run history logging
- React dashboard for upload, querying, and evidence review

## Tech Stack
- Frontend: React + Vite + TypeScript
- Backend: FastAPI + SQLAlchemy
- Vector Store: ChromaDB
- Embeddings: Ollama embeddings, sentence-transformers, or lexical fallback
- LLM: Ollama, OpenAI-compatible API, or extractive fallback
- Database: SQLite

## Quick Start

### 1. Start Ollama and pull models
```bash
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
```

If your machine is tighter on RAM/VRAM:
```bash
ollama pull qwen2.5:3b-instruct
```

### 2. Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# optional but recommended for stronger retrieval:
# pip install -r requirements-optional.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Backend Endpoints
- `GET /health`
- `POST /ingest`
- `POST /query`
- `GET /runs`
- `GET /documents`

## Security notes
This scaffold now includes:
- filename sanitization
- unique stored upload names
- basic upload size enforcement
- extension allow-listing
- fallback execution paths when model providers are unavailable

You should still avoid exposing it to the public internet without adding:
- authentication
- rate limiting
- stricter CORS
- malware scanning for uploads
- PDF sandboxing or external parsing isolation

## Project Structure
```text
truststack_scaffold/
├── backend/
├── frontend/
├── docs/
├── sample_data/
└── README.md
```
