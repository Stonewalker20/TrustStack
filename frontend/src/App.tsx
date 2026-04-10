import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
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

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [runs, setRuns] = useState<RunItem[]>([])
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const consoleRef = useRef<HTMLElement | null>(null)
  const methodologyRef = useRef<HTMLElement | null>(null)

  const { scrollYProgress } = useScroll()
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1])

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

  return (
    <div className="app-root">
      <motion.div className="scroll-progress" style={{ scaleX: progressScale }} />

      <TrustHero
        onRunEvaluation={() => consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        onExploreFramework={() => methodologyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      <FrameworkExplorer signals={trustSignals} latestResult={result} />

      <section className="console-shell" ref={consoleRef}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">Trust Operations Console</div>
            <h2>Run evaluations, inspect evidence, and surface risk in one place.</h2>
          </div>
          <p>
            The dashboard below is the proof layer. It connects directly to your TrustStack backend so you can ingest
            documents, run grounded queries, and show why a model response should or should not be trusted.
          </p>
        </div>

        <div className="ops-layout">
          <aside className="ops-column">
            <UploadPanel onUploaded={() => refreshDocuments().catch(console.error)} />
            <DocumentList items={documents} />
            <RunHistoryTable items={runs} />
          </aside>

          <main className="ops-column ops-main">
            <QueryBox onSubmit={handleSubmit} loading={loading} />
            <AnswerCard result={result} />
            <EvidencePanel result={result} />
          </main>

          <aside className="ops-column">
            <RiskPanel result={result} />
            <ResultsSection result={result} runs={runs} signals={trustSignals} />
          </aside>
        </div>
      </section>

      <section className="methodology-shell" ref={methodologyRef}>
        <MethodologySection />
      </section>
    </div>
  )
}
