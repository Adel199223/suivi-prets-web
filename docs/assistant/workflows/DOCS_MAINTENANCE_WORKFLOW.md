# Docs Maintenance Workflow

## What This Workflow Is For

Use this workflow for assistant-doc updates after confirmed implementation changes.

## Expected Outputs

- Scoped doc updates only
- Canonical docs kept authoritative
- User-guide updates only when end-user behavior changed

## When To Use

- After a significant implementation change
- When docs drift is confirmed

## What Not To Do

Don't use this workflow when the request is blanket rewriting or speculative doc gardening. Instead use the confirmed implementation scope and update only the touched docs.
Don't use this workflow when the request is `implement the template files`, `sync project harness`, `audit project harness`, or `check project harness`. Instead use `PROJECT_HARNESS_SYNC_WORKFLOW.md`.

## Primary Files

- `APP_KNOWLEDGE.md`
- `agent.md`
- `docs/assistant/INDEX.md`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"
```

## Targeted Tests

- `test/tooling/validate-agent-docs.test.ts`

## Failure Modes and Fallback Steps

- If a change does not affect a user guide, say so and leave the guide alone.
- If docs drift is local to one workflow, update that workflow instead of rewriting the stack.
- If the request is actually about bootstrap profile/state or vendored template sync, route to `PROJECT_HARNESS_SYNC_WORKFLOW.md`.

## Handoff Checklist

- Confirm touched docs only
- Confirm canonical precedence
- Confirm validator passes
