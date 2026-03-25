# QA Checks

Use these checks after harness or assistant-doc changes.

## Bootstrap checks

```powershell
python3 tooling/check_harness_profile.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json
python3 tooling/preview_harness_sync.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json --output-map docs/assistant/HARNESS_OUTPUT_MAP.json --write-state docs/assistant/runtime/BOOTSTRAP_STATE.json
```

## Repo checks

```powershell
npm run validate:agent-docs
npm run validate:workspace-hygiene
```

## When to broaden validation

- Run `npm test` when workflow routing changes overlap with app behavior or tooling.
- Run `npm run build` when docs or scripts change the recommended build/run path.
