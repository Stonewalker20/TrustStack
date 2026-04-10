# TrustStack — One-Day Build Roadmap

## Objective

Build a working **TrustStack MVP** in one day: a full-stack system that accepts a user query plus source documents, retrieves evidence, generates an answer, scores reliability, flags risk, and displays results in a dashboard.

By end of day, your MVP should be able to:

1. ingest a small set of domain documents,
2. answer grounded questions over them,
3. show retrieved evidence,
4. compute simple trust/reliability signals,
5. expose everything through a clean web UI,
6. support a short live demo and class presentation.

---

# 1. Scope Control

## What to build today

Build the **smallest version that still looks like a serious 2026 AI systems project**.

### In scope
- Web UI
- FastAPI backend
- Document ingestion
- Chunking + embeddings + vector search
- RAG answer generation
- Reliability scoring
- Basic policy/risk checks
- Persistent storage for runs
- Demo-ready dashboard

### Out of scope for today
- Multi-agent orchestration
- Fine-tuning
- Distributed inference
- Complex auth
- Multi-tenant architecture
- Large-scale deployment
- Real-time sensor streams
- Full observability stack
- Production-grade CI/CD

If time remains, add one stretch feature only.

---

# 2. MVP Definition

## User flow

1. User uploads maintenance manuals / SOPs / service notes / policy docs.
2. System indexes the documents.
3. User asks a question like:
   - "What is the likely cause of this HVAC fault code?"
   - "What steps should be taken first?"
   - "What source supports the recommendation?"
4. Backend retrieves top-k chunks.
5. LLM generates an answer constrained to the retrieved evidence.
6. Reliability engine computes:
   - retrieval coverage,
   - citation presence,
   - contradiction/risk heuristics,
   - confidence score.
7. Frontend displays:
   - final answer,
   - evidence snippets,
   - confidence/risk indicators,
   - run metadata.

## MVP success criteria

By tonight you should be able to demo:

- uploading at least 3–10 documents,
- asking 5–10 domain questions,
- seeing grounded answers with citations/snippets,
- seeing a confidence/risk panel,
- comparing at least one “good” response vs one “bad/unsupported” response.

---

# 3. Recommended Architecture

## High-level stack

- **Frontend:** React + Vite + Tailwind
- **Backend:** FastAPI
- **Embeddings:** sentence-transformers or OpenAI embeddings
- **Vector store:** FAISS or Chroma
- **LLM:** OpenAI-compatible API or Ollama local model
- **Database:** SQLite for today
- **ORM:** SQLAlchemy
- **Document parsing:** pypdf / python-docx / plain text
- **Evaluation:** custom trust metrics + optional RAGAS-like heuristics

## Recommended pragmatic choices for one-day build

### Best speed path
- React + Vite frontend
- FastAPI backend
- ChromaDB
- OpenAI API or OpenRouter
- SQLite
- sentence-transformers optional fallback

### Best low-cost/local path
- React + Vite frontend
- FastAPI backend
- ChromaDB
- Ollama with a small instruct model
- local embedding model via sentence-transformers

If you already have API credits, use hosted APIs first. They are faster to get working.

---

# 4. Project Folder Structure

```text
truststack/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   ├── health.py
│   │   │   ├── ingest.py
│   │   │   ├── query.py
│   │   │   └── runs.py
│   │   ├── services/
│   │   │   ├── parser.py
│   │   │   ├── chunker.py
│   │   │   ├── embeddings.py
│   │   │   ├── vector_store.py
│   │   │   ├── llm.py
│   │   │   ├── rag.py
│   │   │   ├── scorer.py
│   │   │   └── risk.py
│   │   └── utils/
│   │       └── logging.py
│   ├── data/
│   │   ├── uploads/
│   │   └── chroma/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── types/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── architecture.png
│   ├── screenshots/
│   └── report_notes.md
├── sample_data/
│   ├── hvac_manual_1.pdf
│   ├── maintenance_sop.pdf
│   └── service_log.txt
├── README.md
└── roadmap.md
```

---

# 5. Feature Breakdown

## Feature 1 — Document ingestion
Support:
- PDF
- TXT
- optionally DOCX

Output:
- parsed raw text
- metadata: filename, page number, chunk index

## Feature 2 — Chunking
Split documents into manageable units:
- chunk size: 500–900 tokens equivalent
- overlap: 100–150 tokens equivalent

Track:
- document id
- source file
- page or section
- chunk text

## Feature 3 — Embeddings + retrieval
Store chunk embeddings in Chroma or FAISS.

At query time:
- embed query,
- retrieve top-k chunks,
- return scores.

## Feature 4 — RAG answering
Prompt the model to answer only from retrieved context.

Prompt constraints:
- do not invent facts,
- say when evidence is insufficient,
- cite chunk ids or filenames.

## Feature 5 — Reliability scoring
Compute:
- retrieval score,
- citation coverage,
- evidence sufficiency,
- unsupported-claim heuristic,
- answer length sanity check,
- final confidence score.

## Feature 6 — Risk / compliance flags
Flag when:
- answer says “I am certain” but evidence is weak,
- no citation/evidence shown,
- retrieved chunks have low similarity,
- answer contains operational instructions unsupported by sources,
- answer appears to extrapolate beyond documents.

## Feature 7 — Dashboard
Show:
- user question,
- final answer,
- confidence score,
- risk flags,
- retrieved evidence cards,
- run history.

---

# 6. One-Day Build Schedule

## Phase 0 — Environment setup (30–45 min)

### Tasks
- Create project root
- Create backend and frontend folders
- Initialize Git
- Create Python venv
- Install dependencies
- Initialize React app
- Create `.env` file
- Verify API key/local model works

### Commands

#### Backend
```bash
mkdir truststack && cd truststack
mkdir backend frontend docs sample_data
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn python-multipart sqlalchemy pydantic pydantic-settings chromadb sentence-transformers pypdf httpx python-dotenv
pip freeze > requirements.txt
```

#### Frontend
```bash
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install
npm install axios tailwindcss @tailwindcss/vite
```

### Deliverable
- clean repo created
- backend starts
- frontend starts
- `.gitignore` added

---

## Phase 1 — Backend skeleton (45 min)

### Tasks
Create:
- FastAPI app
- health route
- config loader
- database connection
- basic schemas

### Endpoints to add now
- `GET /health`
- `POST /ingest`
- `POST /query`
- `GET /runs`

### Deliverable
You can run:
```bash
uvicorn app.main:app --reload
```
and hit `/docs`.

---

## Phase 2 — Document ingestion pipeline (60–90 min)

### Tasks
Build:
- file upload endpoint
- parser for PDF/TXT
- chunking service
- vector store insert

### Minimal ingestion flow
1. upload file
2. save file locally
3. parse text
4. split into chunks
5. embed chunks
6. store in vector db
7. persist metadata in SQLite

### Data model suggestion

#### Document table
- id
- filename
- file_path
- uploaded_at

#### Chunk table
- id
- document_id
- chunk_index
- page_num
- text
- created_at

### Deliverable
Upload a PDF/TXT and confirm chunks appear in the vector store.

---

## Phase 3 — Retrieval + grounded answering (60–90 min)

### Tasks
Build query pipeline:
1. embed query
2. retrieve top-k chunks
3. construct context window
4. send prompt to LLM
5. return answer + evidence

### Suggested prompt template

```text
You are TrustStack, a reliability-aware AI assistant.

Answer the user's question using only the provided context.
If the context is insufficient, say so clearly.
Do not fabricate procedures, numbers, causes, or policies.
Reference the supporting chunk ids or filenames when possible.

User question:
{question}

Retrieved context:
{context}

Return:
1. concise answer
2. cited evidence references
3. note if evidence is insufficient
```

### Deliverable
Backend returns:
```json
{
  "answer": "...",
  "citations": ["manual.pdf#chunk_12", "sop.pdf#chunk_4"],
  "evidence": [...],
  "insufficient_evidence": false
}
```

---

## Phase 4 — Trust scoring engine (60 min)

This is what makes the project distinctive.

## Reliability signals to implement today

### Signal A — Retrieval strength
Use average similarity score of top-k chunks.

Example:
- high if average > threshold_high
- medium if between thresholds
- low otherwise

### Signal B — Evidence count
How many chunks were retrieved above a relevance threshold?

### Signal C — Citation presence
Did the model include references to source documents/chunks?

### Signal D — Unsupported-answer heuristic
If answer is long/specific but retrieval is weak, flag it.

### Signal E — Insufficient evidence honesty
If evidence is weak but answer still looks definitive, flag it.

## Confidence score formula

Start simple:

```text
confidence = 0.35 * retrieval_strength
           + 0.20 * evidence_count_score
           + 0.20 * citation_score
           + 0.15 * answer_groundedness_score
           + 0.10 * honesty_score
```

Normalize to 0–100.

## Risk flags
Return a list like:
- `LOW_RETRIEVAL_SUPPORT`
- `NO_CITATIONS`
- `POSSIBLE_HALLUCINATION`
- `INSUFFICIENT_EVIDENCE`
- `OPERATIONAL_ADVICE_REQUIRES_HUMAN_REVIEW`

### Deliverable
Query response now includes:
```json
{
  "confidence_score": 72,
  "risk_flags": ["NO_CITATIONS"],
  "trust_summary": "Moderate confidence. Relevant evidence was found, but citation coverage is weak."
}
```

---

## Phase 5 — Frontend dashboard (90–120 min)

## Views to build

### Page 1 — Upload / index documents
- drag-and-drop upload
- upload status
- list of indexed docs

### Page 2 — Ask a question
- question input
- submit button
- optional domain selector later

### Page 3 — Results panel
Display:
- final answer
- confidence score badge
- trust summary
- risk flags
- evidence cards
- raw retrieved chunks (collapsible)

### Page 4 — Run history
Table with:
- timestamp
- question
- confidence
- risk count

## UI layout recommendation
Single-page dashboard with panels:
- left sidebar: documents + run history
- center: query input + answer
- right: trust/risk panel and evidence

### Deliverable
Frontend is demo-friendly and visually clean.

---

## Phase 6 — Persistence and logging (30–45 min)

## Save each query run
Create a `Run` table:

- id
- question
- answer
- confidence_score
- trust_summary
- risk_flags_json
- created_at

Optional:
- retrieved_chunk_ids_json
- model_name
- latency_ms

### Deliverable
You can show a history of past runs in the UI.

---

## Phase 7 — Evaluation set and testing (45–60 min)

This is essential for the report and presentation.

## Build a tiny evaluation dataset
Create a JSON or CSV file with 10–20 examples.

Fields:
- question
- expected_support_doc
- answerable (true/false)
- gold_short_answer
- notes

### Example cases
- 5 answerable grounded questions
- 3 ambiguous questions
- 2 unanswerable questions
- 2 adversarial or weakly supported questions

## What to measure
For each question:
- retrieved correct doc? yes/no
- answer grounded? yes/no
- cited evidence? yes/no
- confidence aligned with correctness? yes/no
- risk flag appropriate? yes/no

### Deliverable
A small benchmark table for your report.

---

## Phase 8 — Demo preparation (45 min)

## Prepare 3 demo scenarios

### Demo A — Strong grounded answer
- clear question
- strong supporting evidence
- high confidence

### Demo B — Weak evidence
- ambiguous question
- moderate/low confidence
- visible warning flags

### Demo C — Unanswerable or unsafe
- no relevant support
- system refuses to overclaim
- highlights insufficient evidence

## Capture screenshots
Take screenshots of:
- upload page
- successful query
- low-confidence query
- run history
- architecture diagram if available

### Deliverable
You are presentation-ready.

---

# 7. Core Backend Components to Implement

## A. `parser.py`
Responsibilities:
- detect file type
- extract text from PDF/TXT/DOCX
- preserve page structure when possible

## B. `chunker.py`
Responsibilities:
- split text into chunks
- maintain metadata
- apply overlap

## C. `embeddings.py`
Responsibilities:
- load embedding model or call API
- convert text/query into vectors

## D. `vector_store.py`
Responsibilities:
- initialize Chroma/FAISS
- upsert chunks
- retrieve top-k

## E. `llm.py`
Responsibilities:
- wrap model call
- standardize prompt I/O
- return answer text and metadata

## F. `rag.py`
Responsibilities:
- orchestrate retrieval + prompt + response packaging

## G. `scorer.py`
Responsibilities:
- compute confidence
- aggregate trust signals

## H. `risk.py`
Responsibilities:
- generate flags and trust summary

---

# 8. API Design

## `POST /ingest`
### Request
multipart file upload

### Response
```json
{
  "document_id": 1,
  "filename": "hvac_manual.pdf",
  "num_chunks": 42,
  "status": "indexed"
}
```

## `POST /query`
### Request
```json
{
  "question": "What should be checked first for condenser fan failure?",
  "top_k": 5
}
```

### Response
```json
{
  "question": "What should be checked first for condenser fan failure?",
  "answer": "The manual suggests verifying power supply and inspecting the fan motor wiring before replacement.",
  "citations": ["hvac_manual.pdf#p12#c4"],
  "evidence": [
    {
      "source": "hvac_manual.pdf",
      "page": 12,
      "chunk_id": "c4",
      "score": 0.88,
      "text": "..."
    }
  ],
  "confidence_score": 84,
  "risk_flags": [],
  "trust_summary": "High confidence. The answer is directly supported by multiple relevant chunks."
}
```

## `GET /runs`
Returns query history for the dashboard.

---

# 9. Database Schema

## documents
- id
- filename
- file_path
- uploaded_at

## chunks
- id
- document_id
- chunk_index
- page_num
- text
- created_at

## runs
- id
- question
- answer
- confidence_score
- trust_summary
- risk_flags_json
- citations_json
- created_at

---

# 10. Frontend Component Plan

## Components
- `UploadPanel`
- `DocumentList`
- `QueryBox`
- `AnswerCard`
- `ConfidenceGauge`
- `RiskFlags`
- `EvidencePanel`
- `RunHistoryTable`

## Suggested page assembly
- `App.tsx`
  - left column: docs + runs
  - center: query + answer
  - right column: trust + evidence

---

# 11. Practical Prompting Strategy

## System prompt
Emphasize:
- evidence-bounded answering
- explicit uncertainty
- no fabrication
- operational caution

## Add post-processing rules
If model output:
- lacks citations,
- makes confident claims with weak evidence,
- ignores insufficient context,

then downgrade confidence and add flags.

This lets your system look more intelligent even with simple heuristics.

---

# 12. Minimal Evaluation Logic

You do not need fancy benchmarks today.

## Use this manual rubric for 10–20 queries
Score each run on:
- Retrieval relevance: 0/1
- Grounded answer: 0/1
- Evidence shown: 0/1
- Confidence appropriate: 0/1
- Risk flag appropriate: 0/1

Total out of 5.

Then summarize:
- average score,
- strongest cases,
- failure modes.

This becomes report material immediately.

---

# 13. Git Commit Roadmap

Use clean commits throughout the day.

## Suggested sequence
1. `init repo with frontend and backend skeleton`
2. `add fastapi app config and health route`
3. `implement document upload and parsing`
4. `add chunking and vector indexing pipeline`
5. `implement retrieval and rag answering endpoint`
6. `add trust scoring and risk flag engine`
7. `build frontend upload and query dashboard`
8. `persist runs and add history table`
9. `add evaluation dataset and baseline tests`
10. `update readme with setup architecture and demo`

This helps your GitHub progress grade.

---

# 14. README Structure

Your README should contain:

## Sections
- Project title
- Problem statement
- Why this matters in 2026
- System architecture
- Features
- Tech stack
- Setup instructions
- How to run
- Example workflow
- Evaluation approach
- Limitations
- Future work
- Citations / acknowledgements

---

# 15. Report Structure

Use the same project artifacts to feed the report.

## Suggested framing
### Title
**TrustStack: Reliability Monitoring for Retrieval-Augmented AI Workflows**

### Abstract
One paragraph:
- problem,
- method,
- result,
- contribution.

### Introduction
Discuss:
- growth of agentic AI,
- need for grounded reliability,
- why trust and observability matter.

### Related Work
Mention:
- RAG systems,
- LLM evaluation,
- hallucination detection,
- AI governance/reliability.

### Data
Describe your uploaded manuals/SOPs/service docs.

### Methods
Explain:
- ingestion,
- chunking,
- embeddings,
- retrieval,
- generation,
- scoring,
- risk flags.

### Results
Show:
- sample outputs,
- confidence behavior,
- benchmark table,
- qualitative failures.

### Conclusion
Summarize MVP, limitations, and next steps.

---

# 16. Demo Script

## 2–3 minute demo flow

### Part 1 — Ingestion
Upload 2–3 maintenance/policy documents.

### Part 2 — Strong query
Ask a direct question with clear evidence.
Show:
- answer,
- evidence,
- high confidence.

### Part 3 — Weak query
Ask something vague or unsupported.
Show:
- warning flags,
- lower confidence,
- insufficient evidence behavior.

### Part 4 — Value proposition
Explain:
“This is not just answering questions. It is evaluating whether the AI should be trusted.”

That is the key message.

---

# 17. Stretch Features If You Finish Early

Only do these after MVP works.

## Option A — Compare two models
Run the same query through:
- hosted model,
- local model,
and compare confidence and outputs.

## Option B — Add verifier pass
Use a second LLM call to judge whether the answer is supported by evidence.

## Option C — Add domain modes
Modes:
- maintenance
- compliance
- SOP / safety

## Option D — Add citation highlighting
Click evidence card to highlight supporting snippet.

## Option E — Add local/offline mode
Use Ollama to show edge or privacy-conscious deployment.

---

# 18. Risks You Need to Avoid Today

## Risk 1 — Overbuilding
Do not try to make this multi-agent today.

## Risk 2 — Fancy UI before backend works
Backend retrieval and scoring first.

## Risk 3 — Poor demo dataset
Choose documents where answers can be grounded clearly.

## Risk 4 — Weak project framing
Do not pitch it as “just a chatbot.”
Pitch it as:
**a reliability and trust layer for AI systems**.

## Risk 5 — No evaluation
Even a small manual evaluation is much better than none.

---

# 19. Exact Order I Recommend Today

## Morning
1. Create repo and environment
2. Build FastAPI skeleton
3. Build ingestion pipeline
4. Verify vector indexing

## Early afternoon
5. Build retrieval + answer endpoint
6. Build trust scoring and flags
7. Save runs to SQLite

## Late afternoon
8. Build frontend dashboard
9. Connect upload/query/history APIs
10. Run 10–20 test questions

## Evening
11. Capture screenshots
12. Write README
13. Create presentation/demo outline
14. Clean repo and commit final state

---

# 20. Deliverables Checklist

## Must-have by end of day
- [ ] public GitHub repo
- [ ] working FastAPI backend
- [ ] working React frontend
- [ ] document upload and indexing
- [ ] grounded query answering
- [ ] trust/confidence scoring
- [ ] risk flags
- [ ] run history
- [ ] sample evaluation set
- [ ] README with setup and screenshots

## Nice-to-have
- [ ] model comparison
- [ ] verifier pass
- [ ] local inference mode
- [ ] better charts
- [ ] architecture figure

---

# 21. Tomorrow/Next Iteration Plan

Once the MVP works, next improvements should be:

1. add verifier model or self-checking step,
2. improve scoring with better groundedness evaluation,
3. add user feedback labels,
4. support more document formats,
5. add side-by-side model comparisons,
6. improve charts and analytics,
7. package for deployment.

---

# 22. Final Positioning Statement

When presenting this project, describe it as:

> TrustStack is a full-stack reliability layer for retrieval-augmented and agentic AI systems. It does not only generate answers; it measures evidence quality, confidence, and risk so users can decide when an AI output is trustworthy.

That positioning is stronger than calling it a chatbot, assistant, or QA app.

---

# 23. Recommended First Build Tasks Right Now

Start in this exact order:

```text
1. Initialize repo and install backend/frontend dependencies
2. Create FastAPI app with /health, /ingest, /query, /runs
3. Implement PDF/TXT parsing
4. Implement chunking and Chroma indexing
5. Implement query retrieval
6. Add LLM answer generation
7. Add confidence + risk scoring
8. Build basic React dashboard
9. Connect upload/query/history APIs
10. Test with 10 questions and save screenshots
```

If you stay disciplined on scope, this is realistic for a one-day MVP.

