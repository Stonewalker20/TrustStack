from __future__ import annotations

from html import escape
from pathlib import Path


def _percent(value: float) -> str:
    return f"{value * 100:.0f}%"


def _summary_cards(summary: dict[str, object]) -> str:
    metrics = (
        ("Total Checks", str(summary["total"])),
        ("Passed", str(summary["passed"])),
        ("Failed", str(summary["failed"])),
        ("Pass Rate", _percent(float(summary["pass_rate"]))),
    )
    cards = []
    for label, value in metrics:
        cards.append(
            f"""
            <div class="card metric">
              <div class="label">{escape(label)}</div>
              <div class="value">{escape(value)}</div>
            </div>
            """
        )
    return "\n".join(cards)


def _summary_table(title: str, rows: list[dict[str, object]], id_key: str) -> str:
    body = []
    for row in rows:
        body.append(
            f"""
            <tr>
              <td>{escape(str(row[id_key]))}</td>
              <td>{escape(str(row["passed"]))}</td>
              <td>{escape(str(row["failed"]))}</td>
              <td>{_percent(float(row["pass_rate"]))}</td>
            </tr>
            """
        )
    return f"""
    <section class="panel">
      <div class="panel-header">
        <h2>{escape(title)}</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>{escape(id_key.replace('_', ' ').title())}</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          {''.join(body)}
        </tbody>
      </table>
    </section>
    """


def _results_table(results: list[dict[str, object]]) -> str:
    rows = []
    for result in results:
        status_class = "pass" if result["passed"] else "fail"
        rows.append(
            f"""
            <tr>
              <td><span class="pill {status_class}">{'PASS' if result['passed'] else 'FAIL'}</span></td>
              <td>{escape(str(result['provider_id']))}</td>
              <td>{escape(str(result['suite_id']))}</td>
              <td>{escape(str(result['item_id']))}</td>
              <td>{escape(str(result['reason']))}</td>
              <td class="response">{escape(str(result['response_text']))}</td>
            </tr>
            """
        )
    return f"""
    <section class="panel">
      <div class="panel-header">
        <h2>Recent Findings</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Provider</th>
            <th>Suite</th>
            <th>Item</th>
            <th>Reason</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          {''.join(rows)}
        </tbody>
      </table>
    </section>
    """


def render_report_html(out_dir: str | Path, run_payload: dict[str, object]) -> Path:
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TrustStack Report</title>
    <style>
      :root {{
        color-scheme: light;
        --bg: #f4efe8;
        --panel: rgba(255, 255, 255, 0.82);
        --ink: #1c1b19;
        --muted: #6d665d;
        --accent: #ab3b16;
        --accent-soft: #f4c4a8;
        --border: rgba(28, 27, 25, 0.12);
        --pass: #1b7f5a;
        --fail: #b0301a;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(171, 59, 22, 0.14), transparent 40%),
          linear-gradient(180deg, #fbf7f1 0%, var(--bg) 100%);
      }}
      main {{
        max-width: 1180px;
        margin: 0 auto;
        padding: 40px 20px 64px;
      }}
      .hero {{
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: end;
        margin-bottom: 24px;
      }}
      h1 {{
        margin: 0 0 10px;
        font-size: clamp(2.6rem, 5vw, 4.8rem);
        letter-spacing: -0.06em;
      }}
      .meta {{
        color: var(--muted);
        max-width: 640px;
      }}
      .grid {{
        display: grid;
        gap: 16px;
      }}
      .metrics {{
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin: 24px 0;
      }}
      .card,
      .panel {{
        background: var(--panel);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border);
        border-radius: 20px;
        box-shadow: 0 10px 32px rgba(50, 35, 19, 0.08);
      }}
      .metric {{
        padding: 18px 20px;
      }}
      .label {{
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }}
      .value {{
        margin-top: 10px;
        font-size: 2rem;
      }}
      .tables {{
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        margin-bottom: 16px;
      }}
      .panel {{
        padding: 18px;
        overflow: hidden;
      }}
      .panel-header {{
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 12px;
      }}
      h2 {{
        margin: 0;
        font-size: 1.2rem;
      }}
      table {{
        width: 100%;
        border-collapse: collapse;
        font-size: 0.96rem;
      }}
      th, td {{
        text-align: left;
        padding: 10px 8px;
        border-top: 1px solid var(--border);
        vertical-align: top;
      }}
      th {{
        color: var(--muted);
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }}
      .pill {{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 52px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.76rem;
        letter-spacing: 0.08em;
      }}
      .pass {{
        color: var(--pass);
        background: rgba(27, 127, 90, 0.12);
      }}
      .fail {{
        color: var(--fail);
        background: rgba(176, 48, 26, 0.12);
      }}
      .response {{
        max-width: 380px;
        color: var(--muted);
      }}
      @media (max-width: 760px) {{
        .hero {{
          flex-direction: column;
          align-items: start;
        }}
      }}
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div>
          <h1>{escape(str(run_payload['run_name']))}</h1>
          <div class="meta">
            Run ID: {escape(str(run_payload['run_id']))}<br />
            Generated: {escape(str(run_payload['generated_at']))}<br />
            Models: {escape(', '.join(run_payload['config']['models']))}<br />
            Suites: {escape(', '.join(run_payload['config']['suites']))}
          </div>
        </div>
      </section>

      <section class="grid metrics">
        {_summary_cards(run_payload['summary'])}
      </section>

      <section class="grid tables">
        {_summary_table('Provider Comparison', run_payload['provider_summaries'], 'provider_id')}
        {_summary_table('Suite Comparison', run_payload['suite_summaries'], 'suite_id')}
      </section>

      {_results_table(run_payload['results'])}
    </main>
  </body>
</html>
"""
    report_path = out_path / "report.html"
    report_path.write_text(html, encoding="utf-8")
    return report_path
