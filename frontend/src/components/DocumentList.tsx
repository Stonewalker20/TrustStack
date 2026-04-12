import type { DocumentItem } from '../types'

export function DocumentList({ items }: { items: DocumentItem[] }) {
  return (
    <div className="panel hud-module hud-module--compact">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Evidence Store</div>
          <h3>Indexed documents</h3>
        </div>
        <span className="badge">{items.length} loaded</span>
      </div>
      <div className="list">
        {items.map((doc) => (
          <div className="card card--elevated hud-list-item" key={doc.id}>
            <div className="card-topline">
              <strong>{doc.filename}</strong>
              <span className="status-dot" />
            </div>
            <div className="muted">{new Date(doc.uploaded_at).toLocaleString()}</div>
          </div>
        ))}
        {items.length === 0 ? <div className="muted">No documents indexed yet.</div> : null}
      </div>
    </div>
  )
}
