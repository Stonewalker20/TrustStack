import type { RunItem } from '../types'

export function RunHistoryTable({ items }: { items: RunItem[] }) {
  return (
    <div className="panel hud-module hud-module--compact">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Run Ledger</div>
          <h3>Recent evaluations</h3>
        </div>
        <span className="badge">{items.length} tracked</span>
      </div>
      <div className="list">
        {items.map((run) => (
          <div className="card card--elevated hud-history-item" key={run.id}>
            <div className="card-topline">
              <strong>{run.question}</strong>
              <span className="badge badge--bright">{run.confidence_score}</span>
            </div>
            <div className="muted">{new Date(run.created_at).toLocaleString()}</div>
            <div className="muted" style={{ marginTop: 6 }}>{run.trust_summary}</div>
          </div>
        ))}
        {items.length === 0 ? <div className="muted">No runs yet.</div> : null}
      </div>
    </div>
  )
}
