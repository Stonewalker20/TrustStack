from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str


class IngestResponse(BaseModel):
    document_id: str
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


class ExplanationFactor(BaseModel):
    label: str
    value: float
    detail: str


class QueryExplanation(BaseModel):
    overview: str
    teaching_points: list[str]
    review_recommendation: str
    score_breakdown: list[ExplanationFactor]
    evidence_strength: str
    citation_coverage: str
    flagged_concerns: list[str]


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
    explanation: QueryExplanation


class RunItem(BaseModel):
    id: str
    question: str
    answer: str
    confidence_score: float
    trust_summary: str
    risk_flags: list[str]
    citations: list[str]
    created_at: str


class DocumentItem(BaseModel):
    id: str
    filename: str
    uploaded_at: str
