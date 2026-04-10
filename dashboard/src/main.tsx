import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';

type ResultItem = {
  provider_id?: string;
  suite_id?: string;
  item_id?: string;
  prompt?: string;
  response_text?: string;
  passed?: boolean;
  score?: number;
  max_score?: number;
  reason?: string;
};

type SummaryItem = {
  id?: string;
  name?: string;
  total?: number;
  passed?: number;
  failed?: number;
  score?: number;
  max_score?: number;
  pass_rate?: number;
};

type RunPayload = {
  run_id?: string;
  run_name?: string;
  generated_at?: string;
  config?: Record<string, unknown>;
  summary?: SummaryItem & { total?: number; passed?: number; failed?: number; score?: number; max_score?: number; pass_rate?: number };
  provider_summaries?: SummaryItem[];
  suite_summaries?: SummaryItem[];
  results?: ResultItem[];
};

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function normalizeRatio(value?: number) {
  if (typeof value !== 'number') return 0;
  return value > 1 ? value / 100 : value;
}

function normalizeScore(score?: number, maxScore?: number) {
  if (typeof score !== 'number' || typeof maxScore !== 'number' || maxScore <= 0) return 0;
  return Math.max(0, Math.min(100, (score / maxScore) * 100));
}

function summarizeConfig(config?: Record<string, unknown>) {
  if (!config) return [];
  return Object.entries(config).map(([key, value]) => {
    if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
    if (value && typeof value === 'object') return `${key}: object`;
    return `${key}: ${String(value)}`;
  });
}

function LoadingState() {
  return (
    <section className="panel hero">
      <p className="eyebrow">TrustStack</p>
      <h1>Loading latest run artifacts</h1>
      <p className="muted">Fetching <code>/data/latest.json</code> and preparing the evaluation summary.</p>
    </section>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="panel empty-state">
      <p className="eyebrow">TrustStack</p>
      <h1>{title}</h1>
      <p className="muted">{detail}</p>
      <div className="empty-card">
        <p>No dashboard data is available yet.</p>
        <p className="muted">Run the evaluator to generate <code>/data/latest.json</code>.</p>
      </div>
    </section>
  );
}

function App() {
  const [data, setData] = useState<RunPayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const response = await fetch('/data/latest.json', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load /data/latest.json (${response.status} ${response.statusText})`);
        }
        const payload = (await response.json()) as RunPayload;
        if (alive) {
          setData(payload);
          setStatus('ready');
        }
      } catch (err) {
        if (!alive) return;
        const message = err instanceof Error ? err.message : 'Unable to load dashboard data.';
        setError(message);
        setStatus('error');
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const normalized = useMemo(() => {
    const results = [...(data?.results ?? [])];
    const total = data?.summary?.total ?? results.length;
    const passed = data?.summary?.passed ?? results.filter((result) => result.passed === true).length;
    const failed = data?.summary?.failed ?? results.filter((result) => result.passed === false).length;
    const score = data?.summary?.score ?? results.reduce((sum, result) => sum + (result.score ?? 0), 0);
    const maxScore = data?.summary?.max_score ?? results.reduce((sum, result) => sum + (result.max_score ?? 0), 0);
    const passRate = normalizeRatio(data?.summary?.pass_rate ?? (total > 0 ? passed / total : 0));
    const highRisk = results.filter((result) => result.passed === false).slice(0, 8);

    return {
      total,
      passed,
      failed,
      score,
      maxScore,
      passRate,
      highRisk,
      configLines: summarizeConfig(data?.config),
    };
  }, [data]);

  const providerRows = data?.provider_summaries ?? [];
  const suiteRows = data?.suite_summaries ?? [];
  const resultRows = data?.results ?? [];

  if (status === 'loading') {
    return (
      <>
        <GlobalStyles />
        <main className="shell">
          <LoadingState />
        </main>
      </>
    );
  }

  if (status === 'error' || !data) {
    return (
      <>
        <GlobalStyles />
        <main className="shell">
          <EmptyState title="Dashboard unavailable" detail={error || 'No run artifact could be loaded.'} />
        </main>
      </>
    );
  }

  const scorePct = normalizeScore(normalized.score, normalized.maxScore);

  return (
    <>
      <GlobalStyles />
      <main className="shell">
        <section className="hero panel">
          <div>
            <p className="eyebrow">TrustStack run report</p>
            <h1>{data.run_name || 'Unnamed run'}</h1>
            <p className="muted">
              {data.run_id || 'No run id'} · {data.generated_at || 'Unknown timestamp'}
            </p>
          </div>
          <div className="hero-metric">
            <span>Overall score</span>
            <strong>{numberFormat.format(scorePct)}%</strong>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${scorePct}%` }} />
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          <MetricCard label="Evaluations" value={normalized.total} detail={`${normalized.passed} passed · ${normalized.failed} failed`} />
          <MetricCard label="Pass rate" value={`${numberFormat.format(normalized.passRate * 100)}%`} detail="Derived from the latest results payload" />
          <MetricCard label="Scored points" value={`${numberFormat.format(normalized.score)}/${numberFormat.format(normalized.maxScore || 0)}`} detail="Aggregated across results" />
          <MetricCard label="Suites" value={suiteRows.length} detail="Configured evaluation suites" />
        </section>

        <section className="grid-2">
          <Panel title="Run configuration" subtitle="The evaluator settings captured in the artifact.">
            {normalized.configLines.length ? (
              <ul className="config-list">
                {normalized.configLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No config block was included in the artifact.</p>
            )}
          </Panel>

          <Panel title="Provider comparison" subtitle="Comparison by provider across the latest run.">
            <ComparisonTable rows={providerRows} />
          </Panel>
        </section>

        <section className="grid-2">
          <Panel title="Suite comparison" subtitle="Score and pass/fail trend by suite.">
            <ComparisonTable rows={suiteRows} />
          </Panel>

          <Panel title="Highest-risk findings" subtitle="Recent failures that need inspection first.">
            {normalized.highRisk.length ? (
              <div className="finding-list">
                {normalized.highRisk.map((result, index) => (
                  <article className="finding" key={`${result.provider_id ?? 'provider'}-${result.suite_id ?? 'suite'}-${result.item_id ?? index}`}>
                    <div className="finding-head">
                      <strong>{result.item_id || 'unnamed item'}</strong>
                      <span className={result.passed ? 'chip chip-pass' : 'chip chip-fail'}>{result.passed ? 'passed' : 'failed'}</span>
                    </div>
                    <p className="muted">
                      {result.provider_id || 'unknown provider'} · {result.suite_id || 'unknown suite'}
                    </p>
                    <p>{result.reason || result.response_text || 'No rationale was recorded.'}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">No failed items were found in the latest artifact.</p>
            )}
          </Panel>
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <h2>Recent results</h2>
              <p className="muted">Raw item-level records from <code>/data/latest.json</code>.</p>
            </div>
          </div>
          {resultRows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Suite</th>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {resultRows.slice(0, 12).map((result, index) => (
                    <tr key={`${result.provider_id ?? 'provider'}-${result.item_id ?? index}`}>
                      <td>{result.provider_id || 'unknown'}</td>
                      <td>{result.suite_id || 'unknown'}</td>
                      <td>
                        <div className="cell-stack">
                          <strong>{result.item_id || 'unnamed item'}</strong>
                          <span className="muted clamp">{result.prompt || 'No prompt recorded'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={result.passed ? 'chip chip-pass' : 'chip chip-fail'}>{result.passed ? 'passed' : 'failed'}</span>
                      </td>
                      <td>
                        {numberFormat.format(result.score ?? 0)} / {numberFormat.format(result.max_score ?? 0)}
                      </td>
                      <td className="clamp">{result.reason || result.response_text || 'No reason recorded.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">The artifact does not include result rows yet.</p>
          )}
        </section>
      </main>
    </>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: React.ReactNode; detail: string }) {
  return (
    <article className="panel metric-card">
      <span className="eyebrow">{label}</span>
      <strong className="metric-value">{value}</strong>
      <p className="muted">{detail}</p>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <article className="panel">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function ComparisonTable({ rows }: { rows: SummaryItem[] }) {
  if (!rows.length) {
    return <p className="muted">No summary rows were included in the latest artifact.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Pass rate</th>
            <th>Score</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const total = row.total ?? (row.passed ?? 0) + (row.failed ?? 0);
            const passRate = row.pass_rate ?? (total > 0 ? (row.passed ?? 0) / total : 0);
            const scorePct = normalizeScore(row.score, row.max_score);

            return (
              <tr key={`${row.id ?? row.name ?? 'summary'}-${index}`}>
                <td>{row.name || row.id || 'unnamed summary'}</td>
                <td>
                  <div className="cell-stack">
                    <span>{numberFormat.format(passRate * 100)}%</span>
                    <div className="bar bar-small">
                      <div className="bar-fill" style={{ width: `${passRate * 100}%` }} />
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cell-stack">
                    <span>{numberFormat.format(scorePct)}%</span>
                    <span className="muted">
                      {numberFormat.format(row.score ?? 0)} / {numberFormat.format(row.max_score ?? 0)}
                    </span>
                  </div>
                </td>
                <td>{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      :root {
        color-scheme: light;
        --bg: #f3efe7;
        --bg-accent: #d8e7df;
        --panel: rgba(255, 252, 247, 0.86);
        --panel-border: rgba(35, 38, 47, 0.08);
        --text: #14212b;
        --muted: #5f6c78;
        --accent: #0d6b62;
        --accent-soft: rgba(13, 107, 98, 0.14);
        --danger: #8b2f2f;
        --danger-soft: rgba(139, 47, 47, 0.14);
        --shadow: 0 24px 80px rgba(23, 31, 43, 0.10);
      }

      * {
        box-sizing: border-box;
      }

      html, body, #root {
        min-height: 100%;
      }

      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Avenir Next", "Trebuchet MS", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(216, 231, 223, 0.95), transparent 35%),
          radial-gradient(circle at top right, rgba(243, 220, 199, 0.65), transparent 30%),
          linear-gradient(180deg, var(--bg), #f8f6f1 60%, #f4f1ea);
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background-image: linear-gradient(rgba(20, 33, 43, 0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 33, 43, 0.018) 1px, transparent 1px);
        background-size: 34px 34px;
        mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 90%);
      }

      .shell {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 32px 0 40px;
        display: grid;
        gap: 20px;
      }

      .panel {
        position: relative;
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 24px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(12px);
      }

      .hero {
        padding: 28px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
      }

      .hero h1, h2, p {
        margin: 0;
      }

      .hero h1 {
        font-family: "IBM Plex Serif", "Iowan Old Style", Georgia, serif;
        font-size: clamp(2rem, 3vw, 3.4rem);
        line-height: 1;
        letter-spacing: -0.04em;
        margin-top: 6px;
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--accent);
      }

      .muted {
        color: var(--muted);
      }

      .hero-metric {
        min-width: 260px;
        padding: 18px 20px;
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(13, 107, 98, 0.08), rgba(13, 107, 98, 0.03));
        border: 1px solid rgba(13, 107, 98, 0.12);
      }

      .hero-metric span {
        display: block;
        font-size: 0.82rem;
        color: var(--muted);
      }

      .hero-metric strong {
        display: block;
        font-size: 2.5rem;
        line-height: 1;
        margin: 8px 0 12px;
      }

      .metrics-grid, .grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
      }

      .metrics-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .metric-card {
        padding: 22px;
        min-height: 150px;
        display: grid;
        align-content: space-between;
      }

      .metric-value {
        font-size: clamp(1.7rem, 2vw, 2.2rem);
        letter-spacing: -0.04em;
      }

      .section-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
      }

      .section-head h2 {
        font-family: "IBM Plex Serif", "Iowan Old Style", Georgia, serif;
        font-size: 1.08rem;
        letter-spacing: -0.02em;
      }

      .config-list {
        margin: 0;
        padding-left: 18px;
        display: grid;
        gap: 8px;
      }

      .table-wrap {
        overflow: auto;
        border-radius: 18px;
        border: 1px solid rgba(20, 33, 43, 0.08);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 640px;
        background: rgba(255, 255, 255, 0.5);
      }

      th, td {
        padding: 14px 16px;
        border-bottom: 1px solid rgba(20, 33, 43, 0.07);
        vertical-align: top;
        text-align: left;
        font-size: 0.94rem;
      }

      th {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--muted);
        background: rgba(255, 255, 255, 0.62);
      }

      tbody tr:hover {
        background: rgba(13, 107, 98, 0.03);
      }

      .cell-stack {
        display: grid;
        gap: 6px;
      }

      .clamp {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        width: fit-content;
      }

      .chip-pass {
        color: var(--accent);
        background: var(--accent-soft);
      }

      .chip-fail {
        color: var(--danger);
        background: var(--danger-soft);
      }

      .bar {
        height: 10px;
        border-radius: 999px;
        background: rgba(20, 33, 43, 0.08);
        overflow: hidden;
      }

      .bar-small {
        height: 8px;
      }

      .bar-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--accent), #5aa78f);
      }

      .finding-list {
        display: grid;
        gap: 12px;
      }

      .finding {
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.58);
        border: 1px solid rgba(20, 33, 43, 0.08);
      }

      .finding-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }

      .empty-state {
        padding: 30px;
        display: grid;
        gap: 12px;
      }

      .empty-card {
        margin-top: 6px;
        padding: 18px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.55);
        border: 1px dashed rgba(20, 33, 43, 0.18);
        display: grid;
        gap: 6px;
      }

      code {
        padding: 0.08rem 0.35rem;
        border-radius: 6px;
        background: rgba(20, 33, 43, 0.08);
        font-size: 0.92em;
      }

      @media (max-width: 980px) {
        .metrics-grid, .grid-2 {
          grid-template-columns: 1fr;
        }

        .hero {
          flex-direction: column;
          align-items: flex-start;
        }
      }

      @media (max-width: 720px) {
        .shell {
          width: min(100vw - 20px, 1180px);
          padding-top: 18px;
        }

        .hero, .metric-card, .empty-state {
          padding: 18px;
        }

        th, td {
          padding: 12px 10px;
        }
      }
    `}</style>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
