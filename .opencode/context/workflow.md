# Approval-Gated Workflow

All repository work is performed one issue at a time. Investigation and
planning never imply permission to implement.

## Required Sequence

1. Select exactly one issue from `.opencode/context/issue-register.md`, or
   create a new issue when the user identifies new work.
2. Investigate the relevant code, tests, documentation, and generated output.
3. State confirmed facts separately from assumptions and platform-only risks.
4. Ask the user about every unresolved product, compatibility, security, or
   scope decision. Do not choose silently.
5. Propose a small implementation plan containing:
   - intended behavior and acceptance criteria;
   - files expected to change;
   - ordered implementation steps;
   - tests and platform verification;
   - risks, tradeoffs, and decisions still required.
6. Wait for explicit user approval before editing application code,
   configuration, tests, or product documentation.
7. Implement only the approved scope. Stop and ask again if investigation
   reveals a material scope change or a conflicting decision.
8. Run `npm run typecheck && npm run lint && npm test` for every code change,
   plus issue-specific build or runtime checks.
9. Review `README.md` before completion. Update it within the approved scope
   when behavior, platform support, prerequisites, packaging, security posture,
   or project status changed.
10. Report results, limitations, and unverified platforms. Update the issue
    register and session state only after evidence supports the new status.

## Scope Rules

- Never combine unrelated issues into one implementation.
- Never perform opportunistic refactors during an issue fix.
- Never add compatibility behavior without an identified consumer or approved
  requirement.
- Never claim Windows, macOS, or Linux runtime verification from another OS.
- Never change an accepted architecture decision without proposing a new ADR
  and receiving approval.
- Never commit, amend, push, or create a pull request unless explicitly asked.

## Issue States

- `Open`: confirmed or credible issue, not yet planned with the user.
- `Investigating`: evidence is being gathered; no implementation approved.
- `Plan proposed`: a concrete plan is awaiting user approval.
- `Approved`: the user approved the stated plan and scope.
- `In progress`: implementation is underway.
- `Verification blocked`: implementation exists but required evidence is not
  available.
- `Resolved`: acceptance criteria and required verification passed.
- `Deferred`: intentionally postponed with the reason recorded.
- `Rejected`: investigated and deliberately not pursued.

## Completion Report

Every completed implementation report must state:

- the issue ID and approved scope;
- changed files and resulting behavior;
- verification commands and outcomes;
- remaining risks or platform checks;
- whether `README.md`, other documentation, or an ADR changed.
