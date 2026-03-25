# Release Checklist

Use this checklist before a public static deployment or release-oriented push.

## Pre-release checks

- Run `npm run build`
- Run `npm run validate:agent-docs`
- Run `npm run validate:workspace-hygiene`
- Confirm no private `.ods`, backup, or preview artifacts are staged
- Confirm the app still explains local-first storage clearly

## Static hosting checks

- Deploy the contents of `dist/`
- Configure SPA fallback to `index.html`
- Confirm a direct refresh on `/import` does not 404

## Docs and harness checks

- Confirm `HARNESS_PROFILE.json`, `HARNESS_OUTPUT_MAP.json`, and `BOOTSTRAP_STATE.json` are in sync
- Confirm the project-harness-sync workflow still matches the repo's local structure
