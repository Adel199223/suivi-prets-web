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
5. If one imported line is still missing a month, the safe data still becomes usable now and the flagged line waits separately until you complete it.
6. Create an optional backup copy only before changing browser or device, or after a major session if you want an extra recovery file.

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
