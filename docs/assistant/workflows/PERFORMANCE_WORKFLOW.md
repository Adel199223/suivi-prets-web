# Performance Workflow

## What This Workflow Is For

Use this workflow for workspace hygiene and performance-sensitive app changes.

## Expected Outputs

- Stable watcher excludes
- No unnecessary heavy work on app boot
- Clear performance defaults

## When To Use

- Changing workspace settings
- Adding heavy parsing or large derived views

## What Not To Do

Don't use this workflow when the task is only text or docs editing. Instead use docs maintenance.

## Primary Files

- `.vscode/settings.json`
- `docs/assistant/PERFORMANCE_BASELINES.md`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:workspace-hygiene"
```

## Targeted Tests

- `test/tooling/validate-workspace-hygiene.test.ts`

## Failure Modes and Fallback Steps

- If watcher churn appears, verify exclusions first.
- If import preview slows down, summarize by group before rendering every row.

## Handoff Checklist

- Confirm watcher exclusions
- Confirm performance note updates
- Confirm validation passed
