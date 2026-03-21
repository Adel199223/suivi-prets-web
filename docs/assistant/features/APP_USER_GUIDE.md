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
4. Use the import page when you want to merge data from the existing spreadsheet.
5. Export a sauvegarde regularly.

## Terms in Plain English

- Emprunteur: the person who owes money.
- Dette: one separate amount owed by that person.
- Ecriture: one money event, like a payment or a new advance.
- Sauvegarde: a JSON copy of the local data.
