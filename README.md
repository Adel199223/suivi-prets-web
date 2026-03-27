# Suivi Prêts

Application web locale en React/Vite pour suivre des dettes et fusionner un classeur `.ods` dans une base locale de navigateur (local-first).

Le code est public; vos données importées ne sont pas envoyées à GitHub. Elles restent uniquement dans le navigateur tant qu’elles ne sont pas exportées en `.json`.

## Démarrage (Windows)

### Démarrage rapide depuis GitHub (Windows - recommandé)

```powershell
cd $HOME\Documents
git clone https://github.com/Adel199223/suivi-prets-web.git
cd suivi-prets-web
npm run start:windows
```

Ce parcours est le plus simple pour un ami sur Windows 10/11 :

- Ubuntu/WSL n’est pas requis.
- Python n’est pas requis.
- Le repo doit vivre dans un dossier Windows normal, pas dans `\\wsl.localhost\...`.
- Le premier lancement installe automatiquement les dépendances si besoin.

Le navigateur s’ouvrira ensuite sur [http://127.0.0.1:4173](http://127.0.0.1:4173) quand l’app locale répond correctement.

### Prérequis

- Windows 10/11
- Node.js 20+ (ou version LTS)
- npm (inclus avec Node.js)
- Git pour Windows (uniquement pour cloner le repo)

### Démarrage rapide si le repo est déjà présent sur Windows

```powershell
cd C:\chemin\vers\suivi-prets-web
npm run start:windows
```

### Mettre à jour une installation existante (Windows)

Si votre ami a déjà ce repo cloné sur son PC Windows, le bon réflexe est de mettre l'app à jour, pas de la réinstaller.

```powershell
cd C:\chemin\vers\suivi-prets-web
npm run update:windows
```

`update-windows.ps1` :

- vérifie que le dossier est un vrai clone Git Windows
- arrête l'app locale si elle tourne déjà sur `4173`
- refuse de tirer les changements si le dossier contient des modifications locales
- récupère la dernière version en `fast-forward` seulement
- répare les dépendances Windows si besoin
- relance l'app puis rouvre le navigateur

Si le dossier n'est plus un vrai clone Git (par exemple un ZIP extrait), il faut re-cloner le repo depuis GitHub au lieu d'utiliser la mise à jour.

Si `Set-ExecutionPolicy` est bloqué par la stratégie de votre poste, exécutez :

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -File .\scripts\start-windows.ps1
```

`start-windows.ps1` fait :

- Vérifie que Node/npm sont installés
- Refuse les chemins UNC/WSL comme `\\wsl.localhost\...`
- Installe les dépendances si elles manquent (`npm ci` ou `npm install`)
- Répare les dépendances si elles semblent venir d’un autre environnement
- Vérifie si le port `4173` est déjà utilisé, propose de le libérer, puis annule le lancement si ce port reste occupé
- Avertit si Python n’est pas installé (non requis pour ouvrir l’app)
- Attend que `http://127.0.0.1:4173` renvoie bien une page HTML valide de l’app (HTTP `2xx`)
- Ouvre ensuite automatiquement le navigateur
- Rappelle la commande d’arrêt `npm run stop:windows`

`npm` et `node_modules` ne sont pas obligatoires au premier lancement avec `start-windows.ps1` : le script les installera si besoin.

Commande ultra-courte :

```powershell
npm run start:windows
```

Commande ultra-courte de mise à jour :

```powershell
npm run update:windows
```

### Arrêter l'application (Windows)

Fermer l'onglet du navigateur ne coupe pas le serveur local. Fermer la fenetre Git Bash ou PowerShell peut aussi laisser peu clair si l'app tourne encore.

Commande recommandée :

```powershell
npm run stop:windows
```

Commande directe :

```powershell
.\scripts\stop-windows.ps1
```

Si l'app tourne sur un autre port :

```powershell
.\scripts\stop-windows.ps1 -Port 4174
```

### Commandes WSL (optionnel)

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm install"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run dev"
```

WSL reste un chemin avancé de développement. Il n’est pas requis pour qu’un utilisateur Windows ouvre l’app localement.

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

- `node` ou `npm` introuvable : installer Node.js 20+ depuis [nodejs.org](https://nodejs.org/) puis rouvrir le terminal.
- Repo lancé depuis `\\wsl.localhost\...` : recloner le projet dans un dossier Windows normal comme `C:\Users\<nom>\Documents\suivi-prets-web`.
- Dépendances copiées depuis Linux/WSL ou corrompues : relancer `npm run start:windows`; le helper réinstalle les dépendances Windows si elles semblent incomplètes.
- Port déjà utilisé (4173) : accepter l’arrêt du processus proposé par le helper. Si vous refusez, le lancement s’arrête volontairement; fermez l’autre app qui utilise ce port puis relancez `npm run start:windows`.
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
