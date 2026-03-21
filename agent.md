# Suivi Prets Runbook

## Purpose

`APP_KNOWLEDGE.md` is canonical for app architecture and status. This runbook covers routing, validation, approvals, and handoff behavior.

## Read Order

Read in this order for most tasks:

1. `APP_KNOWLEDGE.md`
2. The relevant knowledge doc under `docs/assistant/`
3. The relevant workflow under `docs/assistant/workflows/`
4. `docs/assistant/features/*` only for support or plain-language explanation work
5. `docs/assistant/INDEX.md` or `docs/assistant/manifest.json` only if routing is still unclear

## Main-Agent And Sub-Agent Contract

- The main agent owns final planning, integration, and user-facing conclusions.
- Sub-agents are for narrow, bounded tasks: read-heavy repo exploration, parallel fact gathering, isolated validation, or tightly scoped docs gardening.
- Keep blocking product and merge decisions on the main thread.

## Validation Environment

Canonical wrapper:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && <command>"
```

Canonical local URL:

`http://127.0.0.1:4173`

Validation split:

- `npm test` covers domain, import, repository, and UI flows
- `npm run build` validates the production bundle
- `npm run validate:ui` is the repo-owned browser validation harness
- `npm run validate:agent-docs` validates the documentation contract
- `npm run validate:workspace-hygiene` validates workspace exclusions

## Approval Gates

Ask before executing:

- destructive filesystem operations
- risky storage-schema or persistence migrations
- force-push or history rewrite
- publish, release, or deploy actions
- non-essential external network activity

## ExecPlans

- Major or multi-file work should start with an ExecPlan in `docs/assistant/exec_plans/active/`.
- Use `docs/assistant/exec_plans/PLANS.md` as the source of truth for plan format and lifecycle.
- Small isolated fixes may skip an ExecPlan if the work is truly local and low-risk.

## Worktree Isolation

- Keep `main` stable and use a branch or worktree for major work.
- For parallel threads, prefer separate worktrees over overlapping edits in one checkout.
- Use WSL-native git from this environment.

## Task Routing

- App architecture or current-state truth: `APP_KNOWLEDGE.md`
- Assistant bridge summary: `docs/assistant/APP_KNOWLEDGE.md`
- Local-first storage contracts, backup, import sessions, and portability: `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`
- Debt, borrower, payment, adjustment, and balance rules: `docs/assistant/workflows/LOAN_LEDGER_WORKFLOW.md`
- Workbook-family parsing, dedupe, merge, and anomaly review: `docs/assistant/workflows/IMPORT_MERGE_WORKFLOW.md`
- UI/browser validation, artifacts, and fallback rules: `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`
- Named-product inspiration or parity work: `docs/assistant/workflows/REFERENCE_DISCOVERY_WORKFLOW.md`
- Commit, branch, worktree, push, and publish hygiene: `docs/assistant/workflows/COMMIT_PUBLISH_WORKFLOW.md`
- Docs updates and user-guide sync: `docs/assistant/workflows/DOCS_MAINTENANCE_WORKFLOW.md`
- Support and non-technical explanation work: `docs/assistant/features/APP_USER_GUIDE.md`

## Support Routing

For support or non-technical explanation tasks, answer from the relevant user guide first, then confirm against canonical technical docs if needed.

## Template Read Policy

`docs/assistant/templates/*` is read-only template material. Reuse the ideas, not the files.

## Docs Sync

After significant implementation changes, ask exactly:

`Would you like me to run Assistant Docs Sync for this change now?`
