# Suivi Prets

Application web locale en React/Vite pour suivre des dettes, enregistrer des paiements, ajouter de nouvelles avances et importer un classeur `.ods` de la meme famille que le suivi actuel.

## Demarrage

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm install"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run dev"
```

Ouvrir [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Validation

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run lint"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:workspace-hygiene"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:ui"
```

## Assistant Docs

- Canonique: `APP_KNOWLEDGE.md`
- Runbook: `agent.md`
- Shim: `AGENTS.md`
- Index assistant: `docs/assistant/INDEX.md`
- Feuille de route: `ROADMAP.md`
