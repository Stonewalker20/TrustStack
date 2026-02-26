# TrustStack

**TrustStack** is an open-source evaluation framework for **LLM reliability and guardrail effectiveness**. It measures real failure modes (prompt injection, groundedness, schema/tool reliability, stability) and produces reproducible artifacts: metrics JSON, HTML reports, and a public dashboard/leaderboard.

## Why this matters
LLMs are increasingly deployed in **agentic and tool-using workflows**, where failures are operational risks (prompt injection, unauthorized actions, hallucinated facts, broken JSON/tool calls). TrustStack is designed as a **Model Risk Management (MRM)** style evaluation harness for modern generative systems.

## Current status (v0)
- End-to-end harness runs locally with a mock provider
- Injection suite (v0) + scoring
- HTML report generation
- React dashboard MVP (reads a metrics.json file)

## Roadmap
- Add local open-weight providers (llama.cpp / Ollama) + optional low-budget API slice
- Suites:
  - InjectionBench (prompt injection / instruction hierarchy)
  - GroundedQA (citation-supported answers; hallucination measurement)
  - SchemaForce (JSON schema + constraint adherence)
  - NumericStability (numeric correctness + perturbation sensitivity)
  - ToolUseSafe (agent/tool-call reliability + sandbox rules)
  - RedTeamLite (refusal robustness / over-refusal)
- Guardrail interventions:
  - policy system prompts
  - schema validation + retry
  - evidence-required gating for factual tasks
  - tool allowlists + argument constraints
- Public dashboard + leaderboard
- Dataset release + paper (LaTeX) + CITATION.cff

## Quickstart (v0)
### Run evaluation
```bash
python -m truststack.run
