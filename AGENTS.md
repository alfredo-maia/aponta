# Aponta delivery instructions

These rules apply to agents working in this repository. See `docs/delivery/WORKFLOW.md` for the operating contract.

- Each deliverable has one primary GitHub issue and one canonical Multica parent. Resolve both in `.delivery/registry.json`; technical stages remain Multica children. Preserve existing decisions, completed stages and scope exclusions.
- Use a short branch and PR. Reuse an existing delivery branch/PR when resuming; never force updates onto `main`. Do not reset, stash or clean another contributor's work. Deployment is managed by the user; do not modify or invoke CD as part of delivery governance.
- Confirm the checkout, remote and base SHA. Keep implementation WIP at one until measured capacity supports more. `scripts/aponta_delivery.py with-lock -- <command>` serializes critical commands across checkouts for this host/user; it is cooperative, not a filesystem permission boundary. The Developer is the only implementation writer; QA does not fix its own review findings.
- Tier 1 uses issue criteria. Tier 2/3 requires SPEC before implementation with numbered ACs, contracts, risks, authorization and tests. Reference the existing architecture docs; avoid unrelated rewrites.
- For behavior changes, capture real RED/GREEN with the runner. Import/setup/syntax failures are not RED: create an importable neutral stub if needed. Never fabricate historical TDD evidence for legacy changes.
- Reuse the Aponta DS (`apps/web/src/components/ds`) and tokens. Review `docs/architecture/03-sankhya-ds-parity.md`. New/changed reusable DS components need appropriate stories or a documented exception. Do not introduce Carbon or Next.js into this React/Vite app.
- Validate the delivery manifest and run relevant tests before requesting review. QA reproduces relevant checks independently, examines RBAC and tenant boundaries, and approves the exact SHA. Functional approval cannot override a failed mandatory process gate.
- CI verifies the PR contract. Do not close the product issue at merge; use `Refs`, then record verified delivery separately. Merged, deployed and accepted are different facts.
- Never log credentials or use real customer data in fixtures. Record bounded summaries and artifact links rather than repeatedly loading full logs.
