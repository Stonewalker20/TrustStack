import { useMemo, useState } from 'react'
import type { SampleQuestionItem } from '../types'

type QueryBoxProps = {
  onSubmit: (question: string) => void
  loading: boolean
  sampleQuestions?: SampleQuestionItem[]
}

export function QueryBox({ onSubmit, loading, sampleQuestions = [] }: QueryBoxProps) {
  const [question, setQuestion] = useState('')

  const suggestedQuestions = useMemo(() => sampleQuestions.slice(0, 4), [sampleQuestions])

  return (
    <div className="panel panel--glass stack">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Run Evaluation</div>
          <h2>Probe the model with a grounded question</h2>
        </div>
      </div>

      <textarea
        className="textarea"
        placeholder="Ask a grounded question over your indexed documents..."
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
      />

      <div className="query-actions">
        <button className="primary primary--glow" disabled={loading || !question.trim()} onClick={() => onSubmit(question)}>
          {loading ? 'Evaluating…' : 'Run Query'}
        </button>
        <div className="muted">Best demo pattern: ask one clearly supported question, then one weakly supported question.</div>
      </div>

      <div className="query-suggestions">
        <div className="query-suggestions-label">Suggested prompts from your evidence</div>
        <div className="pill-grid">
          {suggestedQuestions.length > 0 ? (
            suggestedQuestions.map((prompt) => (
              <button key={prompt.question} type="button" className="query-suggestion" onClick={() => setQuestion(prompt.question)}>
                <span className="query-suggestion-copy">{prompt.question}</span>
                {prompt.source ? <small>{prompt.source}</small> : null}
              </button>
            ))
          ) : (
            <span className="data-pill">Upload documents to generate sharper prompts.</span>
          )}
        </div>
      </div>
    </div>
  )
}
