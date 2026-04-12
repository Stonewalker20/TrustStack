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
  background: string
  researchQuestion: string
  truststackResponse: string
  academicTakeaway: string
  keyPoints: string[]
  evidenceCueLabel: string
  evidenceCueValue: string
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
    background: 'In practical settings, the cost of a wrong answer is rarely just cosmetic. A weak response can trigger bad decisions, wasted analyst time, or false confidence in a model that was never actually grounded in the available evidence.',
    researchQuestion: 'How can an operator decide whether an AI answer is safe to use when the system does not expose where the answer came from or how well it is supported?',
    truststackResponse: 'TrustStack treats trust as an evidence-grounding problem. It starts by ingesting a real corpus and preserving the traceability needed for later scoring, explanation, and audit.',
    academicTakeaway: 'This opening slide frames TrustStack as an evaluation system for operational trust, not as a tool for making language models appear more fluent or confident.',
    keyPoints: [
      'Ground the system in uploaded evidence rather than model confidence alone.',
      'Normalize documents into indexed chunks so later claims remain auditable.',
      'Turn trust review into a repeatable workflow instead of an intuition call.',
    ],
    evidenceCueLabel: 'Evidence cue',
    evidenceCueValue: 'Show the audience the problem before showing the product.',
    reportSection: 'Problem Statement and Evidence Intake',
    reportFigureCaption: 'Evidence ingestion flow used to ground the TrustStack evaluation stack.',
  },
  {
    id: 'design-venus',
    eyebrow: 'Slide 2 · System',
    planet: 'Venus',
    title: 'TrustStack is a layered evaluation system, not a single trust score.',
    summary: 'Venus introduces the architecture that turns documents, retrieval, scoring, and explanation into one coherent operator workflow.',
    background: 'Many trust tools stop at a dashboard metric or a retrieval view. TrustStack instead connects ingestion, retrieval, scoring, explanation, and export into one system so each stage reinforces the others.',
    researchQuestion: 'What architecture is required if trust is supposed to be inspectable rather than collapsed into one opaque score or one prompt template?',
    truststackResponse: 'TrustStack decomposes the workflow into ingestion, retrieval, grounded generation, evaluation, risk labeling, and review so each stage can be challenged independently.',
    academicTakeaway: 'The architecture slide makes the contribution legible: TrustStack is a systems pipeline with explicit responsibilities, not a single-model wrapper.',
    keyPoints: [
      'Each subsystem has a distinct responsibility in the trust pipeline.',
      'The architecture is local-first, auditable, and designed for demonstrations and real review work.',
      'The UI maps directly onto the backend evaluation flow and the final report structure.',
    ],
    evidenceCueLabel: 'Architecture cue',
    evidenceCueValue: 'Every trust signal has a visible pipeline behind it.',
    reportSection: 'System Architecture',
    reportFigureCaption: 'Evaluation architecture slide showing the layered TrustStack pipeline.',
  },
  {
    id: 'query-earth',
    eyebrow: 'Slide 3 · Runtime',
    planet: 'Earth',
    title: 'Users interact with TrustStack through grounded evaluation, not a blind chatbot.',
    summary: 'Earth explains the main runtime loop: question, retrieval, answer, score, and explanation all happen against the active evidence set.',
    background: 'This is the live operational view of the system. It is where a user moves from abstract architecture into a concrete question that can be answered, scored, and reviewed in one pass.',
    researchQuestion: 'How should a user interact with a trust system if the goal is to evaluate groundedness rather than simply receive fluent output?',
    truststackResponse: 'TrustStack binds every query to retrieval, evidence review, and structured evaluation so the user can inspect support at the same moment the answer is generated.',
    academicTakeaway: 'This runtime slide shows that the system is usable in real time without abandoning formal evaluation logic or operator review.',
    keyPoints: [
      'The question is evaluated against indexed evidence, not treated as open-ended chat.',
      'Sample prompts lower the barrier to trying grounded evaluation on a fresh corpus.',
      'The same runtime loop powers demos, experiments, and analyst review.',
    ],
    evidenceCueLabel: 'Runtime cue',
    evidenceCueValue: 'Ask, retrieve, evaluate, explain.',
    reportSection: 'Interactive Evaluation Flow',
    reportFigureCaption: 'Live query interface showing how TrustStack turns a user question into a grounded answer.',
  },
  {
    id: 'evidence-mars',
    eyebrow: 'Slide 4 · Explainability',
    planet: 'Mars',
    title: 'A trustworthy answer has to expose its support, not just sound plausible.',
    summary: 'Mars is the explainability slide: answer, citations, supporting excerpts, and weak spots all sit in the same review surface.',
    background: 'Most model interfaces stop once they have produced fluent text. TrustStack keeps going by exposing the evidence base and making unsupported reasoning visible to the operator.',
    researchQuestion: 'What must an evaluation system expose if it wants users to audit claims rather than trust the tone of the answer?',
    truststackResponse: 'TrustStack pairs the answer with citations, supporting evidence, confidence rationale, and weak-claim diagnostics so the operator can review support before acting.',
    academicTakeaway: 'This slide marks the shift from convenience to accountability. TrustStack does not ask for trust; it surfaces the material needed to test whether trust is earned.',
    keyPoints: [
      'Citations point back to concrete retrieved evidence.',
      'Claim support and contradiction risk are part of the evaluation, not afterthoughts.',
      'The system teaches the user what to review next instead of hiding uncertainty.',
    ],
    evidenceCueLabel: 'Audit cue',
    evidenceCueValue: 'Can I see exactly why this answer should be trusted?',
    reportSection: 'Evidence Review and Explainability',
    reportFigureCaption: 'Answer and evidence review interface used to audit retrieval support.',
  },
  {
    id: 'scores-jupiter',
    eyebrow: 'Slide 5 · Results',
    planet: 'Jupiter',
    title: 'TrustStack turns evidence quality into a decision-grade trust posture.',
    summary: 'Jupiter is the main results slide: weighted category scores, verdict bands, and risk signals translate diagnostics into an executive readout.',
    background: 'A useful trust layer has to compress technical evidence into something decision makers can quickly understand without losing the reasoning underneath it.',
    researchQuestion: 'How can complex evidence diagnostics be summarized in a way that is both decision-ready and still academically defensible?',
    truststackResponse: 'The TrustStack Evaluation Standard converts retrieval quality, evidence sufficiency, traceability, contradiction risk, and calibration into a weighted, inspectable score breakdown.',
    academicTakeaway: 'This is the core results slide. It demonstrates how TrustStack converts noisy model behavior into a structured, explainable trust judgment.',
    keyPoints: [
      'Weighted categories prevent the product from collapsing into one opaque confidence number.',
      'Verdict bands make it clear when a result passes, needs review, or fails.',
      'Risk signals communicate why human oversight is still necessary.',
    ],
    evidenceCueLabel: 'Results cue',
    evidenceCueValue: 'Scores become explainable decisions, not decorative metrics.',
    reportSection: 'Evaluation Results',
    reportFigureCaption: 'Category-level score breakdown under the TrustStack Evaluation Standard.',
  },
  {
    id: 'history-saturn',
    eyebrow: 'Slide 6 · Benchmarking',
    planet: 'Saturn',
    title: 'One good answer is not enough. Trust has to hold across time and repeated runs.',
    summary: 'Saturn reframes TrustStack as a benchmarking product by showing historical evaluations, consistency checks, and cross-run tracking.',
    background: 'Operational trust is temporal. A system that performs well once but drifts over time is still risky, especially in environments where the evidence base and user behavior evolve.',
    researchQuestion: 'What does trustworthy behavior mean if a system can perform well once but cannot remain stable across repeated evaluations or changing corpora?',
    truststackResponse: 'TrustStack records historical runs and standardized benchmark outputs so teams can compare drift, instability, and recurring failure modes over time.',
    academicTakeaway: 'This slide extends the contribution from live evaluation into benchmarking and governance. It argues that trust must be measured longitudinally, not just locally.',
    keyPoints: [
      'Repeated runs expose drift and unstable behavior that a single demo misses.',
      'Benchmark-friendly history makes the system useful for governance, not just demos.',
      'Historical context helps distinguish isolated misses from systemic weaknesses.',
    ],
    evidenceCueLabel: 'Benchmark cue',
    evidenceCueValue: 'Consistency is part of trustworthiness.',
    reportSection: 'Benchmarking and Historical Analysis',
    reportFigureCaption: 'Historical run tracking interface used for longitudinal review.',
  },
  {
    id: 'blueprint-uranus',
    eyebrow: 'Slide 7 · Integration',
    planet: 'Uranus',
    title: 'The full stack matters because trust breaks when any one layer disappears.',
    summary: 'Uranus zooms out and reconnects the whole system: ingestion, retrieval, evaluation, explanation, report export, and operator review.',
    background: 'By this point in the presentation, the audience has seen each major function separately. The next step is to reconnect them into one coherent product and one coherent systems story.',
    researchQuestion: 'Why does a trust workflow fail when retrieval, scoring, explanation, and export are treated as disconnected utilities rather than one integrated system?',
    truststackResponse: 'TrustStack packages the full evaluation lifecycle into a unified stack so the interface, backend, benchmark, and report all speak the same language.',
    academicTakeaway: 'This slide reinforces systems coherence. The product is stronger because architecture, evaluation standard, and reporting workflow are aligned rather than fragmented.',
    keyPoints: [
      'The planet narrative maps directly onto the actual system architecture.',
      'The same backend powers live queries, scoring, benchmarks, and report exports.',
      'This coherence is what makes the product presentation-ready instead of a disconnected prototype.',
    ],
    evidenceCueLabel: 'Integration cue',
    evidenceCueValue: 'One system, one standard, one review workflow.',
    reportSection: 'System Blueprint',
    reportFigureCaption: 'Top-level blueprint of the TrustStack system and its evaluation stages.',
  },
  {
    id: 'method-neptune',
    eyebrow: 'Slide 8 · Method',
    planet: 'Neptune',
    title: 'TrustStack is backed by a formal methodology, not a vague notion of trust.',
    summary: 'Neptune is the research slide: weighted dimensions, diagnostics, failure modes, claim support, and reproducibility metadata anchor the system in a defensible method.',
    background: 'For an evaluation system to be credible in research or high-stakes review, it needs more than persuasive language. It needs a formal method that someone else can inspect, critique, and reproduce.',
    researchQuestion: 'What methodological structure is necessary if a trust system is expected to survive technical review, classroom scrutiny, or conference-style evaluation?',
    truststackResponse: 'TrustStack Evaluation Standard v2.0 defines weighted dimensions, structured checks, diagnostics, and metadata so results can be reproduced and critiqued.',
    academicTakeaway: 'This is the main research slide. It demonstrates that TrustStack is defining a concrete evaluation methodology rather than merely packaging model outputs.',
    keyPoints: [
      'Groundedness, citations, contradiction risk, completeness, and calibration are all explicit dimensions.',
      'Per-case metrics and metadata make results reportable instead of anecdotal.',
      'The methodology is designed to support both live demos and formal writeups.',
    ],
    evidenceCueLabel: 'Method cue',
    evidenceCueValue: 'Defensible method, reproducible output.',
    reportSection: 'Methodology',
    reportFigureCaption: 'Methodology view connecting the UI narrative to the formal TrustStack standard.',
  },
  {
    id: 'standard-pluto',
    eyebrow: 'Slide 9 · Close',
    planet: 'Pluto',
    title: 'TrustStack ends with reusable artifacts, not just an interactive demo.',
    summary: 'Pluto closes the walkthrough by connecting the standard, batch benchmark, and report-export path to what an audience or analyst can take away after the demo.',
    background: 'A strong systems project should leave behind more than a live interaction. It should generate outputs that can be discussed in class, reused in reports, and carried into later evaluation cycles.',
    researchQuestion: 'What durable artifact should remain after a trust evaluation if the system is supposed to support academic reporting, benchmarking, and future review?',
    truststackResponse: 'TrustStack executes the standardized suite and generates report-ready outputs so the live evaluation, benchmark summary, and written report remain aligned.',
    academicTakeaway: 'The closing slide ties the full contribution together: TrustStack becomes a workflow for grounded evaluation, benchmarking, and reporting rather than a one-off demonstration.',
    keyPoints: [
      'The same standardized suite produces live results, final scores, and exportable report artifacts.',
      'Batch benchmarking extends the product beyond a single corpus or one-off demo.',
      'The product itself becomes the presentation, while the outputs become the paper trail.',
    ],
    evidenceCueLabel: 'Closing cue',
    evidenceCueValue: 'TrustStack is a trust workflow, not just a UI.',
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
          : slide.evidenceCueValue

  return (
    <div className="presentation-slide">
      <div className="presentation-slide__lead">
        <div className="eyebrow">{slide.eyebrow}</div>
        <h2>{slide.title}</h2>
        <p>{slide.summary}</p>
      </div>

      <div className="presentation-slide__grid">
        <div className="presentation-slide__panel">
          <div className="eyebrow">Background</div>
          <h3>Why this part of the story matters</h3>
          <p>{slide.background}</p>
        </div>

        <div className="presentation-slide__panel">
          <div className="eyebrow">Research Question</div>
          <h3>What problem is this slide answering?</h3>
          <p>{slide.researchQuestion}</p>
        </div>

        <div className="presentation-slide__panel">
          <div className="eyebrow">TrustStack Response</div>
          <h3>How the system responds</h3>
          <p>{slide.truststackResponse}</p>
        </div>

        <div className="presentation-slide__panel">
          <div className="eyebrow">Academic Takeaway</div>
          <h3>What the audience should remember</h3>
          <p>{slide.academicTakeaway}</p>
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
            <div className="eyebrow">{slide.evidenceCueLabel}</div>
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
