# AI Framework Context

This directory holds persistent collaboration context for the repository. It
keeps operational guidance separate from product documentation while
`AGENTS.md` remains the canonical entry point.

## Files

- `workflow.md`: approval-gated process for investigating and fixing one issue
  at a time.
- `issue-register.md`: durable register of review findings and their status.
- `session-state.md`: concise baseline of verified facts and the current
  decision boundary.
- `.opencode/agents/reviewer.md`: read-only code-review specialist.
- `.opencode/agents/issue-planner.md`: read-only specialist for preparing one
  issue plan before implementation.

## Context Priority

Use this order when instructions or records disagree:

1. The user's latest explicit instruction.
2. `AGENTS.md`.
3. Accepted decisions in `docs/decisions.md`.
4. This framework's workflow and approved issue plans.
5. Other files in `docs/`.
6. Historical notes in the issue register or session state.

Code and generated artifacts describe current behavior, but they do not
silently override an explicit requirement. Record disagreements as issues.

## Maintenance

- Update `issue-register.md` only when evidence, priority, scope, or status
  changes.
- Update `session-state.md` at the end of an approved implementation unit.
- Do not duplicate full product architecture here; link to canonical docs.
- Do not mark platform-specific behavior verified on a different platform.
