export type DocumentItem = {
  id: string
  filename: string
  uploaded_at: string
}

export type PresetSourceItem = {
  key: string
  filename: string
  label: string
  description: string
}

export type EvidenceItem = {
  source: string
  page?: number | null
  chunk_id: string
  score: number
  text: string
}

export type QueryResponse = {
  question: string
  answer: string
  citations: string[]
  evidence: EvidenceItem[]
  confidence_score: number
  risk_flags: string[]
  trust_summary: string
  insufficient_evidence: boolean
  explanation?: {
    overview: string
    teaching_points: string[]
    review_recommendation: string
    evidence_strength: string
    citation_coverage: string
    flagged_concerns: string[]
    strengths?: string[]
    weaknesses?: string[]
    failure_modes?: string[]
    recommended_followups?: string[]
  }
  evaluation?: {
    overall_score: number
    verdict: string
    summary: string
    strengths: string[]
    weaknesses: string[]
    failure_modes: string[]
    recommended_followups: string[]
    diagnostics: {
      top_hit_score: number
      avg_hit_score: number
      supporting_chunk_count: number
      source_count: number
      citation_match_ratio: number
      unsupported_claim_ratio: number
    }
    dimensions: Array<{
      key: string
      label: string
      weight: number
      score: number
      status: string
      rationale: string
      signals: string[]
    }>
    claims: Array<{
      claim: string
      status: string
      supporting_chunk_ids: string[]
      notes: string
    }>
  }
  run?: RunItem | null
}

export type RunItem = {
  id: string
  question: string
  answer: string
  confidence_score: number
  trust_summary: string
  risk_flags: string[]
  citations: string[]
  created_at: string
}

export type SampleQuestionItem = {
  question: string
  source?: string | null
  support_level?: 'supported' | 'weak'
}

export type StandardTestCategoryScore = {
  key: string
  label: string
  weight: number
  score: number
  verdict: string
  summary: string
}

export type StandardTestCaseResult = {
  id: string
  label: string
  category: string
  question: string
  score: number
  verdict: string
  trust_summary: string
  risk_flags: string[]
  citations: string[]
  evidence_count: number
  supported_claim_ratio?: number
  citation_alignment_ratio?: number
}

export type StandardTestMetadata = {
  suite_id: string
  generated_at: string
  suite_label: string
  document_count: number
  chunk_count: number
  source_filenames: string[]
  retrieval_backend: string
  embedding_provider: string
  embedding_model: string
  llm_provider: string
  llm_model: string
  top_k: number
  max_context_chunks: number
}

export type StandardTestRunResponse = {
  framework: {
    name: string
    version: string
    description: string
    score_range: string
    pass_threshold: number
    review_threshold: number
    dimensions: Array<{
      key: string
      label: string
      weight: number
      purpose: string
    }>
  }
  metadata: StandardTestMetadata
  final_score: number
  verdict: string
  summary: string
  score_breakdown: StandardTestCategoryScore[]
  cases: StandardTestCaseResult[]
  recommended_actions: string[]
}

export type StandardReportArtifactsResponse = {
  suite: StandardTestRunResponse
  executive_summary: string
  latex_category_table: string
  latex_case_table: string
  appendix_markdown: string
}
