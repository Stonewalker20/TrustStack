export type DocumentItem = {
  id: number
  filename: string
  uploaded_at: string
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
}

export type RunItem = {
  id: number
  question: string
  answer: string
  confidence_score: number
  trust_summary: string
  risk_flags: string[]
  citations: string[]
  created_at: string
}
