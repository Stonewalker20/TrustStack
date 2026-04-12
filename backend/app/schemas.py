from pydantic import BaseModel, Field, field_validator


class HealthResponse(BaseModel):
    status: str


class IngestResponse(BaseModel):
    document_id: str
    filename: str
    num_chunks: int
    status: str


class QueryRequest(BaseModel):
    question: str = Field(min_length=3)
    top_k: int = Field(default=5, ge=1, le=20)

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("Question must be at least 3 non-space characters.")
        return normalized


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


class EvaluationFrameworkDimension(BaseModel):
    key: str
    label: str
    weight: float
    purpose: str


class EvaluationFramework(BaseModel):
    name: str
    version: str
    description: str
    score_range: str
    pass_threshold: float
    review_threshold: float
    dimensions: list[EvaluationFrameworkDimension]


class EvaluationDimension(BaseModel):
    key: str
    label: str
    weight: float
    score: float
    status: str
    rationale: str
    signals: list[str]
    subscore_inputs: dict[str, str | float | int | bool] | None = None
    penalties: list[str] = []
    passed_checks: list[str] = []


class EvaluationCheck(BaseModel):
    key: str
    label: str
    status: str
    detail: str
    severity: str = "info"
    metric_value: str | float | int | None = None
    threshold: str | float | int | None = None


class ClaimAssessment(BaseModel):
    claim: str
    status: str
    supporting_chunk_ids: list[str]
    notes: str


class EvidenceDiagnostics(BaseModel):
    top_hit_score: float
    avg_hit_score: float
    supporting_chunk_count: int
    source_count: int
    citation_match_ratio: float
    unsupported_claim_ratio: float


class EvaluationReport(BaseModel):
    framework: EvaluationFramework
    overall_score: float
    verdict: str
    summary: str
    teaching_points: list[str]
    next_step: str
    dimensions: list[EvaluationDimension]
    checks: list[EvaluationCheck]
    diagnostics: EvidenceDiagnostics
    claims: list[ClaimAssessment]
    strengths: list[str]
    weaknesses: list[str]
    failure_modes: list[str]
    recommended_followups: list[str]


class QueryExplanation(BaseModel):
    overview: str
    teaching_points: list[str]
    review_recommendation: str
    score_breakdown: list[ExplanationFactor]
    evidence_strength: str
    citation_coverage: str
    flagged_concerns: list[str]
    strengths: list[str] = []
    weaknesses: list[str] = []
    failure_modes: list[str] = []
    recommended_followups: list[str] = []


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
    evaluation: EvaluationReport
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
    evaluation: EvaluationReport | None = None


class DocumentItem(BaseModel):
    id: str
    filename: str
    uploaded_at: str


class SampleQuestionItem(BaseModel):
    question: str
    source: str | None = None


class StandardTestCaseResult(BaseModel):
    id: str
    label: str
    category: str
    question: str
    score: float
    verdict: str
    trust_summary: str
    risk_flags: list[str]
    citations: list[str]
    evidence_count: int


class StandardTestCategoryScore(BaseModel):
    key: str
    label: str
    weight: float
    score: float
    verdict: str
    summary: str


class StandardTestRunResponse(BaseModel):
    framework: EvaluationFramework
    final_score: float
    verdict: str
    summary: str
    score_breakdown: list[StandardTestCategoryScore]
    cases: list[StandardTestCaseResult]
    recommended_actions: list[str]
