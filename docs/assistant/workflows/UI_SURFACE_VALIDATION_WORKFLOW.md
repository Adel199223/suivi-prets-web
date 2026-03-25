# UI Surface Validation Workflow

## What This Workflow Is For

Use this workflow for top-level UI, responsive layout, import preview surfaces, and repo-owned browser validation.

## Expected Outputs

- Fresh validation artifacts
- Clear fallback path when a broad suite is unavailable
- User-facing locator coverage in the harness
- A standalone `npm run validate:ui` path that builds, previews, and validates without requiring a manually started server

## When To Use

- Changing dashboard hierarchy
- Changing borrower or debt pages
- Changing import preview or backup flows

## What Not To Do

Don't use this workflow when only domain math changes and the UI contract is untouched. Instead use targeted tests first.

## Primary Files

- `src/App.tsx`
- `src/index.css`
- `tooling/validate-ui-surface.mjs`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:ui"
```

## Targeted Tests

- `src/App.test.tsx`
- `test/tooling/validate-ui-surface.test.ts`

## Failure Modes and Fallback Steps

- Use targeted tests first.
- Use the repo-owned browser harness second.
- `npm run validate:ui` should build the app, start the local preview server on `http://127.0.0.1:4173`, wait for readiness, and then capture desktop and mobile artifacts under `output/playwright/`.
- If `--base-url` is passed, treat that target as already running and fail clearly if it never becomes reachable.
- Capture desktop and mobile screenshots plus a JSON summary under `output/playwright/`.
- If a broad browser pass is not available, use the narrower harness path and document the caveat.

## Handoff Checklist

- Confirm artifact paths
- Confirm desktop and mobile coverage
- Confirm fallback notes when needed
