# Triage Labels

The engineering skills speak in terms of five canonical triage roles. This repo uses the **default label strings** (no renaming needed) — all five were confirmed to exist in GitHub as of 2026-10-31 (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` created; `wontfix` already existed as a GitHub default label).

| Canonical role    | Label in this repo | Meaning                                  |
| ------------------ | ------------------- | ----------------------------------------- |
| `needs-triage`      | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`        | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`   | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`   | `ready-for-human`    | Requires human implementation            |
| `wontfix`           | `wontfix`            | Will not be actioned                     |

Two category labels also apply alongside a state label: `bug` and `enhancement` (both already exist in this repo's GitHub label set).

Note: this repo also carries its own `tier:1`/`tier:2`/`tier:3` and `fluxo:aponta`/`tipo:entrega`/`tipo:epico`/`escopo:adiado`/`estado:bloqueado` labels from the existing Aponta delivery contract (see `AGENTS.md`). These are **independent** of the triage roles above — a GitHub Issue can carry both a `tier:X` label (delivery sizing) and a triage-role label (agent workflow state) at the same time.
