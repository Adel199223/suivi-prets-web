# AGENTS.md

Ce fichier est le shim de compatibilite. Le runbook complet vit dans `agent.md`.

## Start Here

Lire dans cet ordre:

1. `APP_KNOWLEDGE.md`
2. `agent.md`
3. Le workflow pertinent sous `docs/assistant/workflows/`
4. `docs/assistant/INDEX.md` seulement si le routage reste flou

## Approval Gates

Ask before executing:

- destructive file or history operations
- publish, release, or deploy actions
- force-push or history rewrite
- risky persistence-schema changes
- non-essential external network actions

## ExecPlans

Major or multi-file work should create an ExecPlan in `docs/assistant/exec_plans/active/` before implementation and move it to `docs/assistant/exec_plans/completed/` when finished.

## Worktree Isolation

This directory is its own git repository. Use separate worktrees or branches for parallel major changes, and prefer WSL-native git from this environment.

## Routing

- Support or plain-language explanation tasks go to `docs/assistant/features/APP_USER_GUIDE.md` first.
- Debt, payment, borrower, and balance behavior go to `docs/assistant/workflows/LOAN_LEDGER_WORKFLOW.md`.
- Spreadsheet import, merge, dedupe, and workbook-family decisions go to `docs/assistant/workflows/IMPORT_MERGE_WORKFLOW.md`.
- UI validation work goes to `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`.
- Local storage, backup, schema, or portability changes go to `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`.
- Named-product parity or inspiration work goes to `docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md` before implementation decisions.
- Bootstrap harness adoption, profile/state sync, and `implement the template files` go to `docs/assistant/workflows/PROJECT_HARNESS_SYNC_WORKFLOW.md`.

## Sub-Agent Routing

The main agent is the integrator and final decision-maker. Use sub-agents only for narrow, bounded tasks such as read-heavy exploration, disjoint validation, or tightly scoped docs updates.

## Template Read Policy

`docs/assistant/templates/*` is read-only template material for reuse. Do not edit template files during app work.

## Docs Sync

After significant implementation changes, ask exactly:

`Would you like me to run Assistant Docs Sync for this change now?`
