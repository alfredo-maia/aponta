# Issue Tracker

Issues for this repo live in **GitHub Issues** (`alfredo-maia/aponta`), managed via the `gh` CLI.

- Create: `gh issue create -R alfredo-maia/aponta --title "..." --body "..." --label "..."`
- List: `gh issue list -R alfredo-maia/aponta`
- Comment: `gh issue comment <number> -R alfredo-maia/aponta --body "..."`
- Sub-issues: this repo's delivery contract (see `AGENTS.md` and `docs/delivery/WORKFLOW.md`) uses **one primary GitHub issue + one canonical Multica parent per deliverable**, tracked in `.delivery/registry.json`. Technical stages stay as Multica children, not separate GitHub issues.

PRs are **not** treated as a triage request surface here (flag left off, per the `triage` skill default). PRs are reviewed through the existing Aponta delivery contract (Developer implements, QA reviews independently, approves the exact SHA).
