# Commit Publish Workflow

## What This Workflow Is For

Use this workflow for branch safety, staging, validation, commit, and push hygiene.

## Expected Outputs

- Safe branch state
- Intentional staging
- Correct validation before commit

## When To Use

- The user asks to commit
- The user asks to push
- The user asks for repo cleanup

## What Not To Do

Don't use this workflow when the task is still being implemented. Instead use the relevant feature workflow first and return here only once the implementation is ready for commit or push.

## Primary Files

- `docs/assistant/workflows/COMMIT_PUBLISH_WORKFLOW.md`

## Minimal Commands

```powershell
git fetch --prune origin
git status --short --branch
git diff --name-only
git diff --cached --name-only
git ls-files --others --exclude-standard
```

## Targeted Tests

- `npm test`
- `npm run build`
- relevant targeted validation for changed scope

## Failure Modes and Fallback Steps

- Keep `main` stable.
- Use a branch or worktree for major work.
- Stage only intended files and remove accidental staged files before commit.

## Handoff Checklist

- Confirm branch safety
- Confirm staged scope
- Confirm validation commands run
