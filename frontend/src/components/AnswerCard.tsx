import { motion } from 'motion/react'
import type { QueryResponse } from '../types'

export function AnswerCard({ result }: { result: QueryResponse | null }) {
  return (
    <div className="panel panel--glass stack hud-module hud-module--primary">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Final Verdict</div>
          <h2>Grounded answer</h2>
        </div>
        <div className="badge badge--bright">{result ? `${result.confidence_score}/100 confidence` : 'Awaiting run'}</div>
      </div>
      {!result ? <div className="muted">Run a query to see the grounded answer, citations, and trust summary.</div> : null}
      {result ? (
        <>
          <motion.div className="answer-box answer-box--hero hud-copy-block" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {result.answer}
          </motion.div>
          <div className="muted muted--large">{result.trust_summary}</div>
          <div className="citation-grid">
            {result.citations.length ? result.citations.map((c) => <div className="citation-chip" key={c}>{c}</div>) : <div className="muted">No citations returned.</div>}
          </div>
        </>
      ) : null}
    </div>
  )
}
