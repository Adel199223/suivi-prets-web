# Guide App

## Use This Guide When

Use this guide when someone needs a simple explanation of how to manage debts, add payments, import a workbook, or make a backup.

## Do Not Use This Guide For

Do not use this guide for code changes, schema changes, or parser implementation details.

## For Agents: Support Interaction Contract

Answer in plain language first, then give short numbered steps, then confirm against canonical docs if needed.

## Canonical Deference Rule

If this guide conflicts with technical docs, `APP_KNOWLEDGE.md` and source code win.

## Quick Start (No Technical Background)

### Installer l’app depuis GitHub sur Windows

Lien du repo : `https://github.com/Adel199223/suivi-prets-web`

```powershell
cd $HOME\Documents
git clone https://github.com/Adel199223/suivi-prets-web.git
cd suivi-prets-web
npm run start:windows
```

Aucune installation Ubuntu/WSL ou Python n’est requise. L’app s’ouvre localement dans le navigateur et garde les données dans ce navigateur sur cet appareil. Pour l’arrêter plus tard : `npm run stop:windows`.
Si `4173` est déjà utilisé, le helper propose d’arrêter l’autre processus. Si vous refusez, le lancement s’arrête proprement et il faut fermer l’autre app puis relancer `npm run start:windows`.

### Mettre à jour l’app sur Windows

Si le repo est déjà cloné sur le PC Windows et qu’il s’agit déjà d’une version récente :

```powershell
cd C:\chemin\vers\suivi-prets-web
npm run update:windows
```

Si c’est une ancienne installation qui ne connaît pas encore `update:windows`, utilisez cette transition une seule fois :

```powershell
cd C:\chemin\vers\suivi-prets-web
npm run stop:windows; git pull --ff-only; npm run update:windows
```

Si le dossier n’est pas un vrai clone Git, il faut re-cloner depuis GitHub au lieu d’utiliser la mise à jour.

Si `git pull --ff-only` se bloque à cause de `package.json`, faites d’abord ceci :

```powershell
cd C:\chemin\vers\suivi-prets-web
npm run stop:windows
git status --short
git diff -- package.json
```

Si le diff montre seulement une dérive locale non voulue sur `package.json`, continuez avec :

```powershell
git restore package.json
git pull --ff-only
npm run update:windows
```

Si `git restore` n’existe pas sur cette machine, utilisez :

```powershell
git checkout -- package.json
git pull --ff-only
npm run update:windows
```

Si d’autres fichiers sont modifiés, ou si `package.json` contient de vraies modifications voulues, ne supprimez rien automatiquement : faites nettoyer le clone par quelqu’un de technique ou re-clonez le repo.

### Message prêt à envoyer

Français

Git et Node.js doivent être installés. Pas besoin d’Ubuntu/WSL ni de Python.

```powershell
cd $HOME\Documents
git clone https://github.com/Adel199223/suivi-prets-web.git
cd suivi-prets-web
npm run start:windows
```

Pour arrêter plus tard : `npm run stop:windows`

English

Git and Node.js must be installed. No Ubuntu/WSL and no Python are needed.

```powershell
cd $HOME\Documents
git clone https://github.com/Adel199223/suivi-prets-web.git
cd suivi-prets-web
npm run start:windows
```

To stop it later: `npm run stop:windows`

1. Open the dashboard and create an emprunteur.
2. Open that emprunteur page and create one or more dettes.
3. Record each payment or avance on the debtor page or debt page.
4. Open a debt page to check balance, then edit the debt label or notes if needed.
5. Open an emprunteur page to update the borrower name/notes, or to delete a debt/borrower if you need cleanup.
6. Open the import page, choose the `.ods` spreadsheet directly in the app, review the preview, then confirm the import.
7. If one imported line is still missing a month, you can complete it later from unresolved import cards directly in the app (import page, debt page, or borrower page).
8. Export a backup before changing browser/device, or after a major session if you want an extra recovery file.

## Terms in Plain English

- Emprunteur: the person who owes money.
- Dette: one separate amount owed by that person.
- Ecriture: one money event, like a payment or a new advance.
- Apercu d'import: the on-screen check that shows what the `.ods` file would add before you merge it.
- Copie de secours: an optional JSON copy of the local data in this browser, useful if you want a portable recovery file.

## Backup Safety

1. The app saves your data automatically in the browser you are using on this device.
2. You do not need to export a file after every import just to keep working normally here.
3. Export a backup copy before changing browser, changing device, clearing browser data, or after a big session if you want extra protection.
4. Read the restore summary before confirming, because restore replaces the current local data.
5. If the import page shows one line still waiting, the safe data is already usable and only that flagged line stays outside the totals.

## Edit and stop flow

1. Correct a bad existing line directly from the debt view using `Modifier` (amount, date, detail).
2. Use `Réglages` in the top bar for the local shutdown guidance.
3. On Windows, close the local dev server with:
   - `npm run stop:windows` (recommended), or
   - `./scripts/stop-windows.ps1`
4. A full local reset is available in `Réglages` and permanently clears all local borrower, debt, line, and import-state data.
