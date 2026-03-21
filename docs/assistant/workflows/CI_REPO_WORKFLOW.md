# CI Repo Workflow

## What This Workflow Is For

Use this workflow for repo checks, validation commands, and CI-safe maintenance.

## Expected Outputs

- Correct validation command selection
- Safe repo-level checks
- No drift between docs and validation scripts

## When To Use

- Updating scripts
- Updating validators
- Reviewing CI-facing commands

## What Not To Do

Don't use this workflow when the task is a product feature with no repo-ops impact. Instead use the feature workflow first.

## Primary Files

- `package.json`
- `tooling/validate-agent-docs.mjs`
- `tooling/validate-workspace-hygiene.mjs`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:workspace-hygiene"
```

## Targeted Tests

- `test/tooling/validate-agent-docs.test.ts`
- `test/tooling/validate-workspace-hygiene.test.ts`

## Failure Modes and Fallback Steps

- If docs validation fails, fix the missing contract before changing the validator.
- If workspace hygiene fails, update `.vscode/settings.json` or `.gitignore`, not the test expectation first.

## Handoff Checklist

- Confirm command list
- Confirm validator coverage
- Confirm no accidental repo drift
