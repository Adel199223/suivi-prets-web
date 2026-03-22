# Local Persistence Knowledge

## Purpose

This document is the persistence source of truth for local storage, import sessions, and backups.

## Stores

- `borrowers`: core borrower records
- `debts`: debt records under a borrower
- `entries`: append-oriented ledger entries
- `imports`: import audit sessions
- `unresolvedImports`: queued imported rows that are safe to preserve but still missing a month before they can enter the real ledger
- `meta`: app-wide key/value data such as `lastBackupAt`, automatic persistence attempts, and related lightweight app status

## Contracts

- Monetary values are stored as integer cents.
- `periodKey` uses `YYYY-MM`.
- `occurredOn` is optional ISO `YYYY-MM-DD`.
- `entry.signature` is the normalized dedupe key for repeated imports.
- Backup format is versioned as `AppBackupV2` and includes unresolved import queue records.
- `lastBackupAt` in `meta` is only the freshness marker for the exported external copy.
- Local app data is autosaved in-browser; exported backup copies are optional extra protection, not proof that the app saved locally.

## Safety Rules

- Schema changes require migration review and targeted tests.
- Replace-from-backup must clear and restore stores in one transaction.
- Replace-from-backup should present a human-readable summary before destructive confirmation.
- Import merge must be additive except for exact duplicate suppression.
- Unresolved imported rows must stay outside balances, timelines, and annual summaries until resolved.
- Backup guidance should distinguish clearly between local autosave, persistent browser storage, and optional exported copies.
