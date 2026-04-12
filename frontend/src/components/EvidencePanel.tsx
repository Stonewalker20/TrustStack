import { motion } from 'motion/react'
import type { QueryResponse } from '../types'

export function EvidencePanel({ result }: { result: QueryResponse | null }) {
  return (
    <div className="panel hud-module hud-module--compact">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Evidence Layer</div>
          <h2>Retrieved support</h2>
        </div>
      </div>
      <div className="list">
        {!result ? <div className="muted">Retrieved evidence will appear here once a run completes.</div> : null}
        {result?.evidence.map((item, index) => (
          <motion.div className="card card--elevated hud-evidence-item" key={item.chunk_id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <div className="card-topline">
              <strong>{item.source}</strong>
              <span className="badge">score {item.score}</span>
            </div>
            <div className="muted">
              Chunk {item.chunk_id}
              {item.page ? ` · page ${item.page}` : ''}
            </div>
            <div className="answer-box" style={{ marginTop: 10 }}>{item.text}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
