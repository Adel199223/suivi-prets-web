# Title
Fix settings drawer modal semantics and Windows launcher readiness

## Goal
Repair the settings drawer so it behaves like a true modal for keyboard and assistive-technology users, and harden the Windows launcher so it only declares startup success when this app is actually serving the HTML root page.

## Decisions Locked Up Front
- Add a reusable internal hook for modal lifecycle and focus management instead of a drawer-only one-off implementation.
- Use the drawer close button as the initial focus target, with dialog-container fallback focus.
- Lock background interaction with both `inert` and `aria-hidden`, and restore prior state on cleanup.
- Treat launcher readiness as `2xx` plus `text/html`.
- Abort `start:windows` if port `4173` is occupied and the user declines to stop the listener.

## Implementation Scope
- Add `useModalDialog` and wire it into `SettingsDrawer`.
- Update modal tests in `src/App.test.tsx`.
- Tighten `Wait-ForApp` and prompt handling in the shared Windows helper, plus the `start-windows.ps1` call site.

## Validation Plan
- Add app-level tests for focus entry, focus trapping, focus restoration, background inert state, and cleanup on route change.
- Do not add a new PowerShell test harness in this pass.
- Do not run tests unless explicitly requested.

## Docs Sync Impact
- No product docs changes planned.
- Ask whether to run Assistant Docs Sync after implementation completes.

## Completion Notes
- Added `useModalDialog` and wired `SettingsDrawer` to manage initial focus, focus trapping, background inert state, scroll lock, and focus restoration.
- Hardened the shared Windows readiness helper to require `2xx` HTML responses, and made `start-windows.ps1` abort when the port stays occupied after a declined stop prompt.
- Extended `src/App.test.tsx` with modal-behavior coverage; tests were updated but not run in this pass.
