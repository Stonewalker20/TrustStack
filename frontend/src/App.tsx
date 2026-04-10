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
import type { DocumentItem, QueryResponse, RunItem } from './types'

type TourNode = {
  id: string
  subsystem: string
  planet: string
  title: string
  summary: string
  guideTitle: string
  guideMessage: string
}

const TOUR_NODES: TourNode[] = [
  {
    id: 'safety-mercury',
    subsystem: 'Safety Intake',
    planet: 'Mercury',
    title: 'Launch with verified source material',
    summary: 'Upload and normalize the evidence base so every evaluation begins with trusted, inspection-ready context.',
    guideTitle: 'Dock at Mercury',
    guideMessage: 'Start the mission by uploading source material. Once the corpus is loaded, move onward to frame the evaluation path.',
  },
  {
    id: 'robustness-venus',
    subsystem: 'Robustness Bench',
    planet: 'Venus',
    title: 'Design the evaluation pathway',
    summary: 'Configure the trust workflow, scoring logic, and control layers that shape how TrustStack tests the model.',
    guideTitle: 'Stabilize Venus',
    guideMessage: 'Review the framework map here, then continue when you are ready to run a grounded prompt through the stack.',
  },
  {
    id: 'privacy-earth',
    subsystem: 'Privacy Query',
    planet: 'Earth',
    title: 'Run a live grounded review',
    summary: 'Ask a real question against the indexed corpus and watch TrustStack return an evidence-aware response.',
    guideTitle: 'Orbit Earth',
    guideMessage: 'Submit a query from Earth. TrustStack will hold here until the response is generated or you manually advance.',
  },
  {
    id: 'bias-mars',
    subsystem: 'Bias Evidence',
    planet: 'Mars',
    title: 'Inspect evidence and gaps',
    summary: 'Break down the answer, its retrieval support, and the exact places where coverage is weak or missing.',
    guideTitle: 'Inspect Mars',
    guideMessage: 'Use this stop to inspect the answer and the supporting evidence. Move on after you are satisfied with the grounding.',
  },
  {
    id: 'monitoring-jupiter',
    subsystem: 'Monitoring Risk',
    planet: 'Jupiter',
    title: 'Surface trust and operating risk',
    summary: 'Turn raw output into decision-ready risk flags, confidence signals, and oversight insights.',
    guideTitle: 'Read Jupiter',
    guideMessage: 'Jupiter consolidates confidence, risk, and monitoring signals. This is the checkpoint for operational trust decisions.',
  },
  {
    id: 'hallucination-saturn',
    subsystem: 'Hallucination History',
    planet: 'Saturn',
    title: 'Track performance over time',
    summary: 'Review historical runs to spot drift, inconsistency, and recurring hallucination patterns before rollout.',
    guideTitle: 'Survey Saturn',
    guideMessage: 'Examine prior runs and drift patterns here before moving into the broader framework and methodology views.',
  },
  {
    id: 'framework-uranus',
    subsystem: 'Framework Ops',
    planet: 'Uranus',
    title: 'Explore the operating framework',
    summary: 'Navigate the full TrustStack system map and see how each evaluation chamber contributes to the final verdict.',
    guideTitle: 'Chart Uranus',
    guideMessage: 'This stop gives you the live operator view of the framework. Use it to orient the full pipeline in one place.',
  },
  {
    id: 'methodology-neptune',
    subsystem: 'Methodology',
    planet: 'Neptune',
    title: 'Back the experience with method',
    summary: 'Connect the cinematic interface to a defensible evaluation methodology suitable for academic and enterprise review.',
    guideTitle: 'Anchor Neptune',
    guideMessage: 'Neptune connects the interface to a defensible evaluation method. Review the method notes before the final stop.',
  },
  {
    id: 'author-pluto',
    subsystem: 'Author Recognition',
    planet: 'Pluto',
    title: 'Meet the builder behind TrustStack',
    summary: 'Reserve Pluto for the project author, product vision, and the intent driving the full TrustStack experience.',
    guideTitle: 'Land on Pluto',
    guideMessage: 'Pluto is reserved for the author recognition page. Use it as the closing frame for the full TrustStack journey.',
  },
]

function AuthorRecognitionCard() {
  return (
    <div className="panel panel--glass stack">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Author Recognition</div>
          <h2>Pluto is reserved for the builder behind TrustStack.</h2>
        </div>
      </div>
      <p className="muted">
        TrustStack was assembled as a full trust-evaluation experience rather than a simple chatbot shell: evidence grounding, risk signaling, subsystem mapping, and cinematic presentation are all part of the same thesis.
      </p>
      <div className="framework-note">
        <strong>Author</strong>
        <div>Cordell Stonecipher</div>
      </div>
      <div className="pill-grid">
        <span className="data-pill">Trust evaluation</span>
        <span className="data-pill">RAG evidence review</span>
        <span className="data-pill">Interactive solar-system interface</span>
      </div>
    </div>
  )
}

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [runs, setRuns] = useState<RunItem[]>([])
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activePlanetIndex, setActivePlanetIndex] = useState(0)
  const [guideEnabled, setGuideEnabled] = useState(true)

  const refreshDocuments = async () => {
    const res = await api.get<DocumentItem[]>('/documents')
    setDocuments(res.data)
  }

  const refreshRuns = async () => {
    const res = await api.get<RunItem[]>('/runs')
    setRuns(res.data)
  }

  useEffect(() => {
    refreshDocuments().catch(console.error)
    refreshRuns().catch(console.error)
  }, [])

  const handleSubmit = async (question: string) => {
    setLoading(true)
    try {
      const res = await api.post<QueryResponse>('/query', { question, top_k: 5 })
      setResult(res.data)
      refreshRuns().catch(console.error)
      setActivePlanetIndex(3)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
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
    switch (activePlanetIndex) {
      case 0:
        return (
          <div className="stage-stack">
            <UploadPanel
              onUploaded={() => {
                refreshDocuments().catch(console.error)
                if (guideEnabled && activePlanetIndex === 0) {
                  setActivePlanetIndex(1)
                }
              }}
            />
            <DocumentList items={documents} />
          </div>
        )
      case 1:
        return <FrameworkExplorer signals={trustSignals} latestResult={result} />
      case 2:
        return <QueryBox onSubmit={handleSubmit} loading={loading} />
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
            <ResultsSection result={result} runs={runs} signals={trustSignals} />
          </div>
        )
      case 5:
        return <RunHistoryTable items={runs} />
      case 6:
        return <FrameworkExplorer signals={trustSignals} latestResult={result} />
      case 7:
        return <MethodologySection />
      case 8:
        return <AuthorRecognitionCard />
      default:
        return null
    }
  }, [activePlanetIndex, documents, guideEnabled, loading, result, runs, trustSignals])

  return (
    <div className="app-root app-root--fixed">
      <TrustHero
        nodes={TOUR_NODES}
        activeIndex={activePlanetIndex}
        guideEnabled={guideEnabled}
        detailPanel={activePanel}
        onActiveIndexChange={setActivePlanetIndex}
        onGuideEnabledChange={setGuideEnabled}
      />
    </div>
  )
}
