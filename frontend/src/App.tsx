import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { AnswerCard } from './components/AnswerCard'
import { DocumentList } from './components/DocumentList'
import { EvidencePanel } from './components/EvidencePanel'
import { QueryBox } from './components/QueryBox'
import { RiskPanel } from './components/RiskPanel'
import { RunHistoryTable } from './components/RunHistoryTable'
import { UploadPanel } from './components/UploadPanel'
import { api } from './lib/api'
import type {
  DocumentItem,
  QueryResponse,
  RunItem,
  SampleQuestionItem,
  StandardReportArtifactsResponse,
  StandardTestRunResponse,
} from './types'

function SummaryMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  )
}

function WorkflowCard({
  step,
  title,
  body,
}: {
  step: string
  title: string
  body: string
}) {
  return (
    <article className="workflow-card">
      <div className="workflow-card__step">{step}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

function WorkflowStatus({
  documents,
  hasResult,
  hasSuiteResult,
}: {
  documents: number
  hasResult: boolean
  hasSuiteResult: boolean
}) {
  const steps = [
    {
      label: 'Step 1',
      title: 'Upload evidence',
      state: documents > 0 ? 'Complete' : 'Needed',
      helper: documents > 0 ? `${documents} source document${documents === 1 ? '' : 's'} ready` : 'Add at least one source document',
      complete: documents > 0,
    },
    {
      label: 'Step 2',
      title: 'Run grounded query',
      state: hasResult ? 'Complete' : documents > 0 ? 'Ready' : 'Blocked',
      helper: hasResult ? 'Latest result is available below' : documents > 0 ? 'You can ask a grounded question now' : 'Upload evidence first',
      complete: hasResult,
    },
    {
      label: 'Step 3',
      title: 'Review standard',
      state: hasSuiteResult ? 'Complete' : hasResult ? 'Ready' : 'Later',
      helper: hasSuiteResult ? 'Benchmark summary generated' : hasResult ? 'Run the standard after reviewing the answer' : 'Use this after a query run',
      complete: hasSuiteResult,
    },
  ]

  return (
    <section className="workflow-status content-card content-card--dense">
      <div className="content-card__header">
        <div>
          <div className="eyebrow">Workflow Status</div>
          <h2>What the user should do next</h2>
        </div>
      </div>
      <div className="workflow-status-grid">
        {steps.map((step) => (
          <article className={`workflow-status-card ${step.complete ? 'workflow-status-card--complete' : ''}`} key={step.title}>
            <span className="workflow-status-card__label">{step.label}</span>
            <h3>{step.title}</h3>
            <strong>{step.state}</strong>
            <p>{step.helper}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function InsightPanel({ result }: { result: QueryResponse | null }) {
  const evaluation = result?.evaluation
  const explanation = result?.explanation

  return (
    <section className="content-card content-card--dense">
      <div className="content-card__header">
        <div>
          <div className="eyebrow">Interpretation Layer</div>
          <h2>Why the system reached this judgment</h2>
        </div>
      </div>

      {!result ? (
        <p className="muted">
          TrustStack explains the answer in plain language, highlights weak support, and tells the user what should be
          reviewed before action is taken.
        </p>
      ) : (
        <div className="insight-grid">
          <div className="insight-card">
            <h3>Overview</h3>
            <p>{explanation?.overview ?? result.trust_summary}</p>
          </div>
          <div className="insight-card">
            <h3>Evidence Strength</h3>
            <p>{explanation?.evidence_strength ?? 'Evidence strength will appear after the next run.'}</p>
          </div>
          <div className="insight-card">
            <h3>Citation Coverage</h3>
            <p>{explanation?.citation_coverage ?? 'Citation coverage will appear after the next run.'}</p>
          </div>
          <div className="insight-card">
            <h3>Recommended Review</h3>
            <p>{explanation?.review_recommendation ?? 'TrustStack will recommend the next review step once a run completes.'}</p>
          </div>

          {evaluation ? (
            <div className="insight-card insight-card--wide">
              <div className="content-card__header content-card__header--compact">
                <div>
                  <div className="eyebrow">Score Breakdown</div>
                  <h3>{evaluation.overall_score}/100 overall trust score</h3>
                </div>
                <span className={`status-pill ${result.insufficient_evidence ? 'status-pill--warn' : 'status-pill--ok'}`}>
                  {evaluation.verdict}
                </span>
              </div>
              <div className="dimension-list">
                {evaluation.dimensions.map((dimension) => (
                  <div className="dimension-row" key={dimension.key}>
                    <div>
                      <strong>{dimension.label}</strong>
                      <p>{dimension.rationale}</p>
                    </div>
                    <div className="dimension-row__meter">
                      <div className="signal-bar">
                        <div className="signal-bar-fill" style={{ width: `${dimension.score}%` }} />
                      </div>
                      <span>{dimension.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {explanation?.teaching_points?.length ? (
            <div className="insight-card insight-card--wide">
              <h3>What the user should learn from this result</h3>
              <ul className="bullet-list">
                {explanation.teaching_points.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function StandardSuitePanel({
  suiteLoading,
  suiteResult,
  reportArtifacts,
  error,
  onRunSuite,
}: {
  suiteLoading: boolean
  suiteResult: StandardTestRunResponse | null
  reportArtifacts: StandardReportArtifactsResponse | null
  error: string
  onRunSuite: () => void
}) {
  return (
    <section className="content-card content-card--dense">
      <div className="content-card__header">
        <div>
          <div className="eyebrow">Standardized Evaluation</div>
          <h2>Run the full TrustStack benchmark and review the score breakdown</h2>
        </div>
        <button className="primary primary--glow" onClick={onRunSuite} disabled={suiteLoading}>
          {suiteLoading ? 'Running Standard…' : 'Run Standard'}
        </button>
      </div>

      <p className="muted">
        This standard consolidates grounded QA, citation traceability, contradiction resistance, calibration, and
        reporting quality into one reproducible evaluation pass.
      </p>
      {error ? <p className="muted muted--warning">{error}</p> : null}

      {suiteResult ? (
        <div className="suite-grid">
          <div className="suite-hero">
            <span>Final score</span>
            <strong>{suiteResult.final_score}</strong>
            <p>{suiteResult.summary}</p>
            <div className="pill-grid">
              <span className="data-pill">{suiteResult.verdict}</span>
              <span className="data-pill">{suiteResult.metadata.document_count} documents</span>
              <span className="data-pill">{suiteResult.metadata.chunk_count} chunks</span>
            </div>
          </div>

          <div className="suite-breakdown">
            {suiteResult.score_breakdown.map((category) => (
              <div className="dimension-row" key={category.key}>
                <div>
                  <strong>{category.label}</strong>
                  <p>{category.summary}</p>
                </div>
                <div className="dimension-row__meter">
                  <div className="signal-bar">
                    <div className="signal-bar-fill" style={{ width: `${category.score}%` }} />
                  </div>
                  <span>{category.score}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="insight-card">
            <h3>Recommended actions</h3>
            <ul className="bullet-list">
              {suiteResult.recommended_actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>

          <div className="insight-card">
            <h3>Report artifacts</h3>
            <p>
              {reportArtifacts?.executive_summary ??
                'Run the standard to generate report-ready category tables, case tables, and appendix content.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <strong>No standard run yet.</strong>
          <p>Use this section after ingesting evidence to create a final defensible score for analysis and reporting.</p>
        </div>
      )}
    </section>
  )
}

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [runs, setRuns] = useState<RunItem[]>([])
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [suiteLoading, setSuiteLoading] = useState(false)
  const [sampleQuestions, setSampleQuestions] = useState<SampleQuestionItem[]>([])
  const [suiteResult, setSuiteResult] = useState<StandardTestRunResponse | null>(null)
  const [reportArtifacts, setReportArtifacts] = useState<StandardReportArtifactsResponse | null>(null)
  const [queryError, setQueryError] = useState('')
  const [suiteError, setSuiteError] = useState('')
  const [backendIssues, setBackendIssues] = useState({
    documents: '',
    sampleQuestions: '',
    runs: '',
  })

  const backendError =
    backendIssues.documents || backendIssues.sampleQuestions || backendIssues.runs || ''

  const setBackendIssue = (channel: keyof typeof backendIssues, message: string) => {
    setBackendIssues((current) => {
      if (current[channel] === message) {
        return current
      }

      return {
        ...current,
        [channel]: message,
      }
    })
  }

  const refreshDocuments = async () => {
    try {
      const res = await api.get<DocumentItem[]>('/documents')
      setDocuments(res.data)
      setBackendIssue('documents', '')
    } catch (error) {
      console.error(error)
      if (isAxiosError<{ detail?: string }>(error)) {
        setBackendIssue(
          'documents',
          error.response?.data?.detail ?? 'Cannot reach the TrustStack backend. Start the API and verify the configured port.',
        )
      } else {
        setBackendIssue('documents', 'Cannot reach the TrustStack backend. Start the API and verify the configured port.')
      }
      throw error
    }
  }

  const refreshSampleQuestions = async () => {
    try {
      const res = await api.get<SampleQuestionItem[]>('/documents/sample-questions')
      setSampleQuestions(res.data)
      setBackendIssue('sampleQuestions', '')
    } catch (error) {
      console.error(error)
      if (isAxiosError<{ detail?: string }>(error)) {
        setBackendIssue(
          'sampleQuestions',
          error.response?.data?.detail ?? 'Cannot load sample prompts because the backend is unavailable.',
        )
      } else {
        setBackendIssue('sampleQuestions', 'Cannot load sample prompts because the backend is unavailable.')
      }
      throw error
    }
  }

  const refreshRuns = async () => {
    try {
      const res = await api.get<RunItem[]>('/runs')
      setRuns(res.data)
      setBackendIssue('runs', '')
    } catch (error) {
      console.error(error)
      if (isAxiosError<{ detail?: string }>(error)) {
        setBackendIssue(
          'runs',
          error.response?.data?.detail ?? 'Cannot load run history because the backend is unavailable.',
        )
      } else {
        setBackendIssue('runs', 'Cannot load run history because the backend is unavailable.')
      }
      throw error
    }
  }

  useEffect(() => {
    refreshDocuments().catch(console.error)
    refreshSampleQuestions().catch(console.error)
    refreshRuns().catch(console.error)
  }, [])

  const handleSubmit = async (question: string) => {
    const normalizedQuestion = question.trim()
    if (!normalizedQuestion) {
      setQueryError('Enter a grounded question before running the query.')
      return
    }

    setLoading(true)
    setQueryError('')
    try {
      const res = await api.post<QueryResponse>('/query', { question: normalizedQuestion, top_k: 5 })
      setResult(res.data)
      refreshRuns().catch(console.error)
    } catch (error) {
      console.error(error)
      if (isAxiosError<{ detail?: string }>(error)) {
        setQueryError(error.response?.data?.detail ?? 'Query failed')
      } else {
        setQueryError('Query failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRunSuite = async () => {
    setSuiteLoading(true)
    setSuiteError('')
    try {
      const artifacts = await api.post<StandardReportArtifactsResponse>('/evaluation/standard-run/report-artifacts')
      setReportArtifacts(artifacts.data)
      setSuiteResult(artifacts.data.suite)
    } catch (error) {
      console.error(error)
      if (isAxiosError<{ detail?: string }>(error)) {
        setSuiteError(error.response?.data?.detail ?? 'Standard evaluation failed')
      } else {
        setSuiteError('Standard evaluation failed')
      }
    } finally {
      setSuiteLoading(false)
    }
  }

  const trustSignals = useMemo(() => {
    if (!result) {
      return [
        { label: 'Grounding', value: 0 },
        { label: 'Traceability', value: 0 },
        { label: 'Calibration', value: 0 },
      ]
    }

    const confidence = result.confidence_score
    const penalty = Math.min(result.risk_flags.length * 8, 32)

    return [
      { label: 'Grounding', value: Math.max(25, confidence - (result.insufficient_evidence ? 18 : 8)) },
      { label: 'Traceability', value: Math.max(30, confidence - penalty / 2) },
      { label: 'Calibration', value: Math.max(22, confidence - penalty) },
    ]
  }, [result])

  const latestRun = runs[0] ?? null

  return (
    <div className="app-shell">
      <header className="landing-hero">
        <div className="landing-hero__copy">
          <div className="eyebrow">TrustStack</div>
          <h1>A user-centered trust interface for grounded AI evaluation.</h1>
          <p>
            TrustStack helps people move from raw model output to defensible decisions. Upload evidence, ask grounded
            questions, inspect support, and run a standardized evaluation without forcing users through a theatrical UI.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="primary primary--glow"
              onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Start Evaluating
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => document.getElementById('standard')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              View Standard
            </button>
          </div>
        </div>

        <div className="landing-hero__summary">
          <SummaryMetric label="Evidence store" value={`${documents.length}`} helper="Indexed source documents" />
          <SummaryMetric label="Latest score" value={result ? `${result.confidence_score}/100` : 'Not run'} helper="Current grounded evaluation" />
          <SummaryMetric label="Tracked runs" value={`${runs.length}`} helper="Saved evaluation history" />
          <SummaryMetric
            label="Standard suite"
            value={suiteResult ? `${suiteResult.final_score}/100` : 'Pending'}
            helper="Aggregate benchmark score"
          />
        </div>
      </header>

      <section className="workflow-strip">
        <WorkflowCard
          step="01"
          title="Ground the model in evidence"
          body="Users start with source documents rather than answers, which keeps TrustStack centered on verifiable support."
        />
        <WorkflowCard
          step="02"
          title="Expose why the answer should be trusted"
          body="The interface makes citations, evidence strength, and review recommendations visible in the same place as the answer."
        />
        <WorkflowCard
          step="03"
          title="Summarize risk with a formal standard"
          body="TrustStack converts individual runs into a repeatable score breakdown that can be compared, reported, and defended."
        />
      </section>

      <main className="workspace" id="workspace">
        {backendError ? (
          <section className="content-card content-card--dense">
            <div className="content-card__header">
              <div>
                <div className="eyebrow">Backend Status</div>
                <h2>API connection problem</h2>
              </div>
            </div>
            <p className="muted">{backendError}</p>
          </section>
        ) : null}

        <WorkflowStatus documents={documents.length} hasResult={Boolean(result)} hasSuiteResult={Boolean(suiteResult)} />

        <section className="workspace-grid workspace-grid--primary">
          <div className="workspace-column">
            <div className="section-copy">
              <div className="eyebrow">Step One</div>
              <h2>Prepare the evidence base</h2>
              <p>
                A user-centric evaluation flow starts by making source ingestion understandable. The interface keeps the
                evidence store visible so users know what the model is allowed to rely on.
              </p>
            </div>
            <UploadPanel
              onUploaded={() => {
                refreshDocuments().catch(console.error)
                refreshSampleQuestions().catch(console.error)
              }}
            />
            <DocumentList items={documents} />
          </div>

          <div className="workspace-column workspace-column--wide">
            <div className="section-copy">
              <div className="eyebrow">Step Two</div>
              <h2>Run a grounded evaluation</h2>
              <p>
                Suggested prompts help the user start from the available evidence. The interface favors clarity over
                novelty by keeping the query, answer, support, and explanation adjacent.
              </p>
            </div>
            <QueryBox onSubmit={handleSubmit} loading={loading} sampleQuestions={sampleQuestions} error={queryError} />
            <AnswerCard result={result} />
            <InsightPanel result={result} />
          </div>

          <div className="workspace-column">
            <div className="section-copy">
              <div className="eyebrow">Step Three</div>
              <h2>Review trust posture and supporting context</h2>
              <p>
                Users need the risk story and the evidence story together. This column keeps the confidence state, flags,
                and retrieval context visible without sending the user to another page.
              </p>
            </div>
            <RiskPanel result={result} />
            <div className="content-card content-card--dense">
              <div className="content-card__header">
                <div>
                  <div className="eyebrow">Quick Signals</div>
                  <h2>Current evaluation posture</h2>
                </div>
              </div>
              {trustSignals.map((signal) => (
                <div className="signal-row" key={signal.label}>
                  <span>{signal.label}</span>
                  <div className="signal-bar">
                    <div className="signal-bar-fill" style={{ width: `${signal.value}%` }} />
                  </div>
                  <strong>{signal.value}</strong>
                </div>
              ))}
              <div className="framework-note">
                {result ? result.trust_summary : 'Run a query to populate the trust posture and supporting diagnostics.'}
              </div>
            </div>
            <div className="content-card content-card--dense">
              <div className="content-card__header">
                <div>
                  <div className="eyebrow">Latest Run</div>
                  <h2>Most recent evaluation summary</h2>
                </div>
              </div>
              {latestRun ? (
                <div className="insight-card">
                  <h3>{latestRun.question}</h3>
                  <p>{latestRun.trust_summary}</p>
                  <small>{new Date(latestRun.created_at).toLocaleString()}</small>
                </div>
              ) : (
                <div className="empty-state">
                  <strong>No runs yet.</strong>
                  <p>The latest evaluation snapshot will appear here after the first grounded query is submitted.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="workspace-grid workspace-grid--secondary">
          <div className="workspace-column workspace-column--wide">
            <EvidencePanel result={result} />
          </div>
          <div className="workspace-column">
            <RunHistoryTable items={runs} />
          </div>
        </section>

        <section id="standard">
          <StandardSuitePanel
            suiteLoading={suiteLoading}
            suiteResult={suiteResult}
            reportArtifacts={reportArtifacts}
            error={suiteError}
            onRunSuite={handleRunSuite}
          />
        </section>
      </main>
    </div>
  )
}
