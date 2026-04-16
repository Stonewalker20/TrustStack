import { useState } from 'react'

type QueryBoxProps = {
  onSubmit: (question: string) => Promise<void>
  loading: boolean
  error?: string
}

export function QueryBox({ onSubmit, loading, error = '' }: QueryBoxProps) {
  const [question, setQuestion] = useState('')
  const canSubmit = Boolean(question.trim()) && !loading

  return (
    <div className="panel panel--glass stack" data-testid="query-box">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Run Evaluation</div>
          <h2>Probe the model with a grounded question</h2>
        </div>
      </div>
      <div className="helper-callout">
        <strong>Ask for something the evidence can actually support</strong>
        <p>Use a specific, factual question. Avoid broad opinions or claims that go beyond the uploaded documents.</p>
      </div>

      <textarea
        className="textarea"
        data-testid="query-input"
        placeholder="Ask a grounded question over your indexed documents..."
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
      />
      <div className="micro-status">
        <span className="micro-status__label">Query readiness</span>
        <strong>{canSubmit ? 'Ready to run' : 'Add a grounded question to continue'}</strong>
      </div>

      <div className="query-actions">
        <button
          className="primary primary--glow"
          data-testid="query-submit"
          disabled={!canSubmit}
          onClick={() => void onSubmit(question)}
        >
          {loading ? 'Evaluating…' : 'Run Query'}
        </button>
        <div className="muted">Ask one specific question at a time so the evidence and score stay easy to inspect.</div>
      </div>

      <div className={`muted ${error ? '' : 'muted--large'}`} data-testid="query-status">
        {error || 'TrustStack will show either a scored result or a concrete error after each query run.'}
      </div>
    </div>
  )
}
