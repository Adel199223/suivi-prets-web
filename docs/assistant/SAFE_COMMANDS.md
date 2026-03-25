# Safe Commands

Use these commands when you want to inspect or validate the repo without changing app data or git history.

## Beginner-safe repo commands

```powershell
git status --short
npm run build
npm test
npm run validate:agent-docs
npm run validate:workspace-hygiene
.\scripts\start-windows.ps1
npm run start:windows
```

## WSL-safe wrappers from this machine

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"
```

## Bootstrap harness checks

```powershell
python3 tooling/check_harness_profile.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json
python3 tooling/preview_harness_sync.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json --output-map docs/assistant/HARNESS_OUTPUT_MAP.json --write-state docs/assistant/runtime/BOOTSTRAP_STATE.json
```

## Commands that still need approval or extra care

- Publishing, releasing, deploying, or pushing
- Destructive file cleanup
- Risky storage-schema changes
- History rewrites
