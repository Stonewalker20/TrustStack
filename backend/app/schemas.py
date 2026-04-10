from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str


class IngestResponse(BaseModel):
    document_id: int
    filename: str
    num_chunks: int
    status: str


class QueryRequest(BaseModel):
    question: str = Field(min_length=3)
    top_k: int = 5


class EvidenceItem(BaseModel):
    source: str
    page: int | None = None
    chunk_id: str
    score: float
    text: str


class QueryResponse(BaseModel):
    question: str
    answer: str
    citations: list[str]
    evidence: list[EvidenceItem]
    confidence_score: float
    risk_flags: list[str]
    trust_summary: str
    insufficient_evidence: bool = False
    latency_ms: int | None = None


class RunItem(BaseModel):
    id: int
    question: str
    answer: str
    confidence_score: float
    trust_summary: str
    risk_flags: list[str]
    citations: list[str]
    created_at: str


class DocumentItem(BaseModel):
    id: int
    filename: str
    uploaded_at: str
