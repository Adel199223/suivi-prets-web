## Title

Stabilize friend-share work on an isolated branch and finish the final branch review

## Goal

Preserve the current validated local change set on a dedicated branch, then complete one correct final review against `origin/main` before commit, push, and merge cleanup.

## Decisions Locked Up Front

- The working tree now lives on `codex/friend-share-stabilization`; `main` should remain read-only until merge time.
- The authoritative review baseline is `origin/main`, not `main`.
- The next review should happen in a fresh chat session to avoid another context-window stall.
- If one branch-level review is still too large, split it into two review passes:
  - product/runtime/UI changes under `src/`
  - Windows/docs/tooling changes under `scripts/`, `tooling/`, `README.md`, and `docs/assistant/features/APP_USER_GUIDE.md`
- No custom resume hook is needed; reuse `docs/assistant/workflows/SESSION_RESUME.md` plus this active ExecPlan.

## Implementation Scope

- Keep the current local branch state intact; do not discard or restage work before the branch review.
- Treat the following change families as already implemented and awaiting branch-level sanity review:
  - UI cleanup, settings drawer, dark mode, accessibility/modal behavior, and copy tightening
  - borrower/debt/import/dashboard behavior and related tests
  - import/repository/signature compatibility adjustments
  - Windows `start`, `stop`, `update`, and shared helper hardening
  - `validate:ui` Windows browser fallback and related tooling/tests
  - README, user guide, workflow notes, and completed ExecPlans
- Treat the two base-review findings already handled locally as part of the branch diff:
  - settings drawer modal semantics/focus trapping
  - Windows launcher readiness accepting only real app responses
- In the fresh session, run the final review against `origin/main`, address any findings, then group commits as:
  1. product/UI/data behavior + tests
  2. Windows launcher/update/validator hardening + tests
  3. docs sync, user guide/workflow updates, completed ExecPlans

## Validation Plan

- After the final review and any fixes, run:
  - `npm test`
  - `npm run build`
  - `npm run validate:ui`
  - `npm run validate:agent-docs`
  - `npm run validate:workspace-hygiene`
- If the review changes Windows scripts again, rerun one native-Windows smoke on the existing temp Windows copy or on a fresh Windows-native copy.
- After merge back to `main`, do one short post-merge confirmation:
  - expected diff only
  - validation still green
  - app opens successfully once

## Docs Sync Impact

- No new docs sync is needed before the branch-level review.
- If the review produces fixes touching user-facing behavior, launcher/update flow, or validation contracts, run Assistant Docs Sync after those fixes and before final commit/push cleanup.

## Completion Notes

- Current branch isolation is complete: `codex/friend-share-stabilization`
- Fresh-session resume order:
  1. `APP_KNOWLEDGE.md`
  2. `agent.md`
  3. `docs/assistant/workflows/SESSION_RESUME.md`
  4. this active ExecPlan
- Existing temp Windows validation copy should stay available until merge cleanup, because it may be useful for one last launcher/update smoke.
