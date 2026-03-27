## Title

Harden Windows Git-based update recovery and document the first blocked-pull flow

## Goal

Reduce future Windows dirty-file update friction by adding repo-level line-ending guidance and documenting a safe one-time recovery flow for older Git clones blocked by a dirty `package.json`.

## Decisions Locked Up Front

- Keep `npm run update:windows` strict; do not teach it to overwrite tracked files automatically.
- Default recovery guidance is inspection-first, not blind reset.
- Add repo-level `.gitattributes` to stabilize line endings across Windows and WSL.
- Document both the normal update flow and the first blocked-pull recovery flow in user-facing docs.

## Implementation Scope

- Add `.gitattributes` with explicit line-ending rules:
  - `*.ps1`, `*.bat`, `*.cmd`: CRLF
  - source, JSON, Markdown, CSS, HTML, JS/TS/TSX/MJS: LF
- Update `README.md` Windows update guidance with:
  - inspection-first recovery steps
  - `git restore package.json` primary recovery
  - `git checkout -- package.json` fallback
- Update `docs/assistant/features/APP_USER_GUIDE.md` with the same one-time recovery guidance in simpler user language.
- Do not change updater script behavior in this pass.

## Validation Plan

- Run:
  - `npm run validate:agent-docs`
  - `npm run validate:workspace-hygiene`
- Run one Windows-native smoke on an existing Windows Git clone:
  - create a harmless local `package.json` drift
  - confirm `git pull --ff-only` blocks
  - inspect diff
  - restore `package.json`
  - rerun `git pull --ff-only`
  - run `npm run update:windows`
  - confirm `http://127.0.0.1:4173` returns 2xx HTML

## Docs Sync Impact

- This pass directly edits user-facing docs, so Assistant Docs Sync may be appropriate afterward if these wording changes should become part of the official assistant-doc snapshot.

## Completion Notes

- If the validation passes, the repo will be locally hardened and the support recovery flow will be documented.
- A separate publish decision is still needed before this new hardening reaches GitHub.
