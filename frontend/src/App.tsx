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
}

const TOUR_NODES: TourNode[] = [
  { id: 'safety-mercury', subsystem: 'Safety Intake', planet: 'Mercury', title: 'Ingest source material', summary: 'Upload and normalize the evidence base before the model is touched.' },
  { id: 'robustness-venus', subsystem: 'Robustness Bench', planet: 'Venus', title: 'Frame the evaluation path', summary: 'Define how the framework stages the test, scoring path, and control logic.' },
  { id: 'privacy-earth', subsystem: 'Privacy Query', planet: 'Earth', title: 'Run the grounded evaluation', summary: 'Probe the indexed corpus with a live question and watch TrustStack respond.' },
  { id: 'bias-mars', subsystem: 'Bias Evidence', planet: 'Mars', title: 'Inspect answer evidence', summary: 'See the answer, retrieval support, and the places where evidence is weak or missing.' },
  { id: 'monitoring-jupiter', subsystem: 'Monitoring Risk', planet: 'Jupiter', title: 'Assess trust and operational risk', summary: 'Surface risk flags, confidence, and decision-ready monitoring signals.' },
  { id: 'hallucination-saturn', subsystem: 'Hallucination History', planet: 'Saturn', title: 'Review longitudinal run history', summary: 'Track how repeated runs behave over time and where drift appears.' },
  { id: 'framework-uranus', subsystem: 'Framework Ops', planet: 'Uranus', title: 'Survey the live framework map', summary: 'Walk the major stages of the TrustStack pipeline as an operator.' },
  { id: 'methodology-neptune', subsystem: 'Methodology', planet: 'Neptune', title: 'Ground the demo in method', summary: 'Tie the cinematic interface back to an academically credible evaluation design.' },
  { id: 'author-pluto', subsystem: 'Author Recognition', planet: 'Pluto', title: 'Recognize the builder', summary: 'Reserve Pluto for the project author and the intent behind TrustStack.' },
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
  const [autoTour, setAutoTour] = useState(true)

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

  useEffect(() => {
    if (!autoTour) return
    const timer = window.setInterval(() => {
      setActivePlanetIndex((current) => (current + 1) % TOUR_NODES.length)
    }, 9000)
    return () => window.clearInterval(timer)
  }, [autoTour])

  const handleSubmit = async (question: string) => {
    setLoading(true)
    try {
      const res = await api.post<QueryResponse>('/query', { question, top_k: 5 })
      setResult(res.data)
      refreshRuns().catch(console.error)
      setAutoTour(false)
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
            <UploadPanel onUploaded={() => refreshDocuments().catch(console.error)} />
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
  }, [activePlanetIndex, documents, loading, result, runs, trustSignals])

  return (
    <div className="app-root app-root--fixed">
      <TrustHero
        nodes={TOUR_NODES}
        activeIndex={activePlanetIndex}
        autoTour={autoTour}
        detailPanel={activePanel}
        onActiveIndexChange={(index) => {
          setAutoTour(false)
          setActivePlanetIndex(index)
        }}
        onToggleAutoTour={() => setAutoTour((current) => !current)}
        onNext={() => {
          setAutoTour(false)
          setActivePlanetIndex((current) => (current + 1) % TOUR_NODES.length)
        }}
        onPrevious={() => {
          setAutoTour(false)
          setActivePlanetIndex((current) => (current - 1 + TOUR_NODES.length) % TOUR_NODES.length)
        }}
      />
    </div>
  )
}
