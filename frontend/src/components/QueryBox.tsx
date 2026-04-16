import { useMemo, useState } from 'react'
import type { SampleQuestionItem } from '../types'

type QueryBoxProps = {
  onSubmit: (question: string) => Promise<void>
  loading: boolean
  sampleQuestions?: SampleQuestionItem[]
  error?: string
}

export function QueryBox({ onSubmit, loading, sampleQuestions = [], error = '' }: QueryBoxProps) {
  const [question, setQuestion] = useState('')

  const suggestedQuestions = useMemo(() => sampleQuestions.slice(0, 4), [sampleQuestions])
  const canSubmit = Boolean(question.trim()) && !loading
  const handleSuggestionClick = (promptQuestion: string) => {
    setQuestion(promptQuestion)
    if (!loading) {
      void onSubmit(promptQuestion)
    }
  }

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
        <div className="muted">Best evaluation pattern: ask one clearly supported question first, then one weakly supported question.</div>
      </div>

      <div className={`muted ${error ? '' : 'muted--large'}`} data-testid="query-status">
        {error || 'TrustStack will show either a scored result or a concrete error after each query run.'}
      </div>

      <div className="query-suggestions" data-testid="query-suggestions">
        <div className="query-suggestions-label">Suggested prompts from your evidence</div>
        <div className="pill-grid">
          {suggestedQuestions.length > 0 ? (
            suggestedQuestions.map((prompt) => (
              <button
                key={prompt.question}
                type="button"
                className="query-suggestion"
                data-testid="query-suggestion"
                onClick={() => handleSuggestionClick(prompt.question)}
              >
                <span className="query-suggestion-copy">{prompt.question}</span>
                <small>
                  {(prompt.support_level === 'weak' ? 'Weak test' : 'Supported question')}
                  {prompt.source ? ` - ${prompt.source}` : ''}
                </small>
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
