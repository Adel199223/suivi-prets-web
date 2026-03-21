# Localization Workflow

## What This Workflow Is For

Use this workflow for French-first copy changes and term consistency.

## Expected Outputs

- Updated copy
- Glossary alignment
- No accidental language drift across the main flows

## When To Use

- Changing labels or helper text
- Adding user-facing financial terms

## What Not To Do

Don't use this workflow when the task is mainly technical implementation with no user-facing copy change. Instead use the feature workflow first.

## Primary Files

- `src/App.tsx`
- `docs/assistant/LOCALIZATION_GLOSSARY.md`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"
```

## Targeted Tests

- `npm test`

## Failure Modes and Fallback Steps

- If a new term conflicts with the glossary, update the glossary first.
- If copy gets too technical, route support explanations through the user guides.

## Handoff Checklist

- Confirm glossary updates
- Confirm copy stays French-first
- Confirm no user-facing regressions
