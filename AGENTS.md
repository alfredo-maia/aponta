# Aponta delivery instructions

These rules apply to agents working in this repository. See `docs/delivery/WORKFLOW.md` for the operating contract.

- Each deliverable has one primary GitHub issue and one canonical Multica parent. Resolve both in `.delivery/registry.json`; technical stages are delegated by mention on that canonical parent, one stage at a time, and only the leader changes the parent's status; to-tickets implementation tickets are GitHub sub-issues of the primary issue and inherit its delivery identity. Preserve existing decisions, completed stages and scope exclusions.
- Use a short branch and PR. Reuse an existing delivery branch/PR when resuming; never force updates onto `main`. Do not reset, stash or clean another contributor's work. Deployment is managed by the user; do not modify or invoke CD as part of delivery governance.
- Confirm the checkout, remote and base SHA. Keep implementation/review WIP at one delivery; implement-spec may coordinate up to two ready tickets within that delivery in new, exclusive worktrees. `scripts/aponta_delivery.py with-lock -- <command>` serializes critical commands across checkouts for this host/user; it is cooperative, not a filesystem permission boundary. The Developer owns product implementation and may use implement-spec subagents; Architect prototypes stay on separate exploratory branches. QA does not fix its own review findings.
- New features and large refactors require grill-with-docs → to-spec → to-tickets before implementation, regardless of Tier. A small confirmed bug may use issue criteria; Tier 2/3 requires SPEC with numbered ACs, contracts, risks, authorization and tests. Reference the existing architecture docs; avoid unrelated rewrites.
- For behavior changes, capture real RED/GREEN with the runner. Import/setup/syntax failures are not RED: create an importable neutral stub if needed. Never fabricate historical TDD evidence for legacy changes.
- Reuse the Aponta DS (`apps/web/src/components/ds`) and tokens. Review `docs/architecture/03-sankhya-ds-parity.md`. New/changed reusable DS components need appropriate stories or a documented exception. Do not introduce Carbon or Next.js into this React/Vite app.
- Validate the delivery manifest and run relevant tests before requesting review. QA reproduces relevant checks independently, examines RBAC and tenant boundaries, and approves the exact SHA. Functional approval cannot override a failed mandatory process gate.
- CI verifies the PR contract. Do not close the product issue at merge; use `Refs`, then record verified delivery separately. Merged, deployed and accepted are different facts.
- Never log credentials or use real customer data in fixtures. Record bounded summaries and artifact links rather than repeatedly loading full logs.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`alfredo-maia/aponta`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), unchanged from the skill defaults. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.

### Engineering methods and project profile

For the native Matt methods, role boundaries, references, visual validation and context transfer, read `docs/agents/engineering-workflow.md`. Original skills and supporting files are pinned by `docs/agents/matt-workflow.json`. Architect keeps grill-with-docs → to-spec → to-tickets in one planning session; Developer uses implement or implement-spec. Profiles aponta-sdd/aponta-tdd add project requirements/evidence. The engineering-* adaptations are historical and are not assigned to the squad. Preserve human decisions; an unresolved choice blocks its dependent action.
