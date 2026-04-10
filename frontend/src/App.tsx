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
    subsystem: 'Source Readiness',
    planet: 'Mercury',
    title: 'Prepare verified source material',
    summary: 'Upload, organize, and normalize the evidence base so every TrustStack review begins with reliable context.',
    guideTitle: 'Dock at Mercury',
    guideMessage: 'Start the mission by loading source material and confirming the corpus is ready for evaluation.',
  },
  {
    id: 'robustness-venus',
    subsystem: 'Evaluation Design',
    planet: 'Venus',
    title: 'Shape the evaluation workflow',
    summary: 'Review the framework structure, scoring logic, and control layers that define how TrustStack evaluates responses.',
    guideTitle: 'Stabilize Venus',
    guideMessage: 'Use Venus to understand how the workflow is structured before sending a live prompt through the system.',
  },
  {
    id: 'privacy-earth',
    subsystem: 'Live Evaluation',
    planet: 'Earth',
    title: 'Run a grounded live query',
    summary: 'Submit a real question against the indexed corpus and see TrustStack respond with evidence-aware output.',
    guideTitle: 'Orbit Earth',
    guideMessage: 'Submit a live query here. TrustStack will stay on Earth until the response is ready or you advance manually.',
  },
  {
    id: 'bias-mars',
    subsystem: 'Evidence Review',
    planet: 'Mars',
    title: 'Inspect evidence and weak spots',
    summary: 'Break down the answer, trace its support, and pinpoint where the evidence is incomplete or missing.',
    guideTitle: 'Inspect Mars',
    guideMessage: 'Review the answer and its supporting evidence here before moving on to the risk summary.',
  },
  {
    id: 'monitoring-jupiter',
    subsystem: 'Risk Summary',
    planet: 'Jupiter',
    title: 'Surface trust and risk signals',
    summary: 'Translate raw evaluation output into confidence indicators, risk flags, and decision-ready oversight signals.',
    guideTitle: 'Read Jupiter',
    guideMessage: 'Use Jupiter to review the trust posture before moving into long-term performance history.',
  },
  {
    id: 'hallucination-saturn',
    subsystem: 'Performance History',
    planet: 'Saturn',
    title: 'Review performance over time',
    summary: 'Examine historical runs to catch drift, inconsistency, and recurring hallucination patterns before deployment.',
    guideTitle: 'Survey Saturn',
    guideMessage: 'Saturn is the historical view. Review prior runs here before exploring the broader framework and method.',
  },
  {
    id: 'framework-uranus',
    subsystem: 'System Blueprint',
    planet: 'Uranus',
    title: 'Explore the TrustStack blueprint',
    summary: 'Navigate the full system map and see how each evaluation stage contributes to the final trust verdict.',
    guideTitle: 'Chart Uranus',
    guideMessage: 'Uranus provides the full system blueprint so you can orient the entire TrustStack pipeline in one place.',
  },
  {
    id: 'methodology-neptune',
    subsystem: 'Evaluation Method',
    planet: 'Neptune',
    title: 'Ground the experience in method',
    summary: 'Connect the interface to a defensible evaluation methodology suitable for academic, research, and enterprise review.',
    guideTitle: 'Anchor Neptune',
    guideMessage: 'Review the evaluation method here to connect the visual experience to a rigorous underlying framework.',
  },
  {
    id: 'author-pluto',
    subsystem: 'System Overview',
    planet: 'Pluto',
    title: 'View the full TrustStack workflow at once',
    summary: 'Use Pluto as a consolidated overview page for anyone who prefers to scan every subsystem in one place.',
    guideTitle: 'Survey Pluto',
    guideMessage: 'Pluto combines the full TrustStack journey into one page for users who want a direct, non-cinematic overview.',
  },
]

function SystemOverviewCard({ nodes }: { nodes: TourNode[] }) {
  return (
    <div className="panel panel--glass stack">
      <div className="panel-header">
        <div>
          <div className="eyebrow">System Overview</div>
          <h2>See every TrustStack subsystem on one page.</h2>
        </div>
      </div>
      <p className="muted">
        Pluto now acts as the practical overview mode. It summarizes the full TrustStack workflow for users who want a
        direct map of the platform without stepping through each planet individually.
      </p>
      <div className="overview-grid">
        {nodes.map((node, index) => (
          <article key={node.id} className="overview-card">
            <div className="framework-node-topline">
              <span>{node.planet}</span>
              <strong>{String(index + 1).padStart(2, '0')}</strong>
            </div>
            <h3>{node.subsystem}</h3>
            <p className="muted">{node.summary}</p>
          </article>
        ))}
      </div>
      <div className="pill-grid">
        <span className="data-pill">Full subsystem scan</span>
        <span className="data-pill">Low-friction overview mode</span>
        <span className="data-pill">TrustStack at a glance</span>
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
        return <SystemOverviewCard nodes={TOUR_NODES.slice(0, -1)} />
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
