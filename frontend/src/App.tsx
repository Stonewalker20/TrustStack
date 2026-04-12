import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnswerCard } from './components/AnswerCard'
import { DocumentList } from './components/DocumentList'
import { EvidencePanel } from './components/EvidencePanel'
import { FrameworkExplorer } from './components/FrameworkExplorer'
import { MethodologySection } from './components/MethodologySection'
import { QueryBox } from './components/QueryBox'
import { ResultsSection } from './components/ResultsSection'
import { RiskPanel } from './components/RiskPanel'
import { RunHistoryTable } from './components/RunHistoryTable'
import { TrustHero } from './components/TrustHero'
import { UploadPanel } from './components/UploadPanel'
import { api } from './lib/api'
import type {
  DocumentItem,
  QueryResponse,
  RunItem,
  SampleQuestionItem,
  StandardTestRunResponse,
} from './types'

type PlanetSlide = {
  id: string
  subsystem: string
  planet: string
  title: string
  summary: string
  reportSection: string
  reportFigureCaption: string
}

const PLANET_SLIDES: PlanetSlide[] = [
  {
    id: 'intro-mercury',
    subsystem: 'Evidence Intake',
    planet: 'Mercury',
    title: 'Problem framing and corpus intake',
    summary: 'Mercury introduces the evidence-first premise of TrustStack: ingest source material, normalize it, and make every later score traceable to a real corpus.',
    reportSection: 'Problem Statement and Evidence Intake',
    reportFigureCaption: 'Evidence ingestion flow used to ground the TrustStack evaluation stack.',
  },
  {
    id: 'design-venus',
    subsystem: 'Evaluation Architecture',
    planet: 'Venus',
    title: 'TrustStack evaluation architecture',
    summary: 'Venus presents the system design: indexing, retrieval, scoring, risk labeling, explanation generation, and operator-facing review layers.',
    reportSection: 'System Architecture',
    reportFigureCaption: 'Evaluation architecture slide showing the layered TrustStack pipeline.',
  },
  {
    id: 'query-earth',
    subsystem: 'Live Evaluation',
    planet: 'Earth',
    title: 'Live evidence-grounded querying',
    summary: 'Earth demonstrates the runtime loop: a user question, a retrieved evidence set, and a grounded response scored under the TrustStack standard.',
    reportSection: 'Interactive Evaluation Flow',
    reportFigureCaption: 'Live query interface showing how TrustStack turns a user question into a grounded answer.',
  },
  {
    id: 'evidence-mars',
    subsystem: 'Evidence Review',
    planet: 'Mars',
    title: 'Evidence review and explanation',
    summary: 'Mars is the explainability slide: the answer, the evidence, the claim coverage, and the places where support is weak or missing.',
    reportSection: 'Evidence Review and Explainability',
    reportFigureCaption: 'Answer and evidence review interface used to audit retrieval support.',
  },
  {
    id: 'scores-jupiter',
    subsystem: 'Score Breakdown',
    planet: 'Jupiter',
    title: 'Standardized score breakdown',
    summary: 'Jupiter translates raw evaluation data into a decision-grade trust posture with weighted category scores, verdict bands, and risk signals.',
    reportSection: 'Evaluation Results',
    reportFigureCaption: 'Category-level score breakdown under the TrustStack Evaluation Standard.',
  },
  {
    id: 'history-saturn',
    subsystem: 'Historical Runs',
    planet: 'Saturn',
    title: 'Historical consistency and benchmarking',
    summary: 'Saturn shows how TrustStack supports repeated evaluation, cross-run comparison, and traceable run history for review and benchmarking.',
    reportSection: 'Benchmarking and Historical Analysis',
    reportFigureCaption: 'Historical run tracking interface used for longitudinal review.',
  },
  {
    id: 'blueprint-uranus',
    subsystem: 'System Blueprint',
    planet: 'Uranus',
    title: 'Blueprint of the full TrustStack stack',
    summary: 'Uranus zooms out into the full blueprint so the audience can map ingestion, retrieval, scoring, explanation, and operator review to one coherent system.',
    reportSection: 'System Blueprint',
    reportFigureCaption: 'Top-level blueprint of the TrustStack system and its evaluation stages.',
  },
  {
    id: 'method-neptune',
    subsystem: 'Methodology',
    planet: 'Neptune',
    title: 'Methodology and evaluation standard',
    summary: 'Neptune grounds the presentation in a defensible research method: weighted dimensions, failure modes, diagnostics, and report-ready evidence.',
    reportSection: 'Methodology',
    reportFigureCaption: 'Methodology view connecting the UI narrative to the formal TrustStack standard.',
  },
  {
    id: 'standard-pluto',
    subsystem: 'TrustStack Standard',
    planet: 'Pluto',
    title: 'TrustStack standard and report export',
    summary: 'Pluto summarizes the formal standard, the report structure, and the final artifacts that Mission Control can generate for presentations and papers.',
    reportSection: 'Conclusion and Standard Export',
    reportFigureCaption: 'Summary slide aligning TrustStack outputs with presentation and report artifacts.',
  },
]

function ScoreBreakdownPanel({
  suiteResult,
}: {
  suiteResult: StandardTestRunResponse | null
}) {
  if (!suiteResult) {
    return (
      <div className="panel panel--glass">
        <div className="panel-header">
          <div>
            <div className="eyebrow">TrustStack Standard</div>
            <h3>Run the standardized suite to populate this breakdown.</h3>
          </div>
        </div>
        <p className="muted">
          Mission Control can execute the full TrustStack Evaluation Standard and return a final score, weighted category
          breakdown, and recommended follow-up actions.
        </p>
      </div>
    )
  }

  return (
    <div className="panel panel--glass">
      <div className="panel-header">
        <div>
          <div className="eyebrow">TrustStack Standard</div>
          <h3>Overall suite score: {suiteResult.final_score}</h3>
        </div>
        <span className="badge badge--bright">{suiteResult.verdict.toUpperCase()}</span>
      </div>
      <p className="muted">{suiteResult.summary}</p>
      <div className="signal-stack">
        {suiteResult.score_breakdown.map((category) => (
          <div className="signal-row" key={category.key}>
            <span>{category.label}</span>
            <div className="signal-bar">
              <div className="signal-bar-fill" style={{ width: `${category.score}%` }} />
            </div>
            <strong>{category.score}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function StandardSlidePanel({
  slide,
  suiteResult,
}: {
  slide: PlanetSlide
  suiteResult: StandardTestRunResponse | null
}) {
  return (
    <div className="stage-stack">
      <div className="panel panel--glass">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Presentation Alignment</div>
            <h3>{slide.reportSection}</h3>
          </div>
        </div>
        <p className="muted">{slide.reportFigureCaption}</p>
      </div>
      <ScoreBreakdownPanel suiteResult={suiteResult} />
    </div>
  )
}

function MissionControlOverlay({
  documents,
  runs,
  result,
  signals,
  sampleQuestions,
  loading,
  suiteLoading,
  suiteResult,
  onSubmit,
  onUploaded,
  onRunSuite,
}: {
  documents: DocumentItem[]
  runs: RunItem[]
  result: QueryResponse | null
  signals: { label: string; value: number }[]
  sampleQuestions: SampleQuestionItem[]
  loading: boolean
  suiteLoading: boolean
  suiteResult: StandardTestRunResponse | null
  onSubmit: (question: string) => void
  onUploaded: () => void
  onRunSuite: () => void
}) {
  const latestRun = runs[0] ?? null

  return (
    <div className="control-center stack">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Mission Control</div>
          <h2>Run the TrustStack standard from one screen.</h2>
        </div>
        <button className="primary primary--glow" onClick={onRunSuite} disabled={suiteLoading}>
          {suiteLoading ? 'Running Standard…' : 'Run Standardized Tests'}
        </button>
      </div>
      <p className="muted">
        Mission Control is now the operator console for the formal TrustStack standard: upload evidence, run live
        questions, execute the standardized suite, and capture the final score breakdown for the presentation and report.
      </p>

      <div className="control-center-grid">
        <div className="control-column">
          <UploadPanel onUploaded={onUploaded} />
          <DocumentList items={documents} />
        </div>

        <div className="control-column">
          <QueryBox onSubmit={onSubmit} loading={loading} sampleQuestions={sampleQuestions} />
          <div className="panel panel--glass">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Latest Response</div>
                <h3>{result ? 'Current evaluation output' : 'Run a query to populate this panel'}</h3>
              </div>
              {result ? <span className="badge badge--bright">{result.confidence_score}</span> : null}
            </div>
            <p className="muted">
              {result ? result.answer : 'Mission Control keeps the latest grounded answer visible while the standard suite runs.'}
            </p>
            <div className="pill-grid">
              {(result?.citations ?? []).slice(0, 4).map((citation) => (
                <span className="data-pill" key={citation}>
                  {citation}
                </span>
              ))}
              {!result ? <span className="data-pill">Awaiting live query</span> : null}
            </div>
          </div>
        </div>

        <div className="control-column">
          <ScoreBreakdownPanel suiteResult={suiteResult} />

          <div className="panel panel--glass">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Trust Signals</div>
                <h3>Read the current posture instantly.</h3>
              </div>
            </div>
            {signals.map((signal) => (
              <div className="signal-row" key={signal.label}>
                <span>{signal.label}</span>
                <div className="signal-bar">
                  <div className="signal-bar-fill" style={{ width: `${signal.value}%` }} />
                </div>
                <strong>{signal.value}</strong>
              </div>
            ))}
            <div className="framework-note">
              {result ? result.trust_summary : 'Run an evaluation to populate the live trust posture.'}
            </div>
          </div>

          <div className="panel panel--glass">
            <div className="panel-header">
              <div>
                <div className="eyebrow">Run History</div>
                <h3>Track the most recent evaluation.</h3>
              </div>
              <span className="badge">{runs.length} total</span>
            </div>
            {latestRun ? (
              <div className="framework-note">
                <strong>{latestRun.question}</strong>
                <div>{latestRun.trust_summary}</div>
              </div>
            ) : (
              <div className="framework-note">No evaluations have been logged yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [runs, setRuns] = useState<RunItem[]>([])
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [suiteLoading, setSuiteLoading] = useState(false)
  const [activePlanetIndex, setActivePlanetIndex] = useState(0)
  const [missionControlOpen, setMissionControlOpen] = useState(false)
  const [sampleQuestions, setSampleQuestions] = useState<SampleQuestionItem[]>([])
  const [suiteResult, setSuiteResult] = useState<StandardTestRunResponse | null>(null)

  const refreshDocuments = async () => {
    const res = await api.get<DocumentItem[]>('/documents')
    setDocuments(res.data)
  }

  const refreshSampleQuestions = async () => {
    const res = await api.get<SampleQuestionItem[]>('/documents/sample-questions')
    setSampleQuestions(res.data)
  }

  const refreshRuns = async () => {
    const res = await api.get<RunItem[]>('/runs')
    setRuns(res.data)
  }

  useEffect(() => {
    refreshDocuments().catch(console.error)
    refreshSampleQuestions().catch(console.error)
    refreshRuns().catch(console.error)
  }, [])

  const handleSubmit = async (question: string) => {
    setLoading(true)
    try {
      const res = await api.post<QueryResponse>('/query', { question, top_k: 5 })
      setResult(res.data)
      refreshRuns().catch(console.error)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRunSuite = async () => {
    setSuiteLoading(true)
    try {
      const res = await api.post<StandardTestRunResponse>('/evaluation/standard-run')
      setSuiteResult(res.data)
      setActivePlanetIndex(4)
    } catch (error) {
      console.error(error)
    } finally {
      setSuiteLoading(false)
    }
  }

  const trustSignals = useMemo(() => {
    if (!result) {
      return [
        { label: 'Safety', value: 76 },
        { label: 'Robustness', value: 72 },
        { label: 'Hallucination', value: 68 },
        { label: 'Privacy', value: 80 },
        { label: 'Monitoring', value: 74 },
      ]
    }

    const confidence = result.confidence_score
    const penalty = Math.min(result.risk_flags.length * 8, 32)

    return [
      { label: 'Safety', value: Math.max(35, confidence - penalty / 2) },
      { label: 'Robustness', value: Math.max(30, confidence - penalty) },
      { label: 'Hallucination', value: Math.max(25, confidence - (result.insufficient_evidence ? 22 : 10)) },
      { label: 'Privacy', value: Math.min(92, confidence + 6) },
      { label: 'Monitoring', value: Math.min(96, confidence + 10 - penalty / 3) },
    ]
  }, [result])

  const activePanel = useMemo<ReactNode>(() => {
    const slide = PLANET_SLIDES[activePlanetIndex]
    switch (activePlanetIndex) {
      case 0:
        return (
          <div className="stage-stack">
            <UploadPanel
              onUploaded={() => {
                refreshDocuments().catch(console.error)
                refreshSampleQuestions().catch(console.error)
              }}
            />
            <DocumentList items={documents} />
          </div>
        )
      case 1:
        return <FrameworkExplorer signals={trustSignals} latestResult={result} />
      case 2:
        return <QueryBox onSubmit={handleSubmit} loading={loading} sampleQuestions={sampleQuestions} />
      case 3:
        return (
          <div className="stage-stack">
            <AnswerCard result={result} />
            <EvidencePanel result={result} />
          </div>
        )
      case 4:
        return (
          <div className="stage-stack">
            <RiskPanel result={result} />
            <ResultsSection result={result} runs={runs} signals={trustSignals} minimal />
            <ScoreBreakdownPanel suiteResult={suiteResult} />
          </div>
        )
      case 5:
        return <RunHistoryTable items={runs} />
      case 6:
        return <FrameworkExplorer signals={trustSignals} latestResult={result} />
      case 7:
        return <MethodologySection />
      case 8:
        return <StandardSlidePanel slide={slide} suiteResult={suiteResult} />
      default:
        return null
    }
  }, [activePlanetIndex, documents, loading, result, runs, sampleQuestions, suiteResult, trustSignals])

  return (
    <div className="app-root app-root--fixed">
      <TrustHero
        nodes={PLANET_SLIDES}
        activeIndex={activePlanetIndex}
        detailPanel={activePanel}
        missionControlPanel={
          <MissionControlOverlay
            documents={documents}
            runs={runs}
            result={result}
            signals={trustSignals}
            sampleQuestions={sampleQuestions}
            loading={loading}
            suiteLoading={suiteLoading}
            suiteResult={suiteResult}
            onSubmit={handleSubmit}
            onUploaded={() => {
              refreshDocuments().catch(console.error)
              refreshSampleQuestions().catch(console.error)
            }}
            onRunSuite={handleRunSuite}
          />
        }
        missionControlOpen={missionControlOpen}
        onActiveIndexChange={setActivePlanetIndex}
        onMissionControlOpenChange={setMissionControlOpen}
      />
    </div>
  )
}
