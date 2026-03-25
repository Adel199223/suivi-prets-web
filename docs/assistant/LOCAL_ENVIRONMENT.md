# Local Environment

This file is the repo-local environment overlay for the current machine setup.

## Current host profile

- Windows host
- WSL Ubuntu available
- Canonical repo path in WSL: `/home/fa507/dev/suivi-prets-web`
- Canonical local app URL: `http://127.0.0.1:4173`

## Preferred command routing on this machine

Use WSL-safe wrappers for validation commands:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && <command>"
```

Use native Windows `npm` commands only when you intentionally want the Windows-native path described in the README.

## Hard boundary

- Keep machine-local facts in this file, not in the universal bootstrap templates.
- Do not store secrets or tokens here.
