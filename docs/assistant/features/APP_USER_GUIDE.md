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

1. Create an emprunteur.
2. Add one or more dettes under that emprunteur.
3. Record each payment as soon as it arrives.
4. Open the import page, choose the `.ods` spreadsheet directly in the app, review the preview, then confirm the import.
5. Export a sauvegarde JSON after each import and at the end of each real data-entry session.

## Terms in Plain English

- Emprunteur: the person who owes money.
- Dette: one separate amount owed by that person.
- Ecriture: one money event, like a payment or a new advance.
- Apercu d'import: the on-screen check that shows what the `.ods` file would add before you merge it.
- Sauvegarde: a JSON copy of the local data in this browser.

## Backup Safety

1. Watch the trust center reminder after any import, payment, advance, or notes change.
2. Export a new backup whenever the app says the previous one is missing or stale.
3. Read the restore summary before confirming, because restore replaces the current local data.
4. Remember that imported or restored data appears in the same browser and device you are using now.
