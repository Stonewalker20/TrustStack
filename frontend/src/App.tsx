import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DocumentList } from './components/DocumentList'
import { QueryBox } from './components/QueryBox'
import { TrustHero } from './components/TrustHero'
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

type PlanetSlide = {
  id: string
  eyebrow: string
  planet: string
  title: string
  summary: string
  problem: string
  solution: string
  keyPoints: string[]
  proofLabel: string
  proofValue: string
  reportSection: string
  reportFigureCaption: string
}

const PLANET_SLIDES: PlanetSlide[] = [
  {
    id: 'intro-mercury',
    eyebrow: 'Slide 1 · Problem',
    planet: 'Mercury',
    title: 'AI systems answer quickly, but they rarely prove why they should be trusted.',
    summary: 'TrustStack starts from the core failure mode: most model interfaces optimize for fluency while leaving operators blind to evidence quality, scope, and risk.',
    problem: 'Teams are asked to act on AI outputs before they can inspect whether the answer is actually grounded in source material.',
    solution: 'TrustStack reframes trust as an evidence problem. Before we score anything, we ingest the corpus and make every later judgment traceable to specific supporting passages.',
    keyPoints: [
      'Ground the system in uploaded evidence rather than model confidence alone.',
      'Normalize documents into indexed chunks so later claims remain auditable.',
      'Turn trust review into a repeatable workflow instead of an intuition call.',
    ],
    proofLabel: 'Presentation goal',
    proofValue: 'Show the audience the problem before showing the product.',
    reportSection: 'Problem Statement and Evidence Intake',
    reportFigureCaption: 'Evidence ingestion flow used to ground the TrustStack evaluation stack.',
  },
  {
    id: 'design-venus',
    eyebrow: 'Slide 2 · System',
    planet: 'Venus',
    title: 'TrustStack is a layered evaluation system, not a single trust score.',
    summary: 'Venus introduces the architecture that turns documents, retrieval, scoring, and explanation into one coherent operator workflow.',
    problem: 'A raw score is not enough if the audience cannot see what produced it or where the answer broke down.',
    solution: 'TrustStack separates ingestion, retrieval, grounded response generation, evaluation, risk labeling, and review so each layer can be inspected on its own.',
    keyPoints: [
      'Each subsystem has a distinct responsibility in the trust pipeline.',
      'The architecture is local-first, auditable, and designed for demonstrations and real review work.',
      'The UI maps directly onto the backend evaluation flow and the final report structure.',
    ],
    proofLabel: 'System promise',
    proofValue: 'Every trust signal has a visible pipeline behind it.',
    reportSection: 'System Architecture',
    reportFigureCaption: 'Evaluation architecture slide showing the layered TrustStack pipeline.',
  },
  {
    id: 'query-earth',
    eyebrow: 'Slide 3 · Runtime',
    planet: 'Earth',
    title: 'Users interact with TrustStack through grounded evaluation, not a blind chatbot.',
    summary: 'Earth explains the main runtime loop: question, retrieval, answer, score, and explanation all happen against the active evidence set.',
    problem: 'Standard chat UX makes it hard to tell whether the answer came from evidence or from model interpolation.',
    solution: 'TrustStack ties each live evaluation to retrieved context, formal scoring, and evidence-backed outputs that can be reviewed immediately.',
    keyPoints: [
      'The question is evaluated against indexed evidence, not treated as open-ended chat.',
      'Sample prompts lower the barrier to trying grounded evaluation on a fresh corpus.',
      'The same runtime loop powers demos, experiments, and analyst review.',
    ],
    proofLabel: 'Runtime focus',
    proofValue: 'Ask, retrieve, evaluate, explain.',
    reportSection: 'Interactive Evaluation Flow',
    reportFigureCaption: 'Live query interface showing how TrustStack turns a user question into a grounded answer.',
  },
  {
    id: 'evidence-mars',
    eyebrow: 'Slide 4 · Explainability',
    planet: 'Mars',
    title: 'A trustworthy answer has to expose its support, not just sound plausible.',
    summary: 'Mars is the explainability slide: answer, citations, supporting excerpts, and weak spots all sit in the same review surface.',
    problem: 'Users cannot meaningfully trust an answer they cannot audit claim by claim.',
    solution: 'TrustStack surfaces the answer with its evidence, confidence rationale, and unsupported or weakly grounded claims so the user can verify before acting.',
    keyPoints: [
      'Citations point back to concrete retrieved evidence.',
      'Claim support and contradiction risk are part of the evaluation, not afterthoughts.',
      'The system teaches the user what to review next instead of hiding uncertainty.',
    ],
    proofLabel: 'Operator question',
    proofValue: 'Can I see exactly why this answer should be trusted?',
    reportSection: 'Evidence Review and Explainability',
    reportFigureCaption: 'Answer and evidence review interface used to audit retrieval support.',
  },
  {
    id: 'scores-jupiter',
    eyebrow: 'Slide 5 · Results',
    planet: 'Jupiter',
    title: 'TrustStack turns evidence quality into a decision-grade trust posture.',
    summary: 'Jupiter is the main results slide: weighted category scores, verdict bands, and risk signals translate diagnostics into an executive readout.',
    problem: 'Review teams need a compact verdict, but that verdict has to stay anchored to defensible evaluation logic.',
    solution: 'The TrustStack Evaluation Standard converts retrieval, support, citations, contradiction risk, and calibration into a weighted breakdown the audience can explain.',
    keyPoints: [
      'Weighted categories prevent the product from collapsing into one opaque confidence number.',
      'Verdict bands make it clear when a result passes, needs review, or fails.',
      'Risk signals communicate why human oversight is still necessary.',
    ],
    proofLabel: 'Outcome',
    proofValue: 'Scores become explainable decisions, not decorative metrics.',
    reportSection: 'Evaluation Results',
    reportFigureCaption: 'Category-level score breakdown under the TrustStack Evaluation Standard.',
  },
  {
    id: 'history-saturn',
    eyebrow: 'Slide 6 · Benchmarking',
    planet: 'Saturn',
    title: 'One good answer is not enough. Trust has to hold across time and repeated runs.',
    summary: 'Saturn reframes TrustStack as a benchmarking product by showing historical evaluations, consistency checks, and cross-run tracking.',
    problem: 'Single-run demos hide drift, instability, and repeated failure modes.',
    solution: 'TrustStack keeps run history and standardized benchmark output so teams can compare how the system behaves over time and across datasets.',
    keyPoints: [
      'Repeated runs expose drift and unstable behavior that a single demo misses.',
      'Benchmark-friendly history makes the system useful for governance, not just demos.',
      'Historical context helps distinguish isolated misses from systemic weaknesses.',
    ],
    proofLabel: 'Trust lens',
    proofValue: 'Consistency is part of trustworthiness.',
    reportSection: 'Benchmarking and Historical Analysis',
    reportFigureCaption: 'Historical run tracking interface used for longitudinal review.',
  },
  {
    id: 'blueprint-uranus',
    eyebrow: 'Slide 7 · Integration',
    planet: 'Uranus',
    title: 'The full stack matters because trust breaks when any one layer disappears.',
    summary: 'Uranus zooms out and reconnects the whole system: ingestion, retrieval, evaluation, explanation, report export, and operator review.',
    problem: 'Tools that solve only one part of trust review still leave the analyst stitching everything together by hand.',
    solution: 'TrustStack packages the full evaluation lifecycle into a unified stack so the interface, backend, benchmark, and report all speak the same language.',
    keyPoints: [
      'The planet narrative maps directly onto the actual system architecture.',
      'The same backend powers live queries, scoring, benchmarks, and report exports.',
      'This coherence is what makes the product presentation-ready instead of a disconnected prototype.',
    ],
    proofLabel: 'Blueprint value',
    proofValue: 'One system, one standard, one review workflow.',
    reportSection: 'System Blueprint',
    reportFigureCaption: 'Top-level blueprint of the TrustStack system and its evaluation stages.',
  },
  {
    id: 'method-neptune',
    eyebrow: 'Slide 8 · Method',
    planet: 'Neptune',
    title: 'TrustStack is backed by a formal methodology, not a vague notion of trust.',
    summary: 'Neptune is the research slide: weighted dimensions, diagnostics, failure modes, claim support, and reproducibility metadata anchor the system in a defensible method.',
    problem: 'A trust product without a formal method is difficult to defend in technical review or conference settings.',
    solution: 'TrustStack Evaluation Standard v2.0 defines weighted dimensions, structured checks, diagnostics, and metadata so results can be reproduced and critiqued.',
    keyPoints: [
      'Groundedness, citations, contradiction risk, completeness, and calibration are all explicit dimensions.',
      'Per-case metrics and metadata make results reportable instead of anecdotal.',
      'The methodology is designed to support both live demos and formal writeups.',
    ],
    proofLabel: 'Research value',
    proofValue: 'Defensible method, reproducible output.',
    reportSection: 'Methodology',
    reportFigureCaption: 'Methodology view connecting the UI narrative to the formal TrustStack standard.',
  },
  {
    id: 'standard-pluto',
    eyebrow: 'Slide 9 · Close',
    planet: 'Pluto',
    title: 'TrustStack ends with reusable artifacts, not just an interactive demo.',
    summary: 'Pluto closes the walkthrough by connecting the standard, batch benchmark, and report-export path to what an audience or analyst can take away after the demo.',
    problem: 'Too many AI demos stop at the interface and leave no durable artifact behind.',
    solution: 'Mission Control can execute the standardized suite and generate report-ready outputs, so the presentation, benchmark, and paper all stay aligned.',
    keyPoints: [
      'The same standardized suite produces live results, final scores, and exportable report artifacts.',
      'Batch benchmarking extends the product beyond a single corpus or one-off demo.',
      'The product itself becomes the presentation, while the outputs become the paper trail.',
    ],
    proofLabel: 'Final takeaway',
    proofValue: 'TrustStack is a trust workflow, not just a UI.',
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
  documents,
  runs,
}: {
  slide: PlanetSlide
  suiteResult: StandardTestRunResponse | null
  documents: DocumentItem[]
  runs: RunItem[]
}) {
  const proofValue =
    slide.planet === 'Mercury'
      ? `${documents.length} document${documents.length === 1 ? '' : 's'} ready for evaluation`
      : slide.planet === 'Jupiter' && suiteResult
        ? `${suiteResult.final_score}/100 ${suiteResult.verdict.toUpperCase()}`
        : slide.planet === 'Saturn'
          ? `${runs.length} recorded evaluation run${runs.length === 1 ? '' : 's'}`
          : slide.proofValue

  return (
    <div className="presentation-slide">
      <div className="presentation-slide__lead">
        <div className="eyebrow">{slide.eyebrow}</div>
        <h2>{slide.title}</h2>
        <p>{slide.summary}</p>
      </div>

      <div className="presentation-slide__grid">
        <div className="presentation-slide__panel">
          <div className="eyebrow">Issue</div>
          <h3>What breaks without TrustStack?</h3>
          <p>{slide.problem}</p>
        </div>

        <div className="presentation-slide__panel">
          <div className="eyebrow">Response</div>
          <h3>How TrustStack answers it</h3>
          <p>{slide.solution}</p>
        </div>
      </div>

      <div className="presentation-slide__notes">
        <div className="presentation-slide__panel">
          <div className="eyebrow">Talking Points</div>
          <ul className="presentation-slide__list">
            {slide.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="presentation-slide__panel presentation-slide__panel--accent">
          <div>
            <div className="eyebrow">{slide.proofLabel}</div>
            <h3>{proofValue}</h3>
          </div>
          <p>{slide.reportSection}</p>
          <div className="presentation-slide__caption">{slide.reportFigureCaption}</div>
        </div>
      </div>
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
  reportArtifacts,
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
  reportArtifacts: StandardReportArtifactsResponse | null
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
                <div className="eyebrow">Report Export</div>
                <h3>Generate report-ready artifacts.</h3>
              </div>
            </div>
            <p className="muted">
              {reportArtifacts?.executive_summary ??
                'Run the standardized suite to generate an executive summary, IEEE LaTeX table snippets, and an appendix-style benchmark export.'}
            </p>
            {reportArtifacts ? (
              <div className="pill-grid">
                <span className="data-pill">LaTeX category table ready</span>
                <span className="data-pill">LaTeX case table ready</span>
                <span className="data-pill">Appendix markdown ready</span>
              </div>
            ) : null}
          </div>

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
  const [reportArtifacts, setReportArtifacts] = useState<StandardReportArtifactsResponse | null>(null)

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
      const artifacts = await api.post<StandardReportArtifactsResponse>('/evaluation/standard-run/report-artifacts')
      setReportArtifacts(artifacts.data)
      setSuiteResult(artifacts.data.suite)
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
    return <StandardSlidePanel slide={slide} suiteResult={suiteResult} documents={documents} runs={runs} />
  }, [activePlanetIndex, documents, runs, suiteResult])

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
            reportArtifacts={reportArtifacts}
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
