# Suivi Prets

Application web locale en React/Vite pour suivre des dettes et fusionner un classeur `.ods` dans une base locale de navigateur (local-first).

Le code est public; vos données importées ne sont pas envoyées à GitHub. Elles restent uniquement dans le navigateur tant qu’elles ne sont pas exportées en `.json`.

## Demarrage (Windows)

### Prérequis

- Windows 10/11
- Node.js 20+ (ou version LTS)
- npm (inclus avec Node.js)
- Git (pour Windows)

### Démarrage rapide (Windows - recommandé)

```powershell
cd C:\chemin\vers\suivi-prets-web
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
.\scripts\start-windows.ps1
```

Ouvrir [http://127.0.0.1:4173](http://127.0.0.1:4173).

Si `Set-ExecutionPolicy` est bloqué par la stratégie de votre poste, exécutez :

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -File .\scripts\start-windows.ps1
```

`start-windows.ps1` fait :

- Vérifie que Node/npm/git sont installés
- Installe les dépendances si elles manquent (`npm ci` ou `npm install`)
- Vérifie si le port `4173` est déjà utilisé et peut le libérer
- Avertit si Python n’est pas installé (non requis pour ouvrir l’app)
- Ouvre automatiquement le navigateur sur `http://127.0.0.1:4173`

`npm` et `node_modules` ne sont pas obligatoires au premier lancement avec `start-windows.ps1` : le script les installera si besoin.

Commande ultra-courte :

```powershell
npm run start:windows
```

### Commandes WSL (optionnel)

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm install"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run dev"
```

### Import local (Windows)

Le flux normal de l'application est d’importer un classeur `.ods` directement dans **Import & sauvegarde**.  
Vous n’avez pas besoin de Python pour utiliser l’app normale.

La commande suivante reste optionnelle (outil de secours) et nécessite Python.

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run import:preview -- --input /chemin/classeur.ods --output output/private/apercu.json"
```

## Protection des données privées

### Avant tout commit

- Vérifier qu’aucun fichier personnel n’est en staging : `*.ods`, `*.backup.json`, `apercu*.json`, `import-workbook-preview*.json`, `output/private/*`.
- Vérifier qu’aucune archive `suivi-prets-backup-*.json` n’est suivie.
- Vérifier les résolutions locales/import privées (ex: `workbook-import-resolutions*.json`).

### Première utilisation de l’application

- Exportez une copie de secours régulièrement avec `Exporter une sauvegarde`.
- Avant un changement d’appareil/navigateur, utilisez d’abord cette copie de secours puis fermez la session proprement.
- Une restauration se fait ensuite en important manuellement la sauvegarde.

## Déploiement static public (GitHub Pages / Netlify / Vercel)

- `npm run build`
- déployer le contenu de `dist/`
- configurer le fallback SPA : toutes les routes doivent renvoyer `index.html`
- valider une navigation profonde en production : ouvrir `/import` et faire un rafraîchissement forcé, pas de 404 attendu

Un contrôle simple de build pour déploiement : `npm run build`.

## Validation

```powershell
npm test
npm run lint
npm run build
npm run validate:agent-docs
npm run validate:workspace-hygiene
npm run validate:ui
```

## Résolution de soucis (Windows)

- Port déjà utilisé (4173) : ajuster la variable dans `package.json` ou fermer l’autre app Vite.
- Cache de l’application : `Ctrl+Shift+R` pour forcer le rechargement.
- Données locales incohérentes : vérifier que la copie de secours récente est bien restaurée; la restauration remplace toutes les données locales du navigateur.

## Harness Bootstrap

Le repo utilise maintenant un harness bootstrap pilote par profil pour la documentation assistant.

- Source kit copiee : `bootstrap_harness_kit/`
- Source vendored pour l'application locale : `docs/assistant/templates/`
- Profil bootstrap : `docs/assistant/HARNESS_PROFILE.json`
- Etat resolu : `docs/assistant/runtime/BOOTSTRAP_STATE.json`
- Mapping des sorties generiques vers les fichiers locaux existants : `docs/assistant/HARNESS_OUTPUT_MAP.json`

Verification bootstrap :

```powershell
python3 tooling/check_harness_profile.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json
python3 tooling/preview_harness_sync.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json --output-map docs/assistant/HARNESS_OUTPUT_MAP.json --write-state docs/assistant/runtime/BOOTSTRAP_STATE.json
```

Commandes debutant/sures :

- `docs/assistant/SAFE_COMMANDS.md`
- `docs/assistant/TERMS_IN_PLAIN_ENGLISH.md`
- `docs/assistant/workflows/PROJECT_HARNESS_SYNC_WORKFLOW.md`

## Assistant Docs

- Canonique: `APP_KNOWLEDGE.md`
- Runbook: `agent.md`
- Shim: `AGENTS.md`
- Index assistant: `docs/assistant/INDEX.md`
- Feuille de route: `ROADMAP.md`
