# TrustStack Security Threat Analysis

## Scope
This analysis covers the current TrustStack MVP scaffold as a local or small private-network application that ingests files, indexes their contents, and answers questions over retrieved evidence.

## System surfaces
- file upload endpoint (`POST /ingest`)
- query endpoint (`POST /query`)
- local file storage for uploads
- SQLite persistence
- vector index persistence
- model provider connections (Ollama or OpenAI-compatible)
- browser-to-backend API access

## Threat model assumptions
- primary use is local development or class demo
- no authentication is currently implemented
- users may upload malformed or adversarial files
- prompt injection is possible inside uploaded documents
- if exposed beyond localhost, abuse risk rises sharply

## High-risk findings

### 1. Unauthenticated API access
**Risk:** Anyone with network access can upload documents, query indexed content, and inspect run history.

**Impact:** Confidential document exposure, index poisoning, storage abuse.

**Status:** Not remediated in scaffold.

**Recommended fix:**
- add API key or session auth before any non-health endpoint
- restrict backend bind address to localhost during demos
- do not expose publicly without auth

### 2. Prompt injection from uploaded documents
**Risk:** A document can contain instructions like “ignore previous rules” or “leak hidden data.”

**Impact:** LLM may follow document instructions instead of application policy.

**Status:** Partially mitigated by system prompt and fallback extractive mode, but not solved.

**Recommended fix:**
- wrap retrieved evidence as quoted source material
- add a verifier pass that checks whether final answer is supported by citations
- strip or flag imperative instruction patterns in retrieved chunks

### 3. Unsafe file parsing
**Risk:** PDFs and DOCX files can be malformed, oversized, or parser-hostile.

**Impact:** denial of service, parser crashes, resource exhaustion.

**Status:** Basic size cap and extension allow-list are present. No sandboxing.

**Recommended fix:**
- parse uploads in an isolated worker process
- add timeout and memory limits
- add malware scanning for non-local deployments

### 4. Open CORS policy
**Risk:** Any browser origin can call the backend.

**Impact:** If the backend is network-accessible, cross-origin abuse is possible.

**Status:** Not remediated in scaffold.

**Recommended fix:**
- set explicit frontend origin instead of `*`
- disable permissive CORS outside local development

## Medium-risk findings

### 5. Upload path abuse / filename attacks
**Risk:** User-supplied filenames may attempt path traversal or collision.

**Impact:** overwrite or escape upload directory.

**Status:** Remediated in current scaffold with basename stripping, filename sanitization, and unique stored names.

### 6. Storage exhaustion
**Risk:** Repeated uploads and large indexes consume disk.

**Impact:** local denial of service.

**Status:** Partial mitigation via size cap.

**Recommended fix:**
- add total storage quota
- add document deletion endpoint
- rotate old run logs

### 7. Sensitive data in logs and run history
**Risk:** Questions, answers, citations, and document names are persisted.

**Impact:** local privacy leakage.

**Status:** Not remediated.

**Recommended fix:**
- add a privacy mode to disable persistence
- redact secrets and IDs before storing
- encrypt local persistence if used with real data

### 8. Model endpoint trust boundary
**Risk:** When using external or networked model providers, sensitive context leaves the app.

**Impact:** confidentiality risk.

**Status:** Depends on configuration.

**Recommended fix:**
- prefer local Ollama for sensitive demos
- document data-flow clearly
- allow per-provider warnings in UI

## Low-risk findings

### 9. Query abuse / resource-heavy prompts
**Risk:** Very long prompts or repeated queries can degrade performance.

**Impact:** slow responses, local resource strain.

**Recommended fix:**
- add query length cap
- add basic rate limiting
- cap `top_k` on the backend

### 10. Dependency availability risk
**Risk:** Optional packages such as ChromaDB or sentence-transformers may fail to install in constrained environments.

**Impact:** app fails before demo.

**Status:** Improved. The scaffold now has a simple vector store fallback and lexical embedding fallback.

## Current hardening already applied
- filename sanitization
- unique stored upload names
- upload extension allow-list
- upload size limit
- graceful fallback when Ollama, ChromaDB, or sentence-transformers are unavailable
- fallback answer mode that stays evidence-bounded

## Priority remediation order
1. add authentication
2. restrict CORS
3. isolate document parsing
4. add rate limiting and query caps
5. add document deletion and storage quotas
6. add verifier-based groundedness check

## Secure demo guidance
For class/demo use:
- run on localhost only
- use local Ollama models
- avoid real confidential documents
- clear the uploads and local DB after demo
- keep the fallback mode available in case Ollama is unavailable
