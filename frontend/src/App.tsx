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
  visualTitle: string
  visualCaption: string
  visualStats: { label: string; value: string }[]
  visualFlow: string[]
  reportSection: string
  reportFigureCaption: string
}

const PLANET_SLIDES: PlanetSlide[] = [
  {
    id: 'intro-mercury',
    eyebrow: 'Slide 1 · Introduction',
    planet: 'Mercury',
    title: 'TrustStack frames trustworthy AI as an evidence-grounded evaluation problem.',
    summary: 'The presentation opens with the central claim of the report: fluent model output is not enough in operational settings where users must judge whether an answer is safe, supported, and auditable.',
    background: 'Large language models are easy to demonstrate but hard to trust. In policy, research, compliance, and safety workflows, the key question is not simply whether a model can answer quickly, but whether the answer can be inspected before it is used downstream.',
    researchQuestion: 'How can a user determine whether an AI answer is trustworthy when conventional chat interfaces expose fluency but hide evidence quality, contradiction risk, and review conditions?',
    truststackResponse: 'TrustStack addresses this by combining evidence ingestion, retrieval, answer generation, structured scoring, risk labeling, and explanation into one local-first evaluation workflow.',
    academicTakeaway: 'The paper positions TrustStack as an evaluation system for operational trust rather than a wrapper that makes model output look more persuasive.',
    visualTitle: 'Problem formulation',
    visualCaption: 'The project begins by reframing trust from a subjective impression into a measurable evaluation target.',
    visualStats: [
      { label: 'Core task', value: 'Grounded trust review' },
      { label: 'Primary risk', value: 'Unsupported confidence' },
      { label: 'Decision basis', value: 'Evidence + diagnostics' },
    ],
    visualFlow: ['Question asked', 'Evidence inspected', 'Trust scored', 'Operator decides'],
    reportSection: 'Introduction and Problem Setting',
    reportFigureCaption: 'Opening slide mapping the trust problem to an evidence-first evaluation workflow.',
  },
  {
    id: 'related-venus',
    eyebrow: 'Slide 2 · Related Work',
    planet: 'Venus',
    title: 'TrustStack sits at the intersection of RAG, hallucination analysis, and structured evaluation.',
    summary: 'This slide aligns the project with the report’s related-work section and explains where the contribution fits: not a new base model, but a new evidence-first review layer around existing generation pipelines.',
    background: 'The report grounds TrustStack in three adjacent literatures: retrieval-augmented generation, hallucination and reliability analysis, and structured evaluation frameworks for generative systems. The novelty is the integration of these threads into a local-first review workflow.',
    researchQuestion: 'How does TrustStack differ from prior retrieval pipelines, generic explainability tools, and model-evaluation harnesses?',
    truststackResponse: 'TrustStack shifts emphasis from answer production to answer inspection by turning retrieval quality, evidence sufficiency, contradiction risk, and calibration into first-class outputs rather than hidden internal signals.',
    academicTakeaway: 'The contribution is a systems-and-evaluation layer that operationalizes ideas from RAG and reliability research into a workflow an operator can actually use.',
    visualTitle: 'Positioning in prior work',
    visualCaption: 'The project contribution is defined by how it combines retrieval, reliability, and evaluation into one review surface.',
    visualStats: [
      { label: 'Lineage 1', value: 'RAG systems' },
      { label: 'Lineage 2', value: 'Hallucination research' },
      { label: 'Lineage 3', value: 'Structured evals' },
    ],
    visualFlow: ['Retrieve evidence', 'Detect failure modes', 'Score systematically', 'Review operationally'],
    reportSection: 'Related Work',
    reportFigureCaption: 'Related-work slide positioning TrustStack against adjacent retrieval and evaluation approaches.',
  },
  {
    id: 'data-earth',
    eyebrow: 'Slide 3 · Data',
    planet: 'Earth',
    title: 'The evaluation uses both uploaded evidence and benchmark-oriented corpora.',
    summary: 'Earth now reflects the report’s data section: TrustStack operates over real user documents, synthetic stress corpora, and checked-in public benchmark subsets.',
    background: 'The paper distinguishes between two data families. The first is user-provided evidence in PDF, DOCX, TXT, and Markdown form. The second is benchmark-oriented data, including seven synthetic stress conditions and normalized public subsets for SciFact and HotpotQA.',
    researchQuestion: 'What data is required to evaluate trust in a way that is both operationally useful and experimentally reproducible?',
    truststackResponse: 'TrustStack separates live evidence review from benchmark analysis while keeping both under the same ingestion, retrieval, and scoring protocol.',
    academicTakeaway: 'This slide makes the dataset story defensible: the system is grounded in real evidence use cases, but the report also includes controlled and external evaluation datasets.',
    visualTitle: 'Evaluation data families',
    visualCaption: 'TrustStack uses separate but compatible data paths for live evidence, synthetic stress tests, and public benchmark subsets.',
    visualStats: [
      { label: 'Live corpus', value: 'User uploads' },
      { label: 'Stress tests', value: '7 synthetic packets' },
      { label: 'External data', value: 'SciFact + HotpotQA' },
    ],
    visualFlow: ['Upload evidence', 'Build benchmark slices', 'Run same evaluator', 'Compare outcomes'],
    reportSection: 'Data',
    reportFigureCaption: 'Data slide showing how live corpora and benchmark corpora feed the same TrustStack pipeline.',
  },
  {
    id: 'methods-mars',
    eyebrow: 'Slide 4 · Methods',
    planet: 'Mars',
    title: 'The TrustStack method is a five-layer pipeline from evidence intake to operator review.',
    summary: 'Mars maps directly to the report’s methods section and architecture table: ingestion, retrieval, generation, evaluation, and review form the core system.',
    background: 'The report describes TrustStack as a local-first full-stack system. MongoDB persists documents and runs, retrieval surfaces evidence chunks, generation produces the answer, and the evaluation layer converts that answer into a structured review artifact.',
    researchQuestion: 'What system architecture is necessary if trust must remain inspectable from ingestion all the way to the final verdict?',
    truststackResponse: 'TrustStack explicitly decomposes the workflow so each layer can be validated independently and so failure can be localized to retrieval, answer behavior, scoring, or explanation.',
    academicTakeaway: 'The method is not a single prompt or a single score. It is a traceable pipeline whose layers correspond directly to the structure of the report.',
    visualTitle: 'Five-layer method',
    visualCaption: 'The methods slide summarizes the pipeline that carries evidence into a scored evaluation packet.',
    visualStats: [
      { label: 'Persistence', value: 'MongoDB runs + chunks' },
      { label: 'Retrieval', value: 'Vector or lexical' },
      { label: 'Review output', value: 'Scored packet' },
    ],
    visualFlow: ['Ingest', 'Retrieve', 'Generate', 'Evaluate', 'Review'],
    reportSection: 'Methods and System Architecture',
    reportFigureCaption: 'Methods slide showing the five-layer TrustStack pipeline.',
  },
  {
    id: 'standard-jupiter',
    eyebrow: 'Slide 5 · Evaluation Standard',
    planet: 'Jupiter',
    title: 'TrustStack Evaluation Standard v2.0 formalizes trust as a weighted multi-dimensional score.',
    summary: 'Jupiter is no longer just a product result view. It now mirrors the paper’s formal methodology: ten weighted dimensions, explicit checks, claim diagnostics, verdict bands, and reproducibility metadata.',
    background: 'For a trust system to be academically defensible, the score must be interpretable and reproducible. TrustStack therefore defines weighted dimensions for retrieval, evidence sufficiency, citation traceability, claim support, contradiction risk, completeness, abstention, discipline, safety, and calibration.',
    researchQuestion: 'How can trust be operationalized as a measurable and reviewable standard instead of a vague intuition?',
    truststackResponse: 'TrustStack Evaluation Standard v2.0 converts evidence-centered diagnostics into a structured score, a verdict band, explicit failure signals, and a next-step recommendation.',
    academicTakeaway: 'This slide is the methodological core of the project. It explains what is being measured, why it is weighted, and how the final verdict is produced.',
    visualTitle: 'Standard definition',
    visualCaption: 'The standard makes trust inspectable by decomposing it into weighted dimensions and explicit checks.',
    visualStats: [
      { label: 'Dimensions', value: '10 weighted criteria' },
      { label: 'Verdicts', value: 'Pass / Review / Fail' },
      { label: 'Diagnostics', value: 'Claims + checks + flags' },
    ],
    visualFlow: ['Collect diagnostics', 'Score dimensions', 'Assign verdict', 'Recommend review'],
    reportSection: 'TrustStack Evaluation Standard v2.0',
    reportFigureCaption: 'Formal evaluation-standard slide summarizing dimensions, verdict bands, and diagnostics.',
  },
  {
    id: 'synthetic-saturn',
    eyebrow: 'Slide 6 · Synthetic Results',
    planet: 'Saturn',
    title: 'The synthetic benchmark shows that TrustStack reacts sensibly when corpus quality changes.',
    summary: 'Saturn now aligns with the report’s synthetic evaluation findings: aligned evidence scores highest, sparse and off-scope evidence score lowest, and grounding remains the dominant bottleneck.',
    background: 'The synthetic benchmark matters because it isolates failure modes under controlled conditions. The seven corpus packets intentionally stress contradiction, lexical drift, unsafe guidance, sparse evidence, and multi-source agreement so the evaluator can be tested before it is generalized.',
    researchQuestion: 'Does TrustStack’s scoring logic move in the right direction when the evidence environment becomes contradictory, sparse, or off-scope?',
    truststackResponse: 'Under deterministic lexical retrieval and extractive fallback generation, TrustStack meaningfully separates aligned packets from degraded packets and identifies grounding and retrieval as the weakest category.',
    academicTakeaway: 'The synthetic benchmark supports the claim that TrustStack behaves like an evaluator rather than a cosmetic scoring layer. It exposes a real systems bottleneck instead of hiding it.',
    visualTitle: 'Synthetic benchmark',
    visualCaption: 'Controlled stress tests show whether score movement follows changes in corpus quality.',
    visualStats: [
      { label: 'Best synthetic score', value: '76.44 / 100' },
      { label: 'Worst synthetic score', value: '59.97 / 100' },
      { label: 'Weakest category', value: 'Grounding + retrieval' },
    ],
    visualFlow: ['Stress corpus built', 'Suite executed', 'Scores compared', 'Failure surface identified'],
    reportSection: 'Synthetic Evaluation Findings',
    reportFigureCaption: 'Synthetic-results slide summarizing corpus conditions and the main score spread.',
  },
  {
    id: 'external-uranus',
    eyebrow: 'Slide 7 · External Benchmarks',
    planet: 'Uranus',
    title: 'Public benchmark results expose the strongest current weakness: calibration on external tasks.',
    summary: 'Uranus reflects the new report section added after the real benchmark pass. It shows that TrustStack is no longer evaluated only on synthetic data, but it also shows that the current local runtime is still underperforming on public tasks.',
    background: 'To narrow the biggest threat to validity, the report now includes checked-in SciFact and HotpotQA subsets. These external tasks pressure scientific claim verification and multi-hop question answering under the same evaluation pipeline used in the live system.',
    researchQuestion: 'Does TrustStack’s trust score remain meaningful when the evaluator is run on public benchmarks instead of internally authored stress corpora?',
    truststackResponse: 'The external slice shows strong citation alignment but weak task-level performance and a substantial calibration gap, which is academically valuable because it turns a vague limitation into a measured result.',
    academicTakeaway: 'This slide strengthens the project by being honest. TrustStack now has external evidence, and that evidence clearly shows where the current local runtime still needs improvement.',
    visualTitle: 'Real benchmark slice',
    visualCaption: 'Public-benchmark evaluation tests whether the trust signal survives beyond synthetic corpora.',
    visualStats: [
      { label: 'Aggregate trust score', value: '63.09 / 100' },
      { label: 'Task metric', value: '0.141' },
      { label: 'Citation alignment', value: '83.8%' },
    ],
    visualFlow: ['Public subset frozen', 'Evaluator rerun', 'Gap measured', 'Validity improved'],
    reportSection: 'Real Benchmark Evaluation',
    reportFigureCaption: 'External-results slide summarizing SciFact and HotpotQA benchmark findings.',
  },
  {
    id: 'validity-neptune',
    eyebrow: 'Slide 8 · Validity and Limitations',
    planet: 'Neptune',
    title: 'The project is strongest when its limitations are explicit, measured, and technically actionable.',
    summary: 'Neptune now mirrors the report’s threats-to-validity and limitations sections instead of repeating the methods slide. It explains what still constrains the current findings and how those constraints should be interpreted.',
    background: 'Even after adding public benchmark results, the report remains bounded by the local runtime, heuristic semantic checks, and the absence of a human analyst study. Those are real limitations, but they are now specified precisely enough to guide next-stage work.',
    researchQuestion: 'What claims can TrustStack defend today, and which claims still require stronger retrieval, formal semantic checking, or human-subject validation?',
    truststackResponse: 'The current system can defend that it is reproducible, evidence-traceable, and externally stress-tested. It cannot yet claim strong task accuracy on public benchmarks or demonstrated improvement in human decision quality.',
    academicTakeaway: 'This slide improves the credibility of the presentation by separating what TrustStack has shown from what still needs stronger empirical evidence.',
    visualTitle: 'Validity envelope',
    visualCaption: 'Threats to validity become more persuasive when they are quantified and tied to concrete next steps.',
    visualStats: [
      { label: 'Runtime bound', value: 'Lexical + extractive' },
      { label: 'Open threat', value: 'No analyst study yet' },
      { label: 'Measured gap', value: 'Calibration on public data' },
    ],
    visualFlow: ['Threat identified', 'Measured directly', 'Bound claim', 'Define next experiment'],
    reportSection: 'Threats to Validity and Limitations',
    reportFigureCaption: 'Validity slide summarizing remaining empirical and methodological limits.',
  },
  {
    id: 'conclusion-pluto',
    eyebrow: 'Slide 9 · Close',
    planet: 'Pluto',
    title: 'TrustStack contributes a reusable workflow for grounded evaluation, benchmarking, and reporting.',
    summary: 'Pluto closes the deck by returning to the paper’s conclusion: TrustStack is useful because it produces structured trust artifacts, not just interactive model output.',
    background: 'The strongest interpretation of the project is not that it solves trustworthy AI in full. It is that it provides a coherent, local-first framework for inspecting groundedness, exporting repeatable results, and revealing where trust still breaks.',
    researchQuestion: 'What should the audience leave with after the presentation: a demo impression, or a reproducible evaluation workflow they can analyze and extend?',
    truststackResponse: 'TrustStack connects live evidence review, a formal evaluation standard, synthetic and public benchmarking, and exportable IEEE-ready artifacts into one end-to-end research system.',
    academicTakeaway: 'The project’s main value is coherence: the interface, backend, benchmarks, and report now all express the same evaluation logic.',
    visualTitle: 'Project takeaway',
    visualCaption: 'The closing slide ties the system, the evaluation standard, and the report into one durable contribution.',
    visualStats: [
      { label: 'Main contribution', value: 'Evidence-first evaluator' },
      { label: 'Empirical support', value: 'Synthetic + external' },
      { label: 'Artifact', value: 'Report-ready outputs' },
    ],
    visualFlow: ['Question trust', 'Measure support', 'Expose weakness', 'Export evidence'],
    reportSection: 'Conclusion',
    reportFigureCaption: 'Conclusion slide aligning the final system contribution with the written report.',
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
  const emphasisValue =
    slide.planet === 'Mercury'
      ? `${documents.length} document${documents.length === 1 ? '' : 's'} ready for evaluation`
      : slide.planet === 'Jupiter' && suiteResult
        ? `${suiteResult.final_score}/100 ${suiteResult.verdict.toUpperCase()}`
        : slide.planet === 'Saturn'
          ? `${runs.length} recorded evaluation run${runs.length === 1 ? '' : 's'}`
          : slide.visualStats[0]?.value ?? ''

  return (
    <div className="presentation-slide">
      <div className="presentation-slide__lead">
        <div className="eyebrow">{slide.eyebrow}</div>
        <h2>{slide.title}</h2>
        <p>{slide.summary}</p>
      </div>

      <div className="presentation-slide__layout">
        <div className="presentation-slide__panel presentation-slide__panel--wide">
          <div className="eyebrow">Background</div>
          <h3>Why this section matters</h3>
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

        <div className="presentation-slide__panel presentation-slide__panel--wide">
          <div className="eyebrow">Academic Takeaway</div>
          <h3>Claim for the audience</h3>
          <p>{slide.academicTakeaway}</p>
        </div>

        <div className="presentation-slide__panel presentation-slide__panel--accent presentation-slide__visual">
          <div className="presentation-slide__visual-head">
            <div>
              <div className="eyebrow">{slide.visualTitle}</div>
              <h3>{emphasisValue}</h3>
            </div>
            <p>{slide.visualCaption}</p>
          </div>

          <div className="presentation-slide__stats">
            {slide.visualStats.map((item) => (
              <div className="presentation-slide__stat" key={`${slide.id}-${item.label}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="presentation-slide__flow" aria-label="slide visual flow">
            {slide.visualFlow.map((item, index) => (
              <div className="presentation-slide__flow-item" key={`${slide.id}-flow-${item}`}>
                <span>{item}</span>
                {index < slide.visualFlow.length - 1 ? <i aria-hidden="true" /> : null}
              </div>
            ))}
          </div>

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
