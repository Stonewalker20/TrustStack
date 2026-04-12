from __future__ import annotations

from collections.abc import Mapping
from typing import Any


LATEX_COLOR_SETUP = "\n".join(
    [
        "% Requires \\usepackage[table]{xcolor}",
        "\\definecolor{TrustStackBlue}{HTML}{1F4E79}",
        "\\definecolor{TrustStackGreen}{HTML}{1B7F5A}",
        "\\definecolor{TrustStackAmber}{HTML}{A15C00}",
        "\\definecolor{TrustStackRed}{HTML}{A33A2A}",
        "\\definecolor{TrustStackSlate}{HTML}{4B5563}",
    ]
)


def _suite_to_dict(suite: Mapping[str, Any] | Any) -> dict[str, Any]:
    if hasattr(suite, "model_dump"):
        return suite.model_dump()
    if isinstance(suite, Mapping):
        return dict(suite)
    raise TypeError("Suite output must be a mapping or a Pydantic model.")


def _latex_escape(value: Any) -> str:
    text = "" if value is None else str(value)
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    for source, replacement in replacements.items():
        text = text.replace(source, replacement)
    return text.replace("\n", " ")


def _format_score(value: Any) -> str:
    try:
        return f"{float(value):.1f}"
    except (TypeError, ValueError):
        return _latex_escape(value)


def _format_weight(value: Any) -> str:
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError):
        return _latex_escape(value)


def _latex_verdict(verdict: str) -> str:
    normalized = (verdict or "").strip().lower()
    if normalized == "pass":
        return r"\textcolor{TrustStackGreen}{PASS}"
    if normalized == "review":
        return r"\textcolor{TrustStackAmber}{REVIEW}"
    if normalized == "fail":
        return r"\textcolor{TrustStackRed}{FAIL}"
    return rf"\textcolor{{TrustStackSlate}}{{{_latex_escape(verdict or 'N/A')}}}"


def _render_category_table(score_breakdown: list[dict[str, Any]]) -> str:
    rows = []
    for item in score_breakdown:
        rows.append(
            " & ".join(
                [
                    _latex_escape(item.get("label", "")),
                    _format_weight(item.get("weight")),
                    _format_score(item.get("score")),
                    _latex_verdict(item.get("verdict", "")),
                    _latex_escape(item.get("summary", "")),
                ]
            )
            + r" \\"
        )

    return "\n".join(
        [
            LATEX_COLOR_SETUP,
            r"\begin{table*}[t]",
            r"\centering",
            r"\caption{TrustStack standardized suite category breakdown.}",
            r"\label{tab:truststack-category-breakdown}",
            r"\renewcommand{\arraystretch}{1.08}",
            r"\footnotesize",
            r"\begin{tabular}{p{0.24\textwidth}c c c p{0.39\textwidth}}",
            r"\hline",
            r"\rowcolor{TrustStackBlue!12}\textbf{Category} & \textbf{Weight} & \textbf{Score} & \textbf{Verdict} & \textbf{Summary} \\",
            r"\hline",
            *rows,
            r"\hline",
            r"\end{tabular}",
            r"\end{table*}",
        ]
    )


def _render_case_table(cases: list[dict[str, Any]]) -> str:
    rows = []
    for item in cases:
        citations = ", ".join(item.get("citations", [])) or "None"
        risk_flags = ", ".join(item.get("risk_flags", [])) or "None"
        rows.append(
            " & ".join(
                [
                    _latex_escape(item.get("id", "")),
                    _latex_escape(item.get("category", "")),
                    _latex_escape(item.get("question", "")),
                    _format_score(item.get("score")),
                    _latex_verdict(item.get("verdict", "")),
                    _latex_escape(item.get("trust_summary", "")),
                    _latex_escape(citations if citations != "None" else risk_flags),
                ]
            )
            + r" \\"
        )

    return "\n".join(
        [
            LATEX_COLOR_SETUP,
            r"\begin{table*}[p]",
            r"\centering",
            r"\caption{TrustStack standardized suite case-level results.}",
            r"\label{tab:truststack-case-results}",
            r"\renewcommand{\arraystretch}{1.08}",
            r"\scriptsize",
            r"\begin{tabular}{p{0.09\textwidth}p{0.14\textwidth}p{0.24\textwidth}c c p{0.20\textwidth}p{0.11\textwidth}}",
            r"\hline",
            r"\rowcolor{TrustStackBlue!12}\textbf{Case ID} & \textbf{Category} & \textbf{Question} & \textbf{Score} & \textbf{Verdict} & \textbf{Trust Summary} & \textbf{Citations / Flags} \\",
            r"\hline",
            *rows,
            r"\hline",
            r"\end{tabular}",
            r"\end{table*}",
        ]
    )


def _render_appendix_markdown(cases: list[dict[str, Any]]) -> str:
    lines = [
        "### Appendix: Standardized Case Results",
        "",
        "| Case ID | Category | Question | Score | Verdict | Trust Summary | Citations | Risk Flags |",
        "| --- | --- | --- | ---: | --- | --- | --- | --- |",
    ]
    for item in cases:
        citations = ", ".join(item.get("citations", [])) or "-"
        risk_flags = ", ".join(item.get("risk_flags", [])) or "-"
        lines.append(
            "| {case_id} | {category} | {question} | {score:.1f} | {verdict} | {trust_summary} | {citations} | {risk_flags} |".format(
                case_id=str(item.get("id", "-")).replace("|", r"\|"),
                category=str(item.get("category", "-")).replace("|", r"\|"),
                question=str(item.get("question", "-")).replace("|", r"\|"),
                score=float(item.get("score", 0.0)),
                verdict=str(item.get("verdict", "-")).replace("|", r"\|"),
                trust_summary=str(item.get("trust_summary", "-")).replace("|", r"\|"),
                citations=citations.replace("|", r"\|"),
                risk_flags=risk_flags.replace("|", r"\|"),
            )
        )
    return "\n".join(lines)


def build_report_artifacts(suite: Mapping[str, Any] | Any) -> dict[str, Any]:
    suite_dict = _suite_to_dict(suite)
    score_breakdown = list(suite_dict.get("score_breakdown", []))
    cases = list(suite_dict.get("cases", []))
    if not score_breakdown:
        raise ValueError("Suite output must include at least one category score.")
    if not cases:
        raise ValueError("Suite output must include at least one case result.")

    final_score = float(suite_dict.get("final_score", 0.0))
    verdict = str(suite_dict.get("verdict", "review")).lower()
    summary = str(suite_dict.get("summary", "")).strip()
    framework = suite_dict.get("framework", {})

    best_category = max(score_breakdown, key=lambda item: float(item.get("score", 0.0)))
    weakest_category = min(score_breakdown, key=lambda item: float(item.get("score", 0.0)))
    pass_count = sum(1 for item in cases if str(item.get("verdict", "")).lower() == "pass")
    review_count = sum(1 for item in cases if str(item.get("verdict", "")).lower() == "review")
    fail_count = sum(1 for item in cases if str(item.get("verdict", "")).lower() == "fail")

    executive_summary = (
        f"{framework.get('name', 'TrustStack Evaluation Standard')} v{framework.get('version', '2.0')} "
        f"scored {final_score:.2f}/100 ({verdict.upper()}) across {len(score_breakdown)} categories and {len(cases)} standardized cases. "
        f"The strongest category was {best_category.get('label', 'unknown')} at {float(best_category.get('score', 0.0)):.1f}, "
        f"while {weakest_category.get('label', 'unknown')} was the weakest at {float(weakest_category.get('score', 0.0)):.1f}. "
        f"The case set produced {pass_count} pass, {review_count} review, and {fail_count} fail result(s), so the report should emphasize evidence support, traceability, and the remaining human-review gaps."
    )

    appendix_markdown = _render_appendix_markdown(cases)
    return {
        "suite": suite_dict,
        "executive_summary": summary + (" " if summary else "") + executive_summary if summary else executive_summary,
        "latex_category_table": _render_category_table(score_breakdown),
        "latex_case_table": _render_case_table(cases),
        "appendix_markdown": appendix_markdown,
    }
