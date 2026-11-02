# Domain Docs

How the engineering skills (`domain-modeling`, `to-spec`, `to-tickets`, `diagnosing-bugs`, `code-review`, `triage`) should consume this repo's domain documentation when exploring the codebase.

## Layout: single-context

This repo is **single-context** (confirmed 2026-10-31: `pnpm-workspace.yaml` lists `packages/*` but that directory is empty today; `apps/api`, `apps/mcp`, `apps/web`, `apps/web-e2e` are the real units and don't each need their own glossary/ADR set).

```
/
├── GLOSSARY.md        ← created lazily, on first resolved term
├── docs/
│   └── adr/            ← created lazily, on first ADR
└── apps/
    ├── api/
    ├── mcp/
    ├── web/
    └── web-e2e/
```

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root, if it exists.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If neither exists yet, **proceed silently** — don't flag their absence or suggest creating them upfront. The `domain-modeling` skill creates them lazily, the moment a term is actually resolved or a real architectural trade-off is made (not for every decision — see the skill's own criteria: hard to reverse, surprising without context, result of a real trade-off).

## Use the glossary's vocabulary

When your output names a domain concept (issue title, spec, ticket, hypothesis, test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary avoids.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding it.

## Relation to existing Aponta docs

This repo already has `docs/architecture/03-sankhya-ds-parity.md` and `docs/delivery/WORKFLOW.md`, which remain authoritative for their respective topics (DS parity, delivery process). `GLOSSARY.md`/`docs/adr/` are a new, narrower layer for domain vocabulary and point-in-time technical decisions — they do not replace or duplicate those existing docs.
